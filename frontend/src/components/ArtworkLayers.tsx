import React, { memo } from "react";
import { Circle, G, Path } from "react-native-svg";

import { Point, Stroke, dotColorFor, pathFromPoints } from "../drawing";

export const DotsLayer = memo(function DotsLayer({
  dots,
  spacing,
  background,
}: {
  dots: Point[];
  spacing: number;
  background: string;
}) {
  const r = Math.max(1.6, Math.min(4, spacing * 0.08));
  const fill = dotColorFor(background);
  return (
    <G>
      {dots.map(([x, y], i) => (
        <Circle key={i} cx={x} cy={y} r={r} fill={fill} />
      ))}
    </G>
  );
});

export function StrokePath({ stroke }: { stroke: Stroke }) {
  return (
    <Path
      d={pathFromPoints(stroke.points, stroke.kind)}
      stroke={stroke.color}
      strokeWidth={stroke.width}
      strokeLinecap="round"
      strokeLinejoin="round"
      fill="none"
    />
  );
}

export const StrokesLayer = memo(function StrokesLayer({ strokes }: { strokes: Stroke[] }) {
  return (
    <G>
      {strokes.map((s, i) => (
        <StrokePath key={i} stroke={s} />
      ))}
    </G>
  );
});
