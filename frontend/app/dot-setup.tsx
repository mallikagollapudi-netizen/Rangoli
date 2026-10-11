import * as Haptics from "expo-haptics";
import { useRouter } from "expo-router";
import { Diamond, GridFour, Minus, Plus, Triangle, X } from "phosphor-react-native";
import React, { useMemo, useState } from "react";
import { Platform, Pressable, ScrollView, Text, View } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import Svg, { Circle } from "react-native-svg";

import { GridLayout, MAX_GRID, computeDots, dotColorFor } from "@/src/drawing";
import { makeStyles, useTheme } from "@/src/theme";

const LAYOUTS: { key: GridLayout; label: string; Icon: typeof GridFour }[] = [
  { key: "square", label: "Square", Icon: GridFour },
  { key: "rotated", label: "Rotated 45°", Icon: Diamond },
  { key: "triangle", label: "Triangle", Icon: Triangle },
];

const PREVIEW = 220;
const PREVIEW_BG = "#3D261D";

function Stepper({ label, value, onChange, testID }: { label: string; value: number; onChange: (v: number) => void; testID: string }) {
  const styles = useStyles();
  const { colors } = useTheme();
  const set = (v: number) => {
    const n = Math.max(1, Math.min(MAX_GRID, v));
    if (n !== value && Platform.OS !== "web") Haptics.selectionAsync();
    onChange(n);
  };
  return (
    <View style={styles.stepper}>
      <Text style={styles.stepLabel}>{label}</Text>
      <View style={styles.stepRow}>
        <Pressable testID={`${testID}-minus`} onPress={() => set(value - 1)} style={styles.stepBtn} disabled={value <= 1}>
          <Minus size={20} color={value <= 1 ? colors.borderStrong : colors.onSurface} weight="bold" />
        </Pressable>
        <Text style={styles.stepValue} testID={`${testID}-value`}>{value}</Text>
        <Pressable testID={`${testID}-plus`} onPress={() => set(value + 1)} style={styles.stepBtn} disabled={value >= MAX_GRID}>
          <Plus size={20} color={value >= MAX_GRID ? colors.borderStrong : colors.onSurface} weight="bold" />
        </Pressable>
      </View>
    </View>
  );
}

export default function DotSetup() {
  const insets = useSafeAreaInsets();
  const router = useRouter();
  const { colors } = useTheme();
  const styles = useStyles();
  const [layout, setLayout] = useState<GridLayout>("square");
  const [rows, setRows] = useState(7);
  const [cols, setCols] = useState(7);

  const preview = useMemo(
    () => computeDots({ layout, rows, cols, area: [16, 16, PREVIEW - 32, PREVIEW - 32] }),
    [layout, rows, cols],
  );
  const dotCount = preview.dots.length;

  return (
    <View style={styles.root} testID="dot-setup-screen">
      <View style={[styles.header, { paddingTop: Platform.OS === "ios" ? 16 : insets.top + 8 }]}>
        <Text style={styles.title}>Dot grid</Text>
        <Pressable testID="dot-setup-close-btn" onPress={() => router.back()} style={styles.iconBtn} hitSlop={8}>
          <X size={24} color={colors.onSurface} />
        </Pressable>
      </View>
      <ScrollView contentContainerStyle={{ paddingHorizontal: 24, paddingBottom: insets.bottom + 24 }}>
        <View style={styles.previewBox} testID="dot-setup-preview">
          <Svg width={PREVIEW} height={PREVIEW}>
            {preview.dots.map(([x, y], i) => (
              <Circle key={i} cx={x} cy={y} r={Math.max(1.5, Math.min(4, preview.spacing * 0.12))} fill={dotColorFor(PREVIEW_BG)} />
            ))}
          </Svg>
          <Text style={styles.count} testID="dot-setup-count">{dotCount} dots</Text>
        </View>

        <Text style={styles.section}>Layout</Text>
        <View style={styles.segment}>
          {LAYOUTS.map(({ key, label, Icon }) => {
            const active = layout === key;
            return (
              <Pressable
                key={key}
                testID={`dot-layout-${key}-btn`}
                onPress={() => {
                  if (Platform.OS !== "web") Haptics.selectionAsync();
                  setLayout(key);
                }}
                style={[styles.segItem, active && styles.segActive]}
              >
                <Icon size={20} color={active ? colors.onBrandPrimary : colors.onSurface} weight={active ? "fill" : "regular"} />
                <Text style={[styles.segText, active && { color: colors.onBrandPrimary }]}>{label}</Text>
              </Pressable>
            );
          })}
        </View>
        {layout === "triangle" && (
          <Text style={styles.hint}>1 dot on top, then 2, 4, 6… each row's middle dots align with the row above.</Text>
        )}

        <Text style={styles.section}>Size</Text>
        <View style={styles.steppers}>
          <Stepper label={layout === "triangle" ? "Rows" : "Rows (Y)"} value={rows} onChange={setRows} testID="dot-rows" />
          {layout !== "triangle" && <Stepper label="Columns (X)" value={cols} onChange={setCols} testID="dot-cols" />}
        </View>

        <Pressable
          testID="dot-setup-start-btn"
          style={({ pressed }) => [styles.start, pressed && { opacity: 0.85 }]}
          onPress={() =>
            router.replace({
              pathname: "/canvas",
              params: { mode: "dot", layout, rows: String(rows), cols: String(cols) },
            })
          }
        >
          <Text style={styles.startText}>Start drawing</Text>
        </Pressable>
      </ScrollView>
    </View>
  );
}

const useStyles = makeStyles((c) => ({
  root: { flex: 1, backgroundColor: c.surface },
  header: { flexDirection: "row", alignItems: "center", justifyContent: "space-between", paddingHorizontal: 24, paddingBottom: 8 },
  title: { fontFamily: "Fraunces", fontSize: 28, color: c.onSurface },
  iconBtn: { width: 44, height: 44, alignItems: "center", justifyContent: "center" },
  previewBox: { alignSelf: "center", alignItems: "center", backgroundColor: PREVIEW_BG, borderRadius: 24, padding: 8, marginTop: 8 },
  count: { fontFamily: "Nunito", fontSize: 13, color: dotColorFor(PREVIEW_BG), marginBottom: 8, fontWeight: "700" },
  section: { fontFamily: "Nunito", fontSize: 13, fontWeight: "800", letterSpacing: 1.2, color: c.muted, marginTop: 24, marginBottom: 12, textTransform: "uppercase" },
  segment: { flexDirection: "row", gap: 8 },
  segItem: {
    flex: 1,
    minHeight: 64,
    borderRadius: 16,
    backgroundColor: c.surfaceSecondary,
    borderWidth: 1,
    borderColor: c.border,
    alignItems: "center",
    justifyContent: "center",
    gap: 4,
  },
  segActive: { backgroundColor: c.brandPrimary, borderColor: c.brandPrimary },
  segText: { fontFamily: "Nunito", fontSize: 13, fontWeight: "700", color: c.onSurface },
  hint: { fontFamily: "Nunito", fontSize: 13, color: c.muted, marginTop: 8 },
  steppers: { flexDirection: "row", gap: 12 },
  stepper: { flex: 1, backgroundColor: c.surfaceSecondary, borderRadius: 16, padding: 12, borderWidth: 1, borderColor: c.border },
  stepLabel: { fontFamily: "Nunito", fontSize: 13, color: c.muted, fontWeight: "700" },
  stepRow: { flexDirection: "row", alignItems: "center", justifyContent: "space-between", marginTop: 8 },
  stepBtn: { width: 44, height: 44, borderRadius: 22, backgroundColor: c.surfaceTertiary, alignItems: "center", justifyContent: "center" },
  stepValue: { fontFamily: "Fraunces", fontSize: 28, color: c.onSurface },
  start: { marginTop: 32, height: 56, borderRadius: 999, backgroundColor: c.brandPrimary, alignItems: "center", justifyContent: "center" },
  startText: { fontFamily: "Nunito", fontSize: 17, fontWeight: "800", color: c.onBrandPrimary },
}));
