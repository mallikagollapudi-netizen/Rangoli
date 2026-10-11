import { useQueryClient } from "@tanstack/react-query";
import { BlurView } from "expo-blur";
import * as Haptics from "expo-haptics";
import { useLocalSearchParams, useRouter } from "expo-router";
import {
  ArrowCounterClockwise,
  ArrowLeft,
  FloppyDisk,
  PaintBucket,
  Palette,
  ShareNetwork,
  Trash,
} from "phosphor-react-native";
import React, { useEffect, useMemo, useRef, useState } from "react";
import { ActivityIndicator, Platform, Pressable, ScrollView, Text, View, useWindowDimensions } from "react-native";
import Animated, { FadeInUp, FadeOutUp } from "react-native-reanimated";
import { useSafeAreaInsets } from "react-native-safe-area-context";

import { api } from "@/src/api";
import { ColorWheelSheet } from "@/src/components/ColorWheelSheet";
import { DrawingCanvas } from "@/src/components/DrawingCanvas";
import { SaveSheet } from "@/src/components/SaveSheet";
import { ShareSheet } from "@/src/components/ShareSheet";
import { TOOL_META, ToolPicker } from "@/src/components/ToolPicker";
import {
  BRUSH_SIZES,
  FLOORS,
  GridConfig,
  GridLayout,
  MAX_GRID,
  PALETTE,
  Stroke,
  StrokeKind,
  computeDots,
} from "@/src/drawing";
import { makeStyles, useTheme } from "@/src/theme";

const TOP_BAR = 64;
const BOTTOM_PANEL = 150;

function tap() {
  if (Platform.OS !== "web") Haptics.selectionAsync();
}

export default function CanvasScreen() {
  const params = useLocalSearchParams<{ mode?: string; layout?: string; rows?: string; cols?: string; id?: string }>();
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const { colors } = useTheme();
  const styles = useStyles();
  const qc = useQueryClient();

  const win = useWindowDimensions();
  const screen = { w: win.width, h: win.height };

  const [artId, setArtId] = useState<string | null>(params.id ?? null);
  const [name, setName] = useState("");
  const [mode, setMode] = useState<"free" | "dot">(params.mode === "dot" ? "dot" : "free");
  const [logical, setLogical] = useState<{ w: number; h: number }>(() => ({ w: win.width, h: win.height }));
  const [grid, setGrid] = useState<GridConfig | null>(() => {
    if (params.id || params.mode !== "dot") return null;
    const clamp = (v?: string) => Math.max(1, Math.min(MAX_GRID, parseInt(v ?? "7", 10) || 7));
    const top = insets.top + TOP_BAR + 8;
    const bottom = insets.bottom + BOTTOM_PANEL + 16;
    return {
      layout: (["square", "rotated", "triangle"].includes(params.layout ?? "") ? params.layout : "square") as GridLayout,
      rows: clamp(params.rows),
      cols: clamp(params.cols),
      area: [24, top, win.width - 48, Math.max(80, win.height - top - bottom)],
    };
  });
  const [dirty, setDirty] = useState(false);
  const [exitOpen, setExitOpen] = useState(false);
  const [exitAfterSave, setExitAfterSave] = useState(false);
  const [strokes, setStrokes] = useState<Stroke[]>([]);
  const [background, setBackground] = useState(FLOORS[0]);
  const [color, setColor] = useState(PALETTE[0]);
  const [sizeIdx, setSizeIdx] = useState(1);
  const [tool, setTool] = useState<StrokeKind>(params.mode === "dot" ? "line" : "free");
  const [toolsOpen, setToolsOpen] = useState(false);
  const [shareOpen, setShareOpen] = useState(false);
  const canvasRef = useRef<View>(null);
  const [loading, setLoading] = useState(!!params.id);
  const [loadError, setLoadError] = useState<string | null>(null);
  const [wheelOpen, setWheelOpen] = useState(false);
  const [saveOpen, setSaveOpen] = useState(false);
  const [saving, setSaving] = useState(false);
  const [saveError, setSaveError] = useState<string | null>(null);
  const [toast, setToast] = useState<string | null>(null);
  const [confirmClear, setConfirmClear] = useState(false);
  const toastTimer = useRef<ReturnType<typeof setTimeout> | null>(null);

  // Load saved artwork
  useEffect(() => {
    if (!params.id) return;
    api
      .get(params.id)
      .then((a) => {
        setName(a.name);
        setMode(a.mode);
        setLogical({ w: a.width, h: a.height });
        setGrid(a.grid ?? null);
        setStrokes(a.strokes);
        setBackground(a.background);
        setTool(a.mode === "dot" ? "line" : "free");
      })
      .catch(() => setLoadError("Couldn't open this rangoli."))
      .finally(() => setLoading(false));
  }, [params.id]);

  const updateStrokes = (fn: (s: Stroke[]) => Stroke[]) => {
    setStrokes(fn);
    setDirty(true);
  };

  const goBack = () => {
    if (router.canGoBack()) router.back();
    else router.replace("/");
  };

  const onBack = () => {
    if (dirty && strokes.length > 0) setExitOpen(true);
    else goBack();
  };

  const deleteArt = async () => {
    if (artId) {
      await api.remove(artId);
      qc.invalidateQueries({ queryKey: ["artworks"] });
    }
    setExitOpen(false);
    goBack();
  };

  const dotData = useMemo(() => (grid ? computeDots(grid) : { dots: [], spacing: 0 }), [grid]);

  const showToast = (msg: string) => {
    setToast(msg);
    if (toastTimer.current) clearTimeout(toastTimer.current);
    toastTimer.current = setTimeout(() => setToast(null), 2200);
  };

  const save = async (n: string) => {
    setSaving(true);
    setSaveError(null);
    const body = { name: n, mode, grid, background, width: logical.w, height: logical.h, strokes };
    try {
      const res = artId ? await api.update(artId, body) : await api.create(body);
      setArtId(res.id);
      setName(res.name);
      setSaveOpen(false);
      setDirty(false);
      qc.invalidateQueries({ queryKey: ["artworks"] });
      if (Platform.OS !== "web") Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
      if (exitAfterSave) {
        goBack();
        return;
      }
      showToast("Saved on device");
    } catch {
      setSaveError("Couldn't save. Please try again.");
    } finally {
      setSaving(false);
    }
  };

  const brush = BRUSH_SIZES[sizeIdx];

  if (loadError) {
    return (
      <View style={[styles.root, styles.center]} testID="canvas-load-error">
        <Text style={styles.errorText}>{loadError}</Text>
        <Pressable testID="canvas-load-error-back-btn" onPress={() => router.back()} style={styles.pillBtn}>
          <Text style={styles.pillBtnText}>Go back</Text>
        </Pressable>
      </View>
    );
  }

  return (
    <View style={[styles.root, { backgroundColor: background }]} testID="canvas-screen">
      {!loading && (
        <DrawingCanvas
          viewRef={canvasRef}
          screen={screen}
          logical={logical}
          background={background}
          dots={dotData.dots}
          spacing={dotData.spacing}
          strokes={strokes}
          tool={tool}
          color={color}
          width={brush}
          onStrokeEnd={(s) => updateStrokes((prev) => [...prev, s])}
        />
      )}
      {loading && <ActivityIndicator style={{ flex: 1 }} color={colors.brandSecondary} size="large" />}

      {/* Top bar */}
      <View style={[styles.topBar, { top: insets.top + 8 }]} pointerEvents="box-none">
        <Glass style={styles.roundBtn}>
          <Pressable testID="canvas-back-btn" onPress={onBack} style={styles.roundInner}>
            <ArrowLeft size={22} color={colors.onSurface} weight="bold" />
          </Pressable>
        </Glass>
        <Glass style={styles.titlePill}>
          <Text numberOfLines={1} style={styles.titleText} testID="canvas-title">
            {name || (mode === "dot" ? "Dot rangoli" : "Free art")}
          </Text>
        </Glass>
        <Glass style={styles.roundBtn}>
          <Pressable testID="canvas-share-btn" onPress={() => setShareOpen(true)} style={styles.roundInner}>
            <ShareNetwork size={22} color={colors.onSurface} weight="bold" />
          </Pressable>
        </Glass>
        <Pressable
          testID="canvas-save-btn"
          onPress={() => {
            setSaveError(null);
            setExitAfterSave(false);
            setSaveOpen(true);
          }}
          style={({ pressed }) => [styles.saveBtn, pressed && { opacity: 0.85 }]}
        >
          <FloppyDisk size={20} color={colors.onBrandPrimary} weight="fill" />
          <Text style={styles.saveText}>Save</Text>
        </Pressable>
      </View>

      {/* Bottom glass toolbar */}
      <Glass style={[styles.bottomPanel, { bottom: insets.bottom + 12 }]}>
        <ScrollView
          horizontal
          showsHorizontalScrollIndicator={false}
          contentContainerStyle={styles.paletteRow}
          keyboardShouldPersistTaps="handled"
        >
          <Pressable testID="canvas-color-wheel-btn" onPress={() => setWheelOpen(true)} style={styles.wheelBtn}>
            <Palette size={22} color={colors.onBrandSecondary} weight="fill" />
          </Pressable>
          {!PALETTE.includes(color) && (
            <View style={[styles.swatch, styles.swatchActive, { backgroundColor: color }]} testID="canvas-custom-swatch" />
          )}
          {PALETTE.map((c) => (
            <Pressable
              key={c}
              testID={`canvas-swatch-${c.slice(1)}`}
              onPress={() => {
                tap();
                setColor(c);
              }}
              style={[styles.swatch, { backgroundColor: c }, color === c && styles.swatchActive]}
            />
          ))}
        </ScrollView>
        <View style={styles.toolsRow}>
          <ToolBtn
            testID="canvas-tool-toggle-btn"
            active
            label={TOOL_META[tool].label}
            onPress={() => {
              tap();
              setToolsOpen((o) => !o);
            }}
            icon={React.createElement(TOOL_META[tool].Icon, { size: 22, color: colors.onBrandPrimary, weight: "fill" })}
          />
          <ToolBtn
            testID="canvas-brush-size-btn"
            label={`Size ${brush}`}
            onPress={() => {
              tap();
              setSizeIdx((i) => (i + 1) % BRUSH_SIZES.length);
            }}
            icon={<View style={[styles.sizeDot, { width: 6 + sizeIdx * 4, height: 6 + sizeIdx * 4, backgroundColor: color }]} />}
          />
          <ToolBtn
            testID="canvas-floor-btn"
            label="Floor"
            onPress={() => {
              tap();
              setBackground((b) => FLOORS[(FLOORS.indexOf(b) + 1) % FLOORS.length]);
              setDirty(true);
            }}
            icon={<PaintBucket size={22} color={colors.onSurface} />}
          />
          <ToolBtn
            testID="canvas-undo-btn"
            label="Undo"
            disabled={strokes.length === 0}
            onPress={() => {
              tap();
              setStrokes((s) => s.slice(0, -1));
              setDirty(true);
            }}
            icon={<ArrowCounterClockwise size={22} color={strokes.length ? colors.onSurface : colors.borderStrong} weight="bold" />}
          />
          <ToolBtn
            testID="canvas-clear-btn"
            label="Clear"
            disabled={strokes.length === 0}
            onPress={() => setConfirmClear(true)}
            icon={<Trash size={22} color={strokes.length ? colors.error : colors.borderStrong} />}
          />
        </View>
      </Glass>

      {confirmClear && (
        <Animated.View entering={FadeInUp} exiting={FadeOutUp} style={[styles.confirm, { top: insets.top + TOP_BAR + 16 }]} testID="canvas-clear-confirm">
          <Text style={styles.confirmText}>Clear the whole canvas?</Text>
          <View style={styles.confirmRow}>
            <Pressable testID="canvas-clear-cancel-btn" onPress={() => setConfirmClear(false)} style={styles.confirmBtn}>
              <Text style={styles.confirmCancel}>Cancel</Text>
            </Pressable>
            <Pressable
              testID="canvas-clear-confirm-btn"
              onPress={() => {
                setStrokes([]);
                setDirty(true);
                setConfirmClear(false);
              }}
              style={[styles.confirmBtn, { backgroundColor: colors.error }]}
            >
              <Text style={styles.confirmOk}>Clear</Text>
            </Pressable>
          </View>
        </Animated.View>
      )}

      {toast && (
        <Animated.View entering={FadeInUp} exiting={FadeOutUp} style={[styles.toast, { top: insets.top + TOP_BAR + 16 }]} testID="canvas-toast">
          <Text style={styles.toastText}>{toast}</Text>
        </Animated.View>
      )}

      {toolsOpen && (
        <ToolPicker
          tools={mode === "dot" ? ["line", "curve", "free", "erase"] : ["free", "curve", "erase"]}
          value={tool}
          bottom={insets.bottom + 12 + BOTTOM_PANEL + 8}
          onPick={(t) => {
            tap();
            setTool(t);
            setToolsOpen(false);
          }}
        />
      )}

      {exitOpen && (
        <View style={styles.exitOverlay} testID="canvas-exit-sheet">
          <Pressable style={styles.exitBackdrop} onPress={() => setExitOpen(false)} testID="canvas-exit-backdrop" />
          <View style={[styles.exitSheet, { paddingBottom: insets.bottom + 16 }]}>
            <Text style={styles.exitTitle}>Before you leave…</Text>
            <Text style={styles.exitText}>Save this rangoli on your device, or delete it.</Text>
            <Pressable
              testID="canvas-exit-save-btn"
              onPress={() => {
                setExitOpen(false);
                setExitAfterSave(true);
                setSaveError(null);
                setSaveOpen(true);
              }}
              style={[styles.exitBtn, { backgroundColor: colors.brandPrimary }]}
            >
              <FloppyDisk size={20} color={colors.onBrandPrimary} weight="fill" />
              <Text style={[styles.exitBtnText, { color: colors.onBrandPrimary }]}>Save on device</Text>
            </Pressable>
            <Pressable testID="canvas-exit-delete-btn" onPress={deleteArt} style={[styles.exitBtn, { backgroundColor: colors.surfaceTertiary }]}>
              <Trash size={20} color={colors.error} />
              <Text style={[styles.exitBtnText, { color: colors.error }]}>{artId ? "Delete from device" : "Delete drawing"}</Text>
            </Pressable>
            <Pressable testID="canvas-exit-cancel-btn" onPress={() => setExitOpen(false)} style={styles.exitCancel}>
              <Text style={styles.exitCancelText}>Keep drawing</Text>
            </Pressable>
          </View>
        </View>
      )}

      <ShareSheet
        visible={shareOpen}
        target={canvasRef}
        name={name}
        onClose={() => setShareOpen(false)}
        onDone={showToast}
      />
      <ColorWheelSheet visible={wheelOpen} initial={color} onClose={() => setWheelOpen(false)} onPick={setColor} />
      <SaveSheet
        visible={saveOpen}
        initialName={name}
        saving={saving}
        error={saveError}
        onClose={() => setSaveOpen(false)}
        onSave={save}
      />
    </View>
  );
}

function Glass({ style, children }: { style: any; children: React.ReactNode }) {
  const styles = useStyles();
  return (
    <View style={[styles.glassWrap, style]}>
      <BlurView intensity={60} tint="light" style={styles.absFill} />
      <View style={[styles.absFill, styles.glassTint]} />
      {children}
    </View>
  );
}

function ToolBtn(props: { testID: string; label: string; icon: React.ReactNode; onPress: () => void; active?: boolean; disabled?: boolean }) {
  const styles = useStyles();
  return (
    <Pressable
      testID={props.testID}
      onPress={props.onPress}
      disabled={props.disabled}
      style={({ pressed }) => [styles.tool, pressed && { transform: [{ scale: 0.92 }] }]}
    >
      <View style={[styles.toolIcon, props.active && styles.toolIconActive]}>{props.icon}</View>
      <Text style={styles.toolLabel} numberOfLines={1}>{props.label}</Text>
    </Pressable>
  );
}

const useStyles = makeStyles((c) => ({
  root: { flex: 1 },
  center: { alignItems: "center", justifyContent: "center", backgroundColor: c.surface, gap: 16 },
  errorText: { fontFamily: "Nunito", fontSize: 16, color: c.onSurface },
  pillBtn: { height: 48, paddingHorizontal: 24, borderRadius: 999, backgroundColor: c.brandPrimary, justifyContent: "center" },
  pillBtnText: { fontFamily: "Nunito", fontWeight: "700", color: c.onBrandPrimary },
  absFill: { position: "absolute", left: 0, right: 0, top: 0, bottom: 0 },
  glassWrap: { overflow: "hidden", borderWidth: 1, borderColor: c.glassBorder },
  glassTint: { backgroundColor: c.glass },
  topBar: { position: "absolute", left: 16, right: 16, height: 48, flexDirection: "row", alignItems: "center", gap: 8 },
  roundBtn: { width: 48, height: 48, borderRadius: 24 },
  roundInner: { width: 48, height: 48, alignItems: "center", justifyContent: "center" },
  titlePill: { flex: 1, height: 48, borderRadius: 24, justifyContent: "center", paddingHorizontal: 16 },
  titleText: { fontFamily: "Fraunces", fontSize: 18, color: c.onSurface },
  saveBtn: {
    height: 48,
    borderRadius: 24,
    paddingHorizontal: 16,
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
    backgroundColor: c.brandPrimary,
  },
  saveText: { fontFamily: "Nunito", fontSize: 15, fontWeight: "800", color: c.onBrandPrimary },
  bottomPanel: { position: "absolute", left: 12, right: 12, borderRadius: 24, height: BOTTOM_PANEL, paddingVertical: 8 },
  paletteRow: { paddingHorizontal: 12, gap: 8, alignItems: "center", height: 52 },
  wheelBtn: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: c.brandSecondary,
    alignItems: "center",
    justifyContent: "center",
    flexShrink: 0,
  },
  swatch: { width: 36, height: 36, borderRadius: 18, borderWidth: 2, borderColor: c.glassBorder, flexShrink: 0 },
  swatchActive: { borderWidth: 3, borderColor: c.onSurface },
  toolsRow: { flexDirection: "row", justifyContent: "space-around", paddingHorizontal: 8, marginTop: 4 },
  tool: { alignItems: "center", minWidth: 56, gap: 2 },
  toolIcon: { width: 44, height: 44, borderRadius: 22, alignItems: "center", justifyContent: "center", backgroundColor: c.surfaceSecondary },
  toolIconActive: { backgroundColor: c.brandPrimary },
  toolLabel: { fontFamily: "Nunito", fontSize: 11, fontWeight: "700", color: c.onSurface },
  sizeDot: { borderRadius: 999, borderWidth: 1, borderColor: c.borderStrong },
  toast: {
    position: "absolute",
    alignSelf: "center",
    backgroundColor: c.surfaceInverse,
    paddingHorizontal: 20,
    paddingVertical: 12,
    borderRadius: 999,
  },
  toastText: { fontFamily: "Nunito", fontWeight: "700", color: c.onSurfaceInverse },
  confirm: { position: "absolute", left: 24, right: 24, backgroundColor: c.surface, borderRadius: 16, padding: 16, borderWidth: 1, borderColor: c.border },
  confirmText: { fontFamily: "Nunito", fontSize: 16, fontWeight: "700", color: c.onSurface },
  confirmRow: { flexDirection: "row", justifyContent: "flex-end", gap: 8, marginTop: 12 },
  confirmBtn: { height: 44, paddingHorizontal: 20, borderRadius: 999, justifyContent: "center", backgroundColor: c.surfaceTertiary },
  confirmCancel: { fontFamily: "Nunito", fontWeight: "700", color: c.onSurface },
  confirmOk: { fontFamily: "Nunito", fontWeight: "700", color: c.onError },
  exitOverlay: { position: "absolute", left: 0, right: 0, top: 0, bottom: 0, justifyContent: "flex-end" },
  exitBackdrop: { position: "absolute", left: 0, right: 0, top: 0, bottom: 0, backgroundColor: c.scrim },
  exitSheet: { backgroundColor: c.surface, borderTopLeftRadius: 24, borderTopRightRadius: 24, padding: 24, gap: 12 },
  exitTitle: { fontFamily: "Fraunces", fontSize: 24, color: c.onSurface },
  exitText: { fontFamily: "Nunito", fontSize: 14, color: c.muted, marginBottom: 4 },
  exitBtn: { height: 52, borderRadius: 999, flexDirection: "row", gap: 8, alignItems: "center", justifyContent: "center" },
  exitBtnText: { fontFamily: "Nunito", fontSize: 16, fontWeight: "800" },
  exitCancel: { height: 44, alignItems: "center", justifyContent: "center" },
  exitCancelText: { fontFamily: "Nunito", fontSize: 15, fontWeight: "700", color: c.onSurface },
}));
