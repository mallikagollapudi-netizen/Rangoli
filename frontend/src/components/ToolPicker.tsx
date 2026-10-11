import { Eraser, LineSegments, PaintBrush, Spiral } from "phosphor-react-native";
import React from "react";
import { Pressable, Text } from "react-native";
import Animated, { FadeInDown, FadeOutDown } from "react-native-reanimated";

import { StrokeKind } from "../drawing";
import { makeStyles, useTheme } from "../theme";

export const TOOL_META: Record<StrokeKind, { label: string; Icon: typeof PaintBrush }> = {
  line: { label: "Join dots", Icon: LineSegments },
  curve: { label: "Curve", Icon: Spiral },
  free: { label: "Brush", Icon: PaintBrush },
  erase: { label: "Eraser", Icon: Eraser },
};

type Props = { tools: StrokeKind[]; value: StrokeKind; bottom: number; onPick: (t: StrokeKind) => void };

export function ToolPicker({ tools, value, bottom, onPick }: Props) {
  const styles = useStyles();
  const { colors } = useTheme();
  return (
    <Animated.View entering={FadeInDown.duration(180)} exiting={FadeOutDown.duration(150)} style={[styles.wrap, { bottom }]} testID="tool-picker">
      {tools.map((t) => {
        const { label, Icon } = TOOL_META[t];
        const active = t === value;
        return (
          <Pressable key={t} testID={`tool-option-${t}`} onPress={() => onPick(t)} style={[styles.item, active && styles.itemActive]}>
            <Icon size={22} color={active ? colors.onBrandPrimary : colors.onSurface} weight={active ? "fill" : "regular"} />
            <Text style={[styles.label, active && { color: colors.onBrandPrimary }]}>{label}</Text>
          </Pressable>
        );
      })}
    </Animated.View>
  );
}

const useStyles = makeStyles((c) => ({
  wrap: {
    position: "absolute",
    left: 12,
    flexDirection: "row",
    gap: 8,
    padding: 8,
    borderRadius: 24,
    backgroundColor: c.surface,
    borderWidth: 1,
    borderColor: c.border,
    shadowColor: c.shadow,
    shadowOpacity: 0.2,
    shadowRadius: 12,
    shadowOffset: { width: 0, height: 4 },
    elevation: 6,
  },
  item: { width: 72, height: 64, borderRadius: 16, alignItems: "center", justifyContent: "center", gap: 4, backgroundColor: c.surfaceSecondary },
  itemActive: { backgroundColor: c.brandPrimary },
  label: { fontFamily: "Nunito", fontSize: 12, fontWeight: "700", color: c.onSurface },
}));
