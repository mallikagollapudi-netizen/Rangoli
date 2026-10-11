// Design tokens for this app. Light theme only.Always modify the colors and theme to Dark, Light or Dark and Light according to the design guidelines.
//
// The keys match the "color" block of /app/design_guidelines.json. Fill the
// values from that file (or from the user's brand colors). Keep every key; do
// not add a second theme or colors file; do not write color literals in
// components.
//
// How the names work: a plain key is a background, and its `on` partner is the
// text or icon color that sits on top of it. Always use them as a pair.
//   <View style={{ backgroundColor: colors.brandPrimary }}>
//     <Text style={{ color: colors.onBrandPrimary }}>Continue</Text>
//   </View>
//
// Styling a screen or component: build the sheet with makeStyles so colors
// and layout live together and follow the active scheme:
//   const useStyles = makeStyles((colors) => ({
//     card: { backgroundColor: colors.surfaceSecondary, padding: 16 },
//     title: { color: colors.onSurfaceSecondary, fontSize: 16 },
//   }));
//   function Screen() {
//     const styles = useStyles();
//     return <View style={styles.card}><Text style={styles.title}>Hi</Text></View>;
//   }
// For color props that are not styles (icon color, placeholderTextColor,
// ActivityIndicator) read useTheme().colors inside the component.
// Never call StyleSheet.create with color values at module level; it cannot
// follow the scheme.
//
// To support dark mode later: add `dark` to `themes` with every key filled.
// Nothing else changes; the device setting takes over automatically.
// Feel free to add as many new colors as you need to support the design guidelines.

import { useMemo } from "react";
import { Appearance, StyleSheet, useColorScheme } from "react-native";

export type ColorScheme = "light" | "dark";

const light = {
  // ---------------------------------------------------------------------------
  // Surfaces: backgrounds, from the screen down to small fills.
  // Each `on` key is the text and icon color for that background.
  // ---------------------------------------------------------------------------
  surface: "#FFF9F2", // primary canvas, most of every screen
  onSurface: "#3D261D", // text and icons on the canvas
  surfaceSecondary: "#F5EDE3", // cards, sheets, list rows
  onSurfaceSecondary: "#3D261D", // text and icons on cards, sheets, rows
  surfaceTertiary: "#EBE1D5", // input backgrounds, chips, deepest nesting
  onSurfaceTertiary: "#3D261D", // text on inputs and chips; also muted text
  surfaceInverse: "#3D261D", // tooltips, snackbars, anything popping against the theme
  onSurfaceInverse: "#FFF9F2", // text and icons on the inverse surface
  muted: "#85776C", // subdued text on surface: captions, timestamps, placeholders

  // ---------------------------------------------------------------------------
  // Brand: the identity color and the fills built from it.
  // Neutral by default; replace with the design guidelines values.
  // ---------------------------------------------------------------------------
  brand: "#D9381E", // base hue, anchor only; Primary, Secondary, Tertiary are weights of it
  onBrand: "#FFF9F2", // text and icons placed directly on brand
  brandPrimary: "#D9381E", // primary CTA, active tab indicator, selected states
  onBrandPrimary: "#FFF9F2", // text and icons on brandPrimary
  brandSecondary: "#F2A900", // secondary CTA, less prominent accents
  onBrandSecondary: "#3D261D", // text and icons on brandSecondary
  brandTertiary: "#8C3123", // chips, tags, badges, subtle brand moments
  onBrandTertiary: "#FFF9F2", // text and icons on brandTertiary

  // ---------------------------------------------------------------------------
  // Status: semantic only, never decorative. Fill for badges, banners and
  // toasts; the `on` key is text on that fill. The plain key is also safe as
  // text on `surface`.
  // ---------------------------------------------------------------------------
  success: "#2A7B4C",
  onSuccess: "#FFFFFF",
  warning: "#F2A900",
  onWarning: "#3D261D",
  error: "#D9381E",
  onError: "#FFFFFF",
  info: "#A6978A",
  onInfo: "#FFFFFF",

  // ---------------------------------------------------------------------------
  // Lines
  // ---------------------------------------------------------------------------
  border: "#EBE1D5", // hairline outline, 0.5pt or 1pt max: inputs, cards
  borderStrong: "#A6978A", // focus rings, selected outlines, 1.5pt max
  divider: "#EBE1D5", // subtle list separators

  // Overlays & glass
  scrim: "rgba(61,38,29,0.45)",
  scrimLight: "rgba(255,249,242,0.55)",
  scrimStrong: "rgba(30,16,10,0.85)",
  shadow: "#3D261D",
  glass: "rgba(255,249,242,0.72)",
  glassBorder: "rgba(255,255,255,0.6)",
};

export type ThemeColors = typeof light;

export const defaultScheme = "light" satisfies ColorScheme;

export const themes: { light: ThemeColors; dark?: ThemeColors } = { light };

// In-app theme toggle, only after `dark` exists in `themes`. Call
// setColorScheme("dark"), setColorScheme("light"), or setColorScheme(null) to
// follow the device. Every useTheme() consumer re-renders. Persisting the
// choice and re-applying it on launch is the toggle's job.
export function setColorScheme(scheme: ColorScheme | null) {
  // RN 0.86 re-reads the device scheme only for the literal "unspecified";
  // null would pin useColorScheme() to null and the app to light.
  Appearance.setColorScheme?.(scheme ?? "unspecified");
}

// Keep native surfaces (alerts, pickers, navigation chrome) on the schemes this
// app ships: light only forces light; once `dark` exists the device decides.
// Optional call because react-native-web does not implement it.
setColorScheme?.(themes.dark ? null : defaultScheme);

export function useTheme(): { scheme: ColorScheme; colors: ThemeColors } {
  const system = useColorScheme();
  const scheme: ColorScheme = system && themes[system] ? system : defaultScheme;
  return { scheme, colors: themes[scheme] ?? themes.light };
}

// Themed StyleSheet: returns a hook that builds the sheet from the active
// scheme's colors and memoizes it until the scheme changes.
export function makeStyles<T extends StyleSheet.NamedStyles<T> | StyleSheet.NamedStyles<any>>(
  factory: (colors: ThemeColors) => T & StyleSheet.NamedStyles<any>,
): () => T {
  return function useStyles(): T {
    const { colors } = useTheme();
    return useMemo(() => StyleSheet.create(factory(colors)), [colors]);
  };
}


