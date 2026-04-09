export const palette = {
  // Premium blue/purple gradient scheme
  primary: "#5B7FFF",
  primaryDark: "#4A68E6",
  primaryLight: "#7F9CFF",
  primaryLighter: "#A5B8FF",

  // Secondary accent colors
  accent: "#5B7FFF",
  accentSecondary: "#A1A1AA",
  accentTertiary: "#D4D4D8",

  // Modern dark backgrounds
  background: "#0F1117",
  backgroundSecondary: "#161B22",
  surface: "#1C2128",
  surfaceAlt: "#22272E",
  surfaceElevated: "#2D333B",

  // Text colors for dark background
  textPrimary: "#E6EDF3",
  textSecondary: "#8B949E",
  textTertiary: "#6E7681",

  // Status colors
  success: "#3FB950",
  warning: "#D29922",
  danger: "#F85149",
  info: "#5B7FFF",

  // Borders - subtle dark separation
  border: "#30363D",
  borderLight: "#21262D",
};

export const shadows = {
  card: {
    shadowColor: "#000000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.3,
    shadowRadius: 8,
    elevation: 5,
  },
  button: {
    shadowColor: "#5B7FFF",
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.25,
    shadowRadius: 12,
    elevation: 8,
  },
  elevated: {
    shadowColor: "#000000",
    shadowOffset: { width: 0, height: 12 },
    shadowOpacity: 0.4,
    shadowRadius: 20,
    elevation: 12,
  },
};

export const radii = {
  xs: 8,
  sm: 12,
  md: 16,
  lg: 20,
  xl: 28,
};

export const spacing = {
  xs: 6,
  sm: 10,
  md: 14,
  lg: 20,
  xl: 28,
  xxl: 36,
};

export const typography = {
  heading1: {
    fontSize: 36,
    fontWeight: "900" as const,
    letterSpacing: -0.8,
    color: palette.textPrimary,
    lineHeight: 42,
  },
  heading2: {
    fontSize: 28,
    fontWeight: "800" as const,
    letterSpacing: -0.5,
    color: palette.textPrimary,
    lineHeight: 34,
  },
  heading3: {
    fontSize: 22,
    fontWeight: "700" as const,
    letterSpacing: -0.3,
    color: palette.textPrimary,
    lineHeight: 28,
  },
  body: {
    fontSize: 16,
    fontWeight: "500" as const,
    color: palette.textSecondary,
    lineHeight: 24,
  },
  bodyMedium: {
    fontSize: 15,
    fontWeight: "500" as const,
    color: palette.textSecondary,
    lineHeight: 22,
  },
  bodySmall: {
    fontSize: 14,
    fontWeight: "500" as const,
    color: palette.textSecondary,
    lineHeight: 20,
  },
  label: {
    fontSize: 13,
    fontWeight: "700" as const,
    color: palette.textSecondary,
    letterSpacing: 0.4,
    textTransform: "uppercase" as const,
  },
  labelSmall: {
    fontSize: 11,
    fontWeight: "700" as const,
    color: palette.textTertiary,
    letterSpacing: 0.5,
    textTransform: "uppercase" as const,
  },
};

export const glass = {
  backgroundColor: "rgba(255,255,255,0.04)",
  borderWidth: 1,
  borderColor: "rgba(255,255,255,0.06)",
};

export const gradients = {
  hero: ["#11131a", "#0b0c10"],
  accent: ["#7c5dff", "#30e0a1"],
};
