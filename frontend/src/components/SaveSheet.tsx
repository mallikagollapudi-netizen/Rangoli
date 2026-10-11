import React, { useState } from "react";
import { ActivityIndicator, Modal, Platform, Pressable, Text, TextInput, View, useWindowDimensions } from "react-native";
import { KeyboardAvoidingView } from "react-native-keyboard-controller";
import { useSafeAreaInsets } from "react-native-safe-area-context";

import { makeStyles, useTheme } from "../theme";

type Props = {
  visible: boolean;
  initialName: string;
  saving: boolean;
  error: string | null;
  onClose: () => void;
  onSave: (name: string) => void;
};

export function SaveSheet({ visible, initialName, saving, error, onClose, onSave }: Props) {
  const insets = useSafeAreaInsets();
  const { colors } = useTheme();
  const styles = useStyles();
  const [name, setName] = useState(initialName);
  const valid = name.trim().length > 0;

  const Wrapper = Platform.OS === "web" ? View : KeyboardAvoidingView;
  const { height: winH } = useWindowDimensions();

  return (
    <Modal visible={visible} transparent animationType="slide" onRequestClose={onClose} onShow={() => setName(initialName)}>
      <Wrapper behavior="padding" style={[styles.wrap, Platform.OS === "web" && { height: winH }]}>
        <Pressable style={styles.backdrop} onPress={onClose} testID="save-sheet-backdrop" />
        <View style={[styles.sheet, { paddingBottom: insets.bottom + 16 }]} testID="save-sheet">
          <View style={styles.handle} />
          <Text style={styles.title}>Save on device</Text>
          <Text style={styles.label}>Name your rangoli</Text>
          <TextInput
            testID="save-name-input"
            value={name}
            onChangeText={setName}
            placeholder="Diwali lotus"
            placeholderTextColor={colors.muted}
            style={styles.input}
            maxLength={60}
            autoFocus={Platform.OS !== "web"}
            returnKeyType="done"
            onSubmitEditing={() => valid && onSave(name.trim())}
          />
          {error && <Text style={styles.error} testID="save-error-text">{error}</Text>}
          <Pressable
            testID="save-confirm-btn"
            disabled={!valid || saving}
            onPress={() => onSave(name.trim())}
            style={({ pressed }) => [styles.btn, (!valid || saving) && { opacity: 0.5 }, pressed && { opacity: 0.85 }]}
          >
            {saving ? <ActivityIndicator color={colors.onBrandPrimary} /> : <Text style={styles.btnText}>Save rangoli</Text>}
          </Pressable>
        </View>
      </Wrapper>
    </Modal>
  );
}

const useStyles = makeStyles((c) => ({
  wrap: { flex: 1, justifyContent: "flex-end" },
  backdrop: { position: "absolute", left: 0, right: 0, top: 0, bottom: 0, backgroundColor: c.scrim },
  sheet: { backgroundColor: c.surface, borderTopLeftRadius: 24, borderTopRightRadius: 24, paddingHorizontal: 24, paddingTop: 8 },
  handle: { alignSelf: "center", width: 40, height: 4, borderRadius: 2, backgroundColor: c.borderStrong, marginBottom: 16 },
  title: { fontFamily: "Fraunces", fontSize: 24, color: c.onSurface, marginBottom: 16 },
  label: { fontFamily: "Nunito", fontSize: 14, color: c.muted, marginBottom: 8 },
  input: {
    height: 52,
    borderRadius: 16,
    backgroundColor: c.surfaceSecondary,
    borderWidth: 1,
    borderColor: c.border,
    paddingHorizontal: 16,
    fontFamily: "Nunito",
    fontSize: 16,
    color: c.onSurface,
  },
  error: { fontFamily: "Nunito", color: c.error, marginTop: 8 },
  btn: { marginTop: 24, height: 52, borderRadius: 999, backgroundColor: c.brandPrimary, alignItems: "center", justifyContent: "center" },
  btnText: { fontFamily: "Nunito", fontSize: 16, fontWeight: "700", color: c.onBrandPrimary },
}));
