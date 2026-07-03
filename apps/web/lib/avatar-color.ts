// Pure function, no React. Safe to call from server components.

export type AvatarColor =
  | "amber" | "rose" | "sky" | "emerald" | "violet"
  | "orange" | "pink" | "slate" | "teal" | "red";

const COLORS: ReadonlyArray<AvatarColor> = [
  "amber", "sky", "rose", "emerald", "violet",
  "orange", "pink", "teal", "red", "slate",
];

export function avatarColorFor(s: string | null | undefined): AvatarColor {
  if (!s) return "violet";
  const idx = s.split("").reduce((a, c) => a + c.charCodeAt(0), 0) % COLORS.length;
  return COLORS[idx];
}
