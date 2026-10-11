import * as MediaLibrary from "expo-media-library/legacy";
import * as Sharing from "expo-sharing";
import { DownloadSimple, ShareNetwork, X } from "phosphor-react-native";
import React, { useState } from "react";
import { ActivityIndicator, Linking, Modal, Platform, Pressable, Text, View, useWindowDimensions } from "react-native";
import { captureRef } from "react-native-view-shot";
import { useSafeAreaInsets } from "react-native-safe-area-context";

import { makeStyles, useTheme } from "../theme";

type Props = {
  visible: boolean;
  target: React.RefObject<View | null>;
  name: string;
  onClose: () => void;
  onDone: (msg: string) => void;
};

// "ask" = pre-permission explanation, "settings" = permanently denied
type PermStep = null | "ask" | "settings";

export function ShareSheet({ visible, target, name, onClose, onDone }: Props) {
  const insets = useSafeAreaInsets();
  const { colors } = useTheme();
  const styles = useStyles();
  const { height: winH } = useWindowDimensions();
  const [busy, setBusy] = useState<null | "save" | "share">(null);
  const [perm, setPerm] = useState<PermStep>(null);
  const [error, setError] = useState<string | null>(null);

  const capture = async () => {
    if (Platform.OS === "web") {
      return captureRef(target, { format: "png", quality: 1, result: "data-uri" });
    }
    return captureRef(target, { format: "png", quality: 1, result: "tmpfile" });
  };

  const downloadOnWeb = (uri: string) => {
    const a = (globalThis as any).document.createElement("a");
    a.href = uri;
    a.download = `${name || "rangoli"}.png`;
    a.click();
  };

  const saveImage = async () => {
    setBusy("save");
    setError(null);
    try {
      const uri = await capture();
      if (Platform.OS === "web") downloadOnWeb(uri);
      else await MediaLibrary.saveToLibraryAsync(uri);
      setPerm(null);
      onClose();
      onDone("Saved to your Photos");
    } catch {
      setError("Couldn't save the image. Please try again.");
    } finally {
      setBusy(null);
    }
  };

  const onSavePress = async () => {
    if (Platform.OS === "web") return saveImage();
    const current = await MediaLibrary.getPermissionsAsync(true, ["photo"]);
    if (current.granted) return saveImage();
    if (current.canAskAgain) setPerm("ask");
    else setPerm("settings");
  };

  const requestPerm = async () => {
    const res = await MediaLibrary.requestPermissionsAsync(true, ["photo"]);
    if (res.granted) return saveImage();
    setPerm(res.canAskAgain ? "ask" : "settings");
    setError("Photo access is needed to save your rangoli.");
  };

  const share = async () => {
    setBusy("share");
    setError(null);
    try {
      const uri = await capture();
      if (Platform.OS === "web" || !(await Sharing.isAvailableAsync())) {
        downloadOnWeb(uri);
        onClose();
        onDone("Image downloaded");
        return;
      }
      await Sharing.shareAsync(uri, { mimeType: "image/png", dialogTitle: "Share your rangoli", UTI: "public.png" });
      onClose();
    } catch {
      setError("Couldn't share the image. Please try again.");
    } finally {
      setBusy(null);
    }
  };

  const close = () => {
    setPerm(null);
    setError(null);
    onClose();
  };

  return (
    <Modal visible={visible} transparent animationType="slide" onRequestClose={close}>
      <View style={[styles.wrap, Platform.OS === "web" && { height: winH }]}>
        <Pressable style={styles.backdrop} onPress={close} testID="share-sheet-backdrop" />
        <View style={[styles.sheet, { paddingBottom: insets.bottom + 16 }]} testID="share-sheet">
          <View style={styles.handle} />
          <View style={styles.header}>
            <Text style={styles.title}>{perm ? "Save to Photos" : "Share your rangoli"}</Text>
            <Pressable testID="share-sheet-close-btn" onPress={close} style={styles.iconBtn} hitSlop={8}>
              <X size={22} color={colors.onSurface} />
            </Pressable>
          </View>

          {perm === "ask" && (
            <View testID="share-permission-ask">
              <Text style={styles.body}>Allow photo access so your rangoli can be saved to your gallery. We only add images — nothing is read.</Text>
              <Pressable testID="share-permission-allow-btn" onPress={requestPerm} style={[styles.btn, styles.primary]}>
                <Text style={[styles.btnText, { color: colors.onBrandPrimary }]}>Allow photo access</Text>
              </Pressable>
              <Pressable testID="share-permission-back-btn" onPress={() => setPerm(null)} style={styles.link}>
                <Text style={styles.linkText}>Not now</Text>
              </Pressable>
            </View>
          )}

          {perm === "settings" && (
            <View testID="share-permission-settings">
              <Text style={styles.body}>Photo access is turned off. Open Settings and allow Photos to save your rangoli. You can still share it below.</Text>
              <Pressable testID="share-open-settings-btn" onPress={() => Linking.openSettings()} style={[styles.btn, styles.primary]}>
                <Text style={[styles.btnText, { color: colors.onBrandPrimary }]}>Open Settings</Text>
              </Pressable>
              <Pressable testID="share-permission-back-btn" onPress={() => setPerm(null)} style={styles.link}>
                <Text style={styles.linkText}>Back</Text>
              </Pressable>
            </View>
          )}

          {!perm && (
            <View style={{ gap: 12 }}>
              <Pressable testID="share-save-photos-btn" disabled={!!busy} onPress={onSavePress} style={[styles.btn, styles.primary]}>
                {busy === "save" ? (
                  <ActivityIndicator color={colors.onBrandPrimary} />
                ) : (
                  <>
                    <DownloadSimple size={20} color={colors.onBrandPrimary} weight="bold" />
                    <Text style={[styles.btnText, { color: colors.onBrandPrimary }]}>
                      {Platform.OS === "web" ? "Download image" : "Save to Photos"}
                    </Text>
                  </>
                )}
              </Pressable>
              <Pressable testID="share-share-btn" disabled={!!busy} onPress={share} style={[styles.btn, styles.secondary]}>
                {busy === "share" ? (
                  <ActivityIndicator color={colors.onBrandSecondary} />
                ) : (
                  <>
                    <ShareNetwork size={20} color={colors.onBrandSecondary} weight="bold" />
                    <Text style={[styles.btnText, { color: colors.onBrandSecondary }]}>Share (WhatsApp & more)</Text>
                  </>
                )}
              </Pressable>
            </View>
          )}
          {error && <Text style={styles.error} testID="share-error-text">{error}</Text>}
        </View>
      </View>
    </Modal>
  );
}

const useStyles = makeStyles((c) => ({
  wrap: { flex: 1, justifyContent: "flex-end" },
  backdrop: { position: "absolute", left: 0, right: 0, top: 0, bottom: 0, backgroundColor: c.scrim },
  sheet: { backgroundColor: c.surface, borderTopLeftRadius: 24, borderTopRightRadius: 24, paddingHorizontal: 24, paddingTop: 8 },
  handle: { alignSelf: "center", width: 40, height: 4, borderRadius: 2, backgroundColor: c.borderStrong, marginBottom: 8 },
  header: { flexDirection: "row", alignItems: "center", justifyContent: "space-between", marginBottom: 12 },
  title: { fontFamily: "Fraunces", fontSize: 24, color: c.onSurface },
  iconBtn: { width: 44, height: 44, alignItems: "center", justifyContent: "center" },
  body: { fontFamily: "Nunito", fontSize: 15, color: c.onSurface, lineHeight: 22, marginBottom: 16 },
  btn: { height: 52, borderRadius: 999, flexDirection: "row", gap: 8, alignItems: "center", justifyContent: "center" },
  primary: { backgroundColor: c.brandPrimary },
  secondary: { backgroundColor: c.brandSecondary },
  btnText: { fontFamily: "Nunito", fontSize: 16, fontWeight: "800" },
  link: { height: 44, alignItems: "center", justifyContent: "center", marginTop: 4 },
  linkText: { fontFamily: "Nunito", fontSize: 15, fontWeight: "700", color: c.onSurface },
  error: { fontFamily: "Nunito", color: c.error, marginTop: 12 },
}));
