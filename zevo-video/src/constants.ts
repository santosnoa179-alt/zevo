// Zevo brand constants — shared across all scenes
export const COLORS = {
  bg: "#0D0D0D",
  bgElevated: "#09090B",
  bgCard: "#1E1E1E",
  bgSurface: "#2A2A2A",
  primary: "#FF6B2B",
  primaryLight: "#FF9A6C",
  text: "#F5F5F3",
  textMuted: "rgba(245,245,243,0.6)",
  border: "rgba(255,255,255,0.08)",
  red: "#EF4444",
  green: "#22C55E",
  blue: "#3B82F6",
  purple: "#8B5CF6",
  amber: "#F59E0B",
} as const;

export const FONTS = {
  display: '"Clash Display", "Inter", system-ui, sans-serif',
  body: '"Instrument Sans", "Inter", system-ui, sans-serif',
} as const;

// 30 seconds @ 30 fps = 900 frames
export const FPS = 30;
export const DURATION_IN_FRAMES = 900;

// Scene timing (in seconds)
export const SCENE_TIMING = {
  problem: { start: 0, end: 8 },
  reveal: { start: 8, end: 12 },
  inAction: { start: 12, end: 25 },
  result: { start: 25, end: 30 },
} as const;

export const secToFrames = (sec: number) => Math.round(sec * FPS);
