// Theme tokens — del prototipo SGSI, con defaults aprobados:
//   dark: true · palette: purple · density: comfortable · cards: glass · sidebar: full.
// El panel de tweaks fue descartado por decisión del PO.

export const PURPLE_DARK = {
  bgFrom:           "#1A1028",
  bgVia:            "#241638",
  bgTo:             "#0F081A",
  accent:           "#B080FF",
  accentSoft:       "rgba(176, 128, 255, 0.18)",
  accentDeep:       "#E0D0FF",
  surface:          "rgba(36, 24, 56, 0.72)",
  surfaceSolid:     "#241838",
  surfaceOutlined:  "rgba(36, 24, 56, 0.40)",
  border:           "rgba(176, 128, 255, 0.10)",
  borderStrong:     "rgba(176, 128, 255, 0.20)",
  ink:              "#F5EFFF",
  inkSoft:          "#C8BAE0",
  inkMuted:         "#8B7AA8",
  success:          "#34D399",
  warn:             "#FBBF24",
  danger:           "#F87171",
  info:             "#60A5FA",
  chartA:           "#B080FF",
  chartB:           "#E0D0FF",
  chartC:           "#6B3FA0",
};

export const RADIUS = { sm: 8, md: 12, lg: 16, xl: 20, xxl: 28 };
export const DENSITY = { row: 52, pad: 20, gap: 16, fs: 13.5 };

// theme con el shape que esperan los componentes portados
export const theme = {
  ...PURPLE_DARK,
  isDark: true,
  cards: "glass" as const,
  surfaceActive: PURPLE_DARK.surface, // glass cards
  density: DENSITY,
  r: RADIUS,
};

export type Theme = typeof theme;
