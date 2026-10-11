import { Check, X } from "phosphor-react-native";
import React, { useState } from "react";
import { Modal, Platform, Pressable, Text, View, useWindowDimensions } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import Svg, { Circle, G, Path } from "react-native-svg";

import { makeStyles, useTheme } from "../theme";

const HUES = 24;
const RINGS = [
  { s: 100, l: 88 },
  { s: 100, l: 75 },
  { s: 95, l: 62 },
  { s: 90, l: 50 },
  { s: 85, l: 38 },
  { s: 80, l: 26 },
];
const GREYS = ["#FFFFFF", "#D9D9D9", "#A6A6A6", "#737373", "#404040", "#000000"];

function hslToHex(h: number, s: number, l: number) {
  s /= 100;
  l /= 100;
  const k = (n: number) => (n + h / 30) % 12;
  const a = s * Math.min(l, 1 - l);
  const f = (n: number) => l - a * Math.max(-1, Math.min(k(n) - 3, Math.min(9 - k(n), 1)));
  const hex = (x: number) => Math.round(x * 255).toString(16).padStart(2, "0");
  return `#${hex(f(0))}${hex(f(8))}${hex(f(4))}`.toUpperCase();
}

function arc(cx: number, cy: number, r0: number, r1: number, a0: number, a1: number) {
  const p = (r: number, a: number) => [cx + r * Math.cos(a), cy + r * Math.sin(a)];
  const [x0, y0] = p(r1, a0);
  const [x1, y1] = p(r1, a1);
  const [x2, y2] = p(r0, a1);
  const [x3, y3] = p(r0, a0);
  return `M${x0} ${y0} A${r1} ${r1} 0 0 1 ${x1} ${y1} L${x2} ${y2} A${r0} ${r0} 0 0 0 ${x3} ${y3} Z`;
}

const SIZE = 280;
const C = SIZE / 2;
const INNER = 34;
const RING_W = (C - INNER - 4) / RINGS.length;

const SEGMENTS = Array.from({ length: HUES }).flatMap((_, h) =>
  RINGS.map((ring, r) => {
    const a0 = (h / HUES) * Math.PI * 2 - Math.PI / 2;
    const a1 = ((h + 1) / HUES) * Math.PI * 2 - Math.PI / 2;
    return {
      key: `${h}-${r}`,
      d: arc(C, C, INNER + r * RING_W, INNER + (r + 1) * RING_W, a0, a1 + 0.004),
      color: hslToHex((h / HUES) * 360, ring.s, ring.l),
    };
  }),
);

function colorAt(x: number, y: number): string | null {
  const dx = x - C;
  const dy = y - C;
  const r = Math.hypot(dx, dy);
  const ring = Math.floor((r - INNER) / RING_W);
  if (ring < 0 || ring >= RINGS.length) return null;
  let a = Math.atan2(dy, dx) + Math.PI / 2;
  if (a < 0) a += Math.PI * 2;
  const h = Math.floor((a / (Math.PI * 2)) * HUES) % HUES;
  return hslToHex((h / HUES) * 360, RINGS[ring].s, RINGS[ring].l);
}

type Props = { visible: boolean; initial: string; onClose: () => void; onPick: (c: string) => void };

export function ColorWheelSheet({ visible, initial, onClose, onPick }: Props) {
  const insets = useSafeAreaInsets();
  const { colors } = useTheme();
  const styles = useStyles();
  const [picked, setPicked] = useState(initial);
  const { height: winH } = useWindowDimensions();
  const disp = Math.max(160, Math.min(SIZE, winH - insets.bottom - 330));
  const k = SIZE / disp;

  return (
    <Modal visible={visible} transparent animationType="slide" onRequestClose={onClose} onShow={() => setPicked(initial)}>
      <View style={[styles.wrap, Platform.OS === "web" && { height: winH }]}>
      <Pressable style={styles.backdrop} onPress={onClose} testID="color-wheel-backdrop" />
      <View style={[styles.sheet, { paddingBottom: insets.bottom + 16 }]} testID="color-wheel-sheet">
        <View style={styles.handle} />
        <View style={styles.header}>
          <Text style={styles.title}>Colour wheel</Text>
          <Pressable testID="color-wheel-close-btn" onPress={onClose} style={styles.iconBtn} hitSlop={8}>
            <X size={22} color={colors.onSurface} />
          </Pressable>
        </View>
        <View style={styles.wheelWrap}>
          <View
            testID="color-wheel"
            onStartShouldSetResponder={() => true}
            onResponderRelease={(e) => {
              const c = colorAt(e.nativeEvent.locationX * k, e.nativeEvent.locationY * k);
              if (c) setPicked(c);
            }}
          >
            <Svg width={disp} height={disp} viewBox={`0 0 ${SIZE} ${SIZE}`} pointerEvents="none">
              <G>
                {SEGMENTS.map((s) => (
                  <Path key={s.key} d={s.d} fill={s.color} />
                ))}
              </G>
              <Circle cx={C} cy={C} r={INNER - 4} fill={picked} stroke={colors.border} strokeWidth={3} />
            </Svg>
          </View>
        </View>
        <View style={styles.greys}>
          {GREYS.map((g) => (
            <Pressable
              key={g}
              testID={`color-wheel-grey-${g.slice(1)}`}
              onPress={() => setPicked(g)}
              style={[styles.grey, { backgroundColor: g }, picked === g && styles.greySelected]}
            />
          ))}
        </View>
        <View style={styles.footer}>
          <View style={styles.previewRow}>
            <View style={[styles.preview, { backgroundColor: picked }]} />
            <Text style={styles.hex} testID="color-wheel-hex">{picked}</Text>
          </View>
          <Pressable
            testID="color-wheel-apply-btn"
            style={({ pressed }) => [styles.apply, pressed && { opacity: 0.85 }]}
            onPress={() => {
              onPick(picked);
              onClose();
            }}
          >
            <Check size={18} color={colors.onBrandPrimary} weight="bold" />
            <Text style={styles.applyText}>Use colour</Text>
          </Pressable>
        </View>
      </View>
      </View>
    </Modal>
  );
}

const useStyles = makeStyles((c) => ({
  wrap: { flex: 1, justifyContent: "flex-end" },
  backdrop: { position: "absolute", left: 0, right: 0, top: 0, bottom: 0, backgroundColor: c.scrim },
  sheet: {
    backgroundColor: c.surface,
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
    paddingHorizontal: 24,
    paddingTop: 8,
  },
  handle: { alignSelf: "center", width: 40, height: 4, borderRadius: 2, backgroundColor: c.borderStrong, marginBottom: 8 },
  header: { flexDirection: "row", alignItems: "center", justifyContent: "space-between" },
  title: { fontFamily: "Fraunces", fontSize: 24, color: c.onSurface },
  iconBtn: { width: 44, height: 44, alignItems: "center", justifyContent: "center" },
  wheelWrap: { alignItems: "center", marginVertical: 8 },
  greys: { flexDirection: "row", justifyContent: "center", gap: 12, marginTop: 8 },
  grey: { width: 36, height: 36, borderRadius: 18, borderWidth: 1, borderColor: c.border },
  greySelected: { borderWidth: 3, borderColor: c.brandPrimary },
  footer: { flexDirection: "row", alignItems: "center", justifyContent: "space-between", marginTop: 16 },
  previewRow: { flexDirection: "row", alignItems: "center", gap: 12 },
  preview: { width: 44, height: 44, borderRadius: 12, borderWidth: 1, borderColor: c.border },
  hex: { fontFamily: "Nunito", fontSize: 16, color: c.onSurface, fontWeight: "700" },
  apply: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
    backgroundColor: c.brandPrimary,
    paddingHorizontal: 24,
    height: 48,
    borderRadius: 999,
  },
  applyText: { fontFamily: "Nunito", fontSize: 16, fontWeight: "700", color: c.onBrandPrimary },
}));
