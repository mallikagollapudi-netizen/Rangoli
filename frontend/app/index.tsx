import { useQuery } from "@tanstack/react-query";
import { Image } from "expo-image";
import { LinearGradient } from "expo-linear-gradient";
import { useRouter } from "expo-router";
import { ArrowRight, DotsNine, Images, PaintBrush } from "phosphor-react-native";
import React from "react";
import { ActivityIndicator, FlatList, Pressable, ScrollView, Text, View } from "react-native";
import Animated, { FadeInDown } from "react-native-reanimated";
import { useSafeAreaInsets } from "react-native-safe-area-context";

import { api } from "@/src/api";
import { ArtworkThumb } from "@/src/components/ArtworkThumb";
import { makeStyles, useTheme } from "@/src/theme";

const HEADER_IMG = require("../assets/images/home-header.jpg");
const FREE_IMG = require("../assets/images/free-art.jpg");
const DOT_IMG = require("../assets/images/dot-mode.jpg");

export default function Home() {
  const insets = useSafeAreaInsets();
  const router = useRouter();
  const { colors } = useTheme();
  const styles = useStyles();
  const { data, isLoading, isError, refetch } = useQuery({ queryKey: ["artworks"], queryFn: api.list });

  return (
    <View style={styles.root} testID="home-screen">
      <ScrollView contentContainerStyle={{ paddingBottom: insets.bottom + 24 }} showsVerticalScrollIndicator={false}>
        <View style={[styles.header, { paddingTop: insets.top + 24 }]}>
          <Image source={HEADER_IMG} style={styles.headerImg} contentFit="cover" />
          <LinearGradient colors={[colors.scrimLight, colors.surface]} style={styles.headerImg} />
          <Text style={styles.kicker}>RANGOLI STUDIO</Text>
          <Text style={styles.title}>What will you{"\n"}draw today?</Text>
          <Text style={styles.subtitle}>Choose how you want to begin your rangoli</Text>
        </View>

        <View style={styles.cards}>
          <ModeCard
            testID="mode-free-art-card"
            index={0}
            image={FREE_IMG}
            icon={<PaintBrush size={24} color={colors.onBrandPrimary} weight="fill" />}
            title="Free Art"
            desc="Paint freely with brushes and a full colour wheel"
            onPress={() => router.push({ pathname: "/canvas", params: { mode: "free" } })}
          />
          <ModeCard
            testID="mode-dot-based-card"
            index={1}
            image={DOT_IMG}
            icon={<DotsNine size={24} color={colors.onBrandPrimary} weight="bold" />}
            title="Dot Rangoli"
            desc="Square, 45° rotated or triangle dot grids — join the dots"
            onPress={() => router.push("/dot-setup")}
          />
        </View>

        <View style={styles.sectionHead}>
          <Text style={styles.sectionTitle}>Your courtyard</Text>
          <Pressable testID="home-see-all-gallery-btn" onPress={() => router.push("/gallery")} style={styles.seeAll} hitSlop={8}>
            <Images size={18} color={colors.brandPrimary} />
            <Text style={styles.seeAllText}>Gallery</Text>
          </Pressable>
        </View>

        {isLoading ? (
          <ActivityIndicator color={colors.brandSecondary} style={{ marginTop: 24 }} />
        ) : isError ? (
          <Pressable testID="home-gallery-retry-btn" onPress={() => refetch()} style={styles.emptyBox}>
            <Text style={styles.emptyText}>Couldn't load your rangolis. Tap to retry.</Text>
          </Pressable>
        ) : data && data.length > 0 ? (
          <FlatList
            horizontal
            data={data.slice(0, 10)}
            keyExtractor={(a) => a.id}
            showsHorizontalScrollIndicator={false}
            contentContainerStyle={{ paddingHorizontal: 24, gap: 12 }}
            renderItem={({ item }) => (
              <Pressable
                testID={`home-recent-${item.id}`}
                onPress={() => router.push({ pathname: "/canvas", params: { id: item.id } })}
                style={styles.recent}
              >
                <ArtworkThumb art={item} size={120} />
                <Text numberOfLines={1} style={styles.recentName}>{item.name}</Text>
              </Pressable>
            )}
          />
        ) : (
          <View style={styles.emptyBox} testID="home-gallery-empty">
            <Text style={styles.emptyText}>Your courtyard is empty. Start a rangoli!</Text>
          </View>
        )}
      </ScrollView>
    </View>
  );
}

function ModeCard(props: {
  testID: string;
  index: number;
  image: number;
  icon: React.ReactNode;
  title: string;
  desc: string;
  onPress: () => void;
}) {
  const styles = useStyles();
  const { colors } = useTheme();
  return (
    <Animated.View entering={FadeInDown.delay(100 + props.index * 120).springify()}>
      <Pressable testID={props.testID} onPress={props.onPress} style={({ pressed }) => [styles.card, pressed && { transform: [{ scale: 0.98 }] }]}>
        <Image source={props.image} style={styles.cardImg} contentFit="cover" transition={200} />
        <LinearGradient colors={["transparent", colors.scrimStrong]} style={styles.cardImg} />
        <View style={styles.cardBadge}>{props.icon}</View>
        <View style={styles.cardBody}>
          <View style={{ flex: 1 }}>
            <Text style={styles.cardTitle}>{props.title}</Text>
            <Text style={styles.cardDesc}>{props.desc}</Text>
          </View>
          <View style={styles.cardArrow}>
            <ArrowRight size={20} color={colors.onBrandSecondary} weight="bold" />
          </View>
        </View>
      </Pressable>
    </Animated.View>
  );
}

const useStyles = makeStyles((c) => ({
  root: { flex: 1, backgroundColor: c.surface },
  header: { paddingHorizontal: 24, paddingBottom: 24, overflow: "hidden" },
  headerImg: { position: "absolute", left: 0, right: 0, top: 0, bottom: 0, width: "100%", height: "100%" },
  kicker: { fontFamily: "Nunito", fontSize: 12, letterSpacing: 2, color: c.brandTertiary, fontWeight: "800" },
  title: { fontFamily: "Fraunces", fontSize: 36, lineHeight: 42, color: c.onSurface, marginTop: 8 },
  subtitle: { fontFamily: "Nunito", fontSize: 16, color: c.onSurface, marginTop: 8, opacity: 0.8 },
  cards: { paddingHorizontal: 24, gap: 16 },
  card: {
    height: 200,
    borderRadius: 24,
    overflow: "hidden",
    backgroundColor: c.surfaceInverse,
    justifyContent: "flex-end",
    shadowColor: c.shadow,
    shadowOpacity: 0.18,
    shadowRadius: 12,
    shadowOffset: { width: 0, height: 6 },
    elevation: 4,
  },
  cardImg: { position: "absolute", left: 0, right: 0, top: 0, bottom: 0, width: "100%", height: "100%" },
  cardBadge: {
    position: "absolute",
    top: 16,
    left: 16,
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: c.brandPrimary,
    alignItems: "center",
    justifyContent: "center",
  },
  cardBody: { flexDirection: "row", alignItems: "flex-end", padding: 16, gap: 12 },
  cardTitle: { fontFamily: "Fraunces", fontSize: 28, color: c.onSurfaceInverse },
  cardDesc: { fontFamily: "Nunito", fontSize: 14, color: c.onSurfaceInverse, opacity: 0.9, marginTop: 4 },
  cardArrow: { width: 44, height: 44, borderRadius: 22, backgroundColor: c.brandSecondary, alignItems: "center", justifyContent: "center" },
  sectionHead: { flexDirection: "row", alignItems: "center", justifyContent: "space-between", paddingHorizontal: 24, marginTop: 32, marginBottom: 12 },
  sectionTitle: { fontFamily: "Fraunces", fontSize: 22, color: c.onSurface },
  seeAll: { flexDirection: "row", alignItems: "center", gap: 4, minHeight: 44 },
  seeAllText: { fontFamily: "Nunito", fontSize: 14, fontWeight: "700", color: c.brandPrimary },
  recent: { width: 120, borderRadius: 16, overflow: "hidden", backgroundColor: c.surfaceSecondary },
  recentName: { fontFamily: "Nunito", fontSize: 13, color: c.onSurface, padding: 8, fontWeight: "700" },
  emptyBox: {
    marginHorizontal: 24,
    padding: 24,
    borderRadius: 16,
    borderWidth: 1.5,
    borderStyle: "dashed",
    borderColor: c.borderStrong,
    backgroundColor: c.surfaceSecondary,
  },
  emptyText: { fontFamily: "Nunito", fontSize: 14, color: c.muted, textAlign: "center" },
}));
