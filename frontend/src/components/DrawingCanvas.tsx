import * as Haptics from "expo-haptics";
import React, { useRef, useState } from "react";
import { GestureResponderEvent, Platform, StyleSheet, View } from "react-native";
import Svg, { Circle, Line, Rect } from "react-native-svg";

import { Point, Stroke, StrokeKind } from "../drawing";
import { DotsLayer, StrokePath, StrokesLayer } from "./ArtworkLayers";

type Props = {
  viewRef?: React.Ref<View>;
  screen: { w: number; h: number }; // full-screen canvas size (touch space)
  logical: { w: number; h: number }; // drawing coordinate space
  background: string;
  dots: Point[];
  spacing: number;
  strokes: Stroke[];
  tool: StrokeKind;
  color: string;
  width: number;
  onStrokeEnd: (s: Stroke) => void;
};

export const ERASER_SCALE = 3;

function haptic() {
  if (Platform.OS !== "web") Haptics.selectionAsync();
}

export function DrawingCanvas(props: Props) {
  const { screen, logical, background, dots, spacing, strokes } = props;
  const [current, setCurrent] = useState<Stroke | null>(null);
  const [finger, setFinger] = useState<Point | null>(null);
  const strokeRef = useRef<Stroke | null>(null);

  // Canvas fills the whole screen from (0,0), so page coordinates are canvas coordinates.
  const toLogical = (e: GestureResponderEvent): Point => {
    const s = Math.min(screen.w / logical.w, screen.h / logical.h);
    const ox = (screen.w - logical.w * s) / 2;
    const oy = (screen.h - logical.h * s) / 2;
    return [(e.nativeEvent.pageX - ox) / s, (e.nativeEvent.pageY - oy) / s];
  };

  const nearestDot = (p: Point, maxDist: number): Point | null => {
    let best: Point | null = null;
    let bd = maxDist;
    for (const d of dots) {
      const dist = Math.hypot(d[0] - p[0], d[1] - p[1]);
      if (dist < bd) {
        bd = dist;
        best = d;
      }
    }
    return best;
  };

  // Min distance between sampled points; curves sample sparser for smoothness.
  const minStep = (kind: StrokeKind) => (kind === "curve" ? Math.max(6, spacing * 0.15) : 1.5);

  const begin = (e: GestureResponderEvent) => {
    const p = toLogical(e);
    const { tool, color, width } = props;
    if (tool === "line") {
      const d = nearestDot(p, Math.max(spacing * 0.5, 28));
      if (!d) return;
      haptic();
      strokeRef.current = { kind: "line", color, width, points: [d] };
    } else {
      strokeRef.current = {
        kind: tool,
        color: tool === "erase" ? "" : color,
        width: tool === "erase" ? width * ERASER_SCALE : width,
        points: [p],
      };
    }
    setFinger(p);
    setCurrent({ ...strokeRef.current });
  };

  const move = (e: GestureResponderEvent) => {
    const s = strokeRef.current;
    if (!s) return;
    const p = toLogical(e);
    const last = s.points[s.points.length - 1];
    if (s.kind === "line") {
      const d = nearestDot(p, Math.max(spacing * 0.35, 18));
      if (d && (d[0] !== last[0] || d[1] !== last[1])) {
        s.points.push(d);
        haptic();
        setCurrent({ ...s, points: [...s.points] });
      }
    } else if (Math.hypot(p[0] - last[0], p[1] - last[1]) > minStep(s.kind)) {
      s.points.push(p);
      setCurrent({ ...s, points: [...s.points] });
    }
    setFinger(p);
  };

  const end = () => {
    const s = strokeRef.current;
    strokeRef.current = null;
    setCurrent(null);
    setFinger(null);
    if (!s) return;
    if (s.kind === "line" && s.points.length < 2) return;
    props.onStrokeEnd(s);
  };

  const lastPt = current?.points[current.points.length - 1];

  return (
    <View
      ref={props.viewRef}
      collapsable={false}
      testID="drawing-canvas"
      style={[styles.fill, { width: screen.w, height: screen.h, backgroundColor: background }]}
      onStartShouldSetResponder={() => true}
      onMoveShouldSetResponder={() => true}
      onResponderTerminationRequest={() => false}
      onResponderGrant={begin}
      onResponderMove={move}
      onResponderRelease={end}
      onResponderTerminate={end}
    >
      <Svg
        width={screen.w}
        height={screen.h}
        viewBox={`0 0 ${logical.w} ${logical.h}`}
        preserveAspectRatio="xMidYMid meet"
        style={styles.noTouch}
      >
        <Rect x={0} y={0} width={logical.w} height={logical.h} fill={background} />
        <StrokesLayer strokes={strokes} background={background} />
        {current && <StrokePath stroke={current} background={background} />}
        {/* Dots stay on top so the eraser never removes them */}
        {dots.length > 0 && <DotsLayer dots={dots} spacing={spacing} background={background} />}
        {current?.kind === "line" && lastPt && finger && (
          <Line
            x1={lastPt[0]}
            y1={lastPt[1]}
            x2={finger[0]}
            y2={finger[1]}
            stroke={current.color}
            strokeOpacity={0.45}
            strokeWidth={current.width}
            strokeDasharray={`${current.width * 1.5} ${current.width * 1.5}`}
            strokeLinecap="round"
          />
        )}
        {current?.kind === "erase" && finger && (
          <Circle cx={finger[0]} cy={finger[1]} r={current.width / 2} fill="none" stroke="#FFFFFF" strokeOpacity={0.7} strokeWidth={1.5} />
        )}
      </Svg>
    </View>
  );
}

const styles = StyleSheet.create({
  fill: { position: "absolute", left: 0, top: 0 },
  noTouch: { pointerEvents: "none" },
});
