import { useQuery, useQueryClient } from "@tanstack/react-query";
import { useRouter } from "expo-router";
import { ArrowLeft, Trash } from "phosphor-react-native";
import React, { useState } from "react";
import { ActivityIndicator, FlatList, Pressable, RefreshControl, Text, View, useWindowDimensions } from "react-native";
import Animated, { FadeInDown } from "react-native-reanimated";
import { useSafeAreaInsets } from "react-native-safe-area-context";

import { api } from "@/src/api";
import { ArtworkThumb } from "@/src/components/ArtworkThumb";
import { Artwork } from "@/src/drawing";
import { makeStyles, useTheme } from "@/src/theme";

export default function Gallery() {
  const insets = useSafeAreaInsets();
  const router = useRouter();
  const { colors } = useTheme();
  const styles = useStyles();
  const qc = useQueryClient();
  const { width } = useWindowDimensions();
  const size = (Math.min(width, 600) - 24 * 2 - 12) / 2;
  const { data, isLoading, isError, refetch, isRefetching } = useQuery({ queryKey: ["artworks"], queryFn: api.list });
  const [pendingDelete, setPendingDelete] = useState<Artwork | null>(null);
  const [deleting, setDeleting] = useState(false);

  const doDelete = async () => {
    if (!pendingDelete) return;
    setDeleting(true);
    try {
      await api.remove(pendingDelete.id);
      await qc.invalidateQueries({ queryKey: ["artworks"] });
    } finally {
      setDeleting(false);
      setPendingDelete(null);
    }
  };

  return (
    <View style={styles.root} testID="gallery-screen">
      <View style={[styles.header, { paddingTop: insets.top + 8 }]}>
        <Pressable testID="gallery-back-btn" onPress={() => router.back()} style={styles.iconBtn} hitSlop={8}>
          <ArrowLeft size={24} color={colors.onSurface} weight="bold" />
        </Pressable>
        <Text style={styles.title}>Gallery</Text>
      </View>

      {isLoading ? (
        <ActivityIndicator color={colors.brandSecondary} style={{ marginTop: 48 }} size="large" />
      ) : isError ? (
        <View style={styles.center}>
          <Text style={styles.emptyTitle}>Unable to load gallery</Text>
          <Pressable testID="gallery-retry-btn" onPress={() => refetch()} style={styles.pill}>
            <Text style={styles.pillText}>Retry</Text>
          </Pressable>
        </View>
      ) : (
        <FlatList
          data={data}
          numColumns={2}
          keyExtractor={(a) => a.id}
          columnWrapperStyle={{ gap: 12 }}
          contentContainerStyle={{ paddingHorizontal: 24, gap: 12, paddingBottom: insets.bottom + 24, flexGrow: 1 }}
          refreshControl={<RefreshControl refreshing={isRefetching} onRefresh={refetch} tintColor={colors.brandPrimary} />}
          ListEmptyComponent={
            <View style={styles.center} testID="gallery-empty">
              <Text style={styles.emptyTitle}>Your courtyard is empty.</Text>
              <Text style={styles.emptyText}>Start a rangoli and save it here.</Text>
              <Pressable testID="gallery-start-btn" onPress={() => router.replace("/")} style={styles.pill}>
                <Text style={styles.pillText}>Start a rangoli</Text>
              </Pressable>
            </View>
          }
          renderItem={({ item, index }) => (
            <Animated.View entering={FadeInDown.delay(Math.min(index, 8) * 60)} style={[styles.card, { width: size }]}>
              <Pressable testID={`gallery-item-${item.id}`} onPress={() => router.push({ pathname: "/canvas", params: { id: item.id } })}>
                <ArtworkThumb art={item} size={size} />
                <View style={styles.cardBody}>
                  <View style={{ flex: 1 }}>
                    <Text numberOfLines={1} style={styles.name}>{item.name}</Text>
                    <Text style={styles.meta}>
                      {item.mode === "dot" ? "Dot" : "Free art"} · {new Date(item.updated_at).toLocaleDateString()}
                    </Text>
                  </View>
                  <Pressable testID={`gallery-delete-${item.id}`} onPress={() => setPendingDelete(item)} style={styles.delBtn} hitSlop={6}>
                    <Trash size={18} color={colors.error} />
                  </Pressable>
                </View>
              </Pressable>
            </Animated.View>
          )}
        />
      )}

      {pendingDelete && (
        <View style={styles.overlay} testID="gallery-delete-confirm">
          <Pressable style={styles.overlayBg} onPress={() => setPendingDelete(null)} />
          <View style={[styles.sheet, { paddingBottom: insets.bottom + 16 }]}>
            <Text style={styles.sheetTitle}>Delete “{pendingDelete.name}”?</Text>
            <Text style={styles.emptyText}>This rangoli will be removed from your gallery.</Text>
            <View style={styles.sheetRow}>
              <Pressable testID="gallery-delete-cancel-btn" onPress={() => setPendingDelete(null)} style={[styles.sheetBtn, { backgroundColor: colors.surfaceTertiary }]}>
                <Text style={styles.cancelText}>Cancel</Text>
              </Pressable>
              <Pressable testID="gallery-delete-confirm-btn" onPress={doDelete} style={[styles.sheetBtn, { backgroundColor: colors.error }]}>
                {deleting ? <ActivityIndicator color={colors.onError} /> : <Text style={styles.deleteText}>Delete</Text>}
              </Pressable>
            </View>
          </View>
        </View>
      )}
    </View>
  );
}

const useStyles = makeStyles((c) => ({
  root: { flex: 1, backgroundColor: c.surface },
  header: { flexDirection: "row", alignItems: "center", gap: 8, paddingHorizontal: 16, paddingBottom: 16 },
  iconBtn: { width: 44, height: 44, alignItems: "center", justifyContent: "center" },
  title: { fontFamily: "Fraunces", fontSize: 30, color: c.onSurface },
  center: { flex: 1, alignItems: "center", justifyContent: "center", gap: 8, padding: 24 },
  emptyTitle: { fontFamily: "Fraunces", fontSize: 22, color: c.onSurface },
  emptyText: { fontFamily: "Nunito", fontSize: 14, color: c.muted },
  pill: { marginTop: 16, height: 48, paddingHorizontal: 24, borderRadius: 999, backgroundColor: c.brandPrimary, justifyContent: "center" },
  pillText: { fontFamily: "Nunito", fontWeight: "800", color: c.onBrandPrimary },
  card: {
    borderRadius: 16,
    overflow: "hidden",
    backgroundColor: c.surfaceSecondary,
    borderWidth: 1,
    borderColor: c.border,
  },
  cardBody: { flexDirection: "row", alignItems: "center", padding: 8, paddingLeft: 12 },
  name: { fontFamily: "Nunito", fontSize: 14, fontWeight: "800", color: c.onSurface },
  meta: { fontFamily: "Nunito", fontSize: 12, color: c.muted, marginTop: 2 },
  delBtn: { width: 44, height: 44, alignItems: "center", justifyContent: "center" },
  overlay: { position: "absolute", left: 0, right: 0, top: 0, bottom: 0, justifyContent: "flex-end" },
  overlayBg: { position: "absolute", left: 0, right: 0, top: 0, bottom: 0, backgroundColor: c.scrim },
  sheet: { backgroundColor: c.surface, borderTopLeftRadius: 24, borderTopRightRadius: 24, padding: 24, gap: 8 },
  sheetTitle: { fontFamily: "Fraunces", fontSize: 22, color: c.onSurface },
  sheetRow: { flexDirection: "row", gap: 12, marginTop: 16 },
  sheetBtn: { flex: 1, height: 52, borderRadius: 999, alignItems: "center", justifyContent: "center" },
  cancelText: { fontFamily: "Nunito", fontWeight: "800", color: c.onSurface },
  deleteText: { fontFamily: "Nunito", fontWeight: "800", color: c.onError },
}));
