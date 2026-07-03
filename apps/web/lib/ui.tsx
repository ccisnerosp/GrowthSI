"use client";

import { type CSSProperties, type ReactNode, type MouseEvent } from "react";
import { theme, type Theme } from "@/lib/theme";

// ════════════════════════════════════════════════════════════════════
// AuroraBg — fondo animado púrpura del prototipo
// ════════════════════════════════════════════════════════════════════
export function AuroraBg() {
  return (
    <div style={{ position: "absolute", inset: 0, overflow: "hidden", zIndex: 0, pointerEvents: "none" }}>
      <div
        style={{
          position: "absolute",
          inset: 0,
          background: `linear-gradient(135deg, ${theme.bgFrom} 0%, ${theme.bgVia} 45%, ${theme.bgTo} 100%)`,
        }}
      />
      <svg style={{ position: "absolute", top: "-10%", right: "-15%", width: "70%", height: "70%", opacity: 0.18 }} viewBox="0 0 800 800">
        <defs>
          <linearGradient id="strg" x1="0" y1="0" x2="1" y2="1">
            <stop offset="0%" stopColor={theme.accent} stopOpacity="0.5" />
            <stop offset="100%" stopColor={theme.accent} stopOpacity="0.0" />
          </linearGradient>
          <pattern id="strp" x="0" y="0" width="14" height="14" patternUnits="userSpaceOnUse" patternTransform="rotate(45)">
            <line x1="0" y1="0" x2="0" y2="14" stroke={theme.accent} strokeWidth="1.5" strokeOpacity="0.18" />
          </pattern>
        </defs>
        <ellipse cx="400" cy="400" rx="380" ry="320" fill="url(#strg)" />
        <ellipse cx="400" cy="400" rx="380" ry="320" fill="url(#strp)" />
      </svg>
      <svg style={{ position: "absolute", bottom: "-15%", left: "-10%", width: "60%", height: "70%", opacity: 0.12 }} viewBox="0 0 800 800">
        <defs>
          <radialGradient id="glow2">
            <stop offset="0%" stopColor={theme.accent} stopOpacity="0.45" />
            <stop offset="70%" stopColor={theme.accent} stopOpacity="0" />
          </radialGradient>
        </defs>
        <circle cx="400" cy="400" r="380" fill="url(#glow2)" />
      </svg>
    </div>
  );
}

// ════════════════════════════════════════════════════════════════════
// Card
// ════════════════════════════════════════════════════════════════════
type CardProps = {
  children: ReactNode;
  padding?: number;
  style?: CSSProperties;
  className?: string;
  onClick?: (e: MouseEvent) => void;
  hover?: boolean;
};
export function Card({ children, padding, style, className, onClick, hover }: CardProps) {
  const pad = padding ?? theme.density.pad;
  return (
    <div
      className={className}
      onClick={onClick}
      onMouseEnter={hover ? (e) => { (e.currentTarget as HTMLElement).style.transform = "translateY(-2px)"; } : undefined}
      onMouseLeave={hover ? (e) => { (e.currentTarget as HTMLElement).style.transform = "translateY(0)"; } : undefined}
      style={{
        background: theme.surfaceActive,
        border: `1px solid ${theme.border}`,
        borderRadius: theme.r.xl,
        padding: pad,
        boxShadow: "0 1px 0 rgba(255,255,255,0.04) inset, 0 8px 24px rgba(0,0,0,0.35)",
        backdropFilter: "blur(28px) saturate(140%)",
        WebkitBackdropFilter: "blur(28px) saturate(140%)",
        transition: "transform .18s, box-shadow .18s",
        ...style,
      }}
    >
      {children}
    </div>
  );
}

// ════════════════════════════════════════════════════════════════════
// Button
// ════════════════════════════════════════════════════════════════════
type Variant = "primary" | "ghost" | "soft" | "danger" | "ai";
type Size = "sm" | "md" | "lg";

const SIZES = {
  sm: { h: 28, px: 10, fs: 12, gap: 6, r: 8 },
  md: { h: 36, px: 14, fs: 13, gap: 8, r: 10 },
  lg: { h: 44, px: 18, fs: 14, gap: 10, r: 12 },
};

function variantStyle(v: Variant): CSSProperties {
  switch (v) {
    case "primary": return { background: theme.accent, color: "#fff", border: "none", boxShadow: `0 1px 0 rgba(255,255,255,0.25) inset, 0 4px 12px ${theme.accent}40` };
    case "ghost":   return { background: "transparent", color: theme.ink, border: `1px solid ${theme.borderStrong}` };
    case "soft":    return { background: theme.accentSoft, color: theme.accentDeep, border: `1px solid ${theme.borderStrong}` };
    case "danger":  return { background: "transparent", color: theme.danger, border: `1px solid ${theme.danger}40` };
    case "ai":      return { background: `linear-gradient(135deg, ${theme.accent}, ${theme.accentDeep})`, color: "#fff", border: "none", boxShadow: `0 0 0 1px ${theme.accent}40, 0 4px 12px ${theme.accent}50` };
  }
}

type ButtonProps = {
  children?: ReactNode;
  variant?: Variant;
  size?: Size;
  icon?: ReactNode;
  onClick?: (e: MouseEvent) => void;
  style?: CSSProperties;
  type?: "button" | "submit" | "reset";
  disabled?: boolean;
  full?: boolean;
};

export function Button({ children, variant = "ghost", size = "md", icon, onClick, style, type, disabled, full }: ButtonProps) {
  const sizes = SIZES[size];
  return (
    <button
      type={type ?? "button"}
      onClick={onClick}
      disabled={disabled}
      style={{
        height: sizes.h,
        padding: `0 ${sizes.px}px`,
        fontSize: sizes.fs,
        gap: sizes.gap,
        borderRadius: sizes.r,
        display: "inline-flex",
        alignItems: "center",
        justifyContent: "center",
        fontWeight: 500,
        cursor: disabled ? "not-allowed" : "pointer",
        opacity: disabled ? 0.5 : 1,
        transition: "all .15s",
        whiteSpace: "nowrap",
        width: full ? "100%" : undefined,
        fontFamily: "inherit",
        letterSpacing: "-0.005em",
        ...variantStyle(variant),
        ...style,
      }}
      onMouseEnter={(e) => { if (!disabled) (e.currentTarget as HTMLElement).style.filter = "brightness(1.05)"; }}
      onMouseLeave={(e) => { (e.currentTarget as HTMLElement).style.filter = "brightness(1)"; }}
    >
      {icon && <span style={{ display: "inline-flex" }}>{icon}</span>}
      {children}
    </button>
  );
}

// ════════════════════════════════════════════════════════════════════
// Badge
// ════════════════════════════════════════════════════════════════════
type Tone = "neutral" | "accent" | "success" | "warn" | "danger" | "info";
const TONES: Record<Tone, { bg: string; fg: string; border: string }> = {
  neutral: { bg: "rgba(255,255,255,0.08)",  fg: theme.inkSoft,    border: theme.border },
  accent:  { bg: theme.accentSoft,          fg: theme.accentDeep, border: theme.borderStrong },
  success: { bg: "rgba(52,211,153,0.15)",   fg: theme.success,    border: "rgba(52,211,153,0.3)" },
  warn:    { bg: "rgba(251,191,36,0.15)",   fg: theme.warn,       border: "rgba(251,191,36,0.3)" },
  danger:  { bg: "rgba(248,113,113,0.15)",  fg: theme.danger,     border: "rgba(248,113,113,0.3)" },
  info:    { bg: "rgba(96,165,250,0.15)",   fg: theme.info,       border: "rgba(96,165,250,0.3)" },
};

export function Badge({ children, tone = "neutral", dot, style }: { children: ReactNode; tone?: Tone; dot?: boolean; style?: CSSProperties }) {
  const t = TONES[tone];
  return (
    <span
      style={{
        display: "inline-flex",
        alignItems: "center",
        gap: 5,
        height: 22,
        padding: "0 8px",
        borderRadius: 999,
        background: t.bg,
        color: t.fg,
        fontSize: 11.5,
        fontWeight: 500,
        letterSpacing: "-0.005em",
        border: `1px solid ${t.border}`,
        whiteSpace: "nowrap",
        ...style,
      }}
    >
      {dot && <span style={{ width: 6, height: 6, borderRadius: 999, background: t.fg }} />}
      {children}
    </span>
  );
}

// ════════════════════════════════════════════════════════════════════
// Avatar
// ════════════════════════════════════════════════════════════════════
const AVATAR_COLORS: Record<string, { bg: string; fg: string }> = {
  amber:   { bg: "#FCE4CF", fg: "#B85C12" },
  rose:    { bg: "#FBD5D5", fg: "#A82A2A" },
  sky:     { bg: "#D4E8F5", fg: "#1E5A8A" },
  emerald: { bg: "#CFEDD8", fg: "#0F6B45" },
  violet:  { bg: "#E0D5F0", fg: "#5C338A" },
  orange:  { bg: "#FBDCC0", fg: "#A6480F" },
  pink:    { bg: "#F8D5E5", fg: "#A03A6E" },
  slate:   { bg: "#D8D4CC", fg: "#4A4338" },
  teal:    { bg: "#CFE8E5", fg: "#0F6B65" },
  red:     { bg: "#FBC9C0", fg: "#9A2A1A" },
};

export function Avatar({ name, color = "violet", size = 32 }: { name: string; color?: keyof typeof AVATAR_COLORS; size?: number }) {
  const initials = (name || "")
    .split(" ")
    .slice(0, 2)
    .map((s) => s[0] ?? "")
    .join("")
    .toUpperCase();
  const c = AVATAR_COLORS[color] ?? AVATAR_COLORS.violet;
  return (
    <div
      style={{
        width: size,
        height: size,
        borderRadius: 999,
        background: c.bg,
        color: c.fg,
        display: "inline-flex",
        alignItems: "center",
        justifyContent: "center",
        fontSize: size * 0.38,
        fontWeight: 600,
        letterSpacing: "-0.02em",
        flexShrink: 0,
        border: `1.5px solid ${theme.surfaceSolid}`,
      }}
    >
      {initials}
    </div>
  );
}

// avatarColorFor moved to `lib/avatar-color.ts` (pure, server-safe).
// Re-export here for backwards-compat with client component imports.
export { avatarColorFor } from "@/lib/avatar-color";

// ════════════════════════════════════════════════════════════════════
// Icon
// ════════════════════════════════════════════════════════════════════
type IconName =
  | "home" | "grid" | "doc" | "shield" | "target" | "check"
  | "clipboard" | "alert" | "dashboard" | "users" | "chevR" | "chevL"
  | "chevD" | "chevU" | "plus" | "x" | "search" | "bell" | "sparkle"
  | "filter" | "download" | "upload" | "settings" | "arrowR" | "arrowU"
  | "arrowD" | "edit" | "trash" | "eye" | "lock" | "refresh"
  | "calendar" | "flag" | "send" | "layers" | "book" | "menu"
  | "moon" | "sun" | "drag" | "msft" | "link";

export function Icon({ name, size = 16, color = "currentColor", strokeWidth = 1.6 }: { name: IconName; size?: number; color?: string; strokeWidth?: number }) {
  const props = {
    width: size,
    height: size,
    viewBox: "0 0 24 24" as const,
    fill: "none" as const,
    stroke: color,
    strokeWidth,
    strokeLinecap: "round" as const,
    strokeLinejoin: "round" as const,
  };

  const paths: Record<IconName, ReactNode> = {
    home: <><path d="M3 11l9-8 9 8" /><path d="M5 10v10h14V10" /></>,
    grid: <><rect x="3" y="3" width="7" height="7" rx="1.5" /><rect x="14" y="3" width="7" height="7" rx="1.5" /><rect x="3" y="14" width="7" height="7" rx="1.5" /><rect x="14" y="14" width="7" height="7" rx="1.5" /></>,
    doc: <><path d="M14 3H7a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h10a2 2 0 0 0 2-2V8z" /><path d="M14 3v5h5" /></>,
    shield: <path d="M12 3l8 3v6c0 5-3.5 8-8 9-4.5-1-8-4-8-9V6l8-3z" />,
    target: <><circle cx="12" cy="12" r="9" /><circle cx="12" cy="12" r="5" /><circle cx="12" cy="12" r="1.5" fill={color} /></>,
    check: <path d="M4 12l5 5 11-12" />,
    clipboard: <><rect x="6" y="4" width="12" height="17" rx="2" /><path d="M9 4h6v3H9z" /></>,
    alert: <><path d="M12 3l10 18H2z" /><path d="M12 10v5" /><circle cx="12" cy="18" r="0.5" fill={color} /></>,
    dashboard: <><path d="M3 13h7V3H3z" /><path d="M14 21h7V11h-7z" /><path d="M14 7h7V3h-7z" /><path d="M3 21h7v-4H3z" /></>,
    users: <><circle cx="9" cy="8" r="3.5" /><path d="M3 20c0-3.3 2.7-6 6-6s6 2.7 6 6" /><circle cx="17" cy="9" r="3" /><path d="M15 14c2.5 0.3 5 2.4 5 5" /></>,
    chevR: <path d="M9 6l6 6-6 6" />,
    chevL: <path d="M15 6l-9 6 9 6" />,
    chevD: <path d="M6 9l6 6 6-6" />,
    chevU: <path d="M6 15l6-6 6 6" />,
    plus: <><path d="M12 5v14" /><path d="M5 12h14" /></>,
    x: <><path d="M5 5l14 14" /><path d="M19 5l-14 14" /></>,
    search: <><circle cx="11" cy="11" r="7" /><path d="M21 21l-5-5" /></>,
    bell: <><path d="M6 8a6 6 0 0 1 12 0c0 7 3 8 3 8H3s3-1 3-8" /><path d="M10 21a2 2 0 0 0 4 0" /></>,
    sparkle: <><path d="M12 3l2 6 6 2-6 2-2 6-2-6-6-2 6-2z" /><path d="M19 14l1 2 2 1-2 1-1 2-1-2-2-1 2-1z" /></>,
    filter: <path d="M3 5h18l-7 9v6l-4-2v-4z" />,
    download: <><path d="M12 4v12" /><path d="M7 11l5 5 5-5" /><path d="M4 20h16" /></>,
    upload: <><path d="M12 16V4" /><path d="M7 9l5-5 5 5" /><path d="M4 20h16" /></>,
    settings: <><circle cx="12" cy="12" r="3" /><path d="M19.4 15a1.7 1.7 0 0 0 .3 1.8l.1.1a2 2 0 1 1-2.8 2.8l-.1-.1a1.7 1.7 0 0 0-1.8-.3 1.7 1.7 0 0 0-1 1.5V21a2 2 0 0 1-4 0v-.1a1.7 1.7 0 0 0-1-1.5 1.7 1.7 0 0 0-1.8.3l-.1.1a2 2 0 1 1-2.8-2.8l.1-.1a1.7 1.7 0 0 0 .3-1.8 1.7 1.7 0 0 0-1.5-1H3a2 2 0 0 1 0-4h.1a1.7 1.7 0 0 0 1.5-1 1.7 1.7 0 0 0-.3-1.8l-.1-.1a2 2 0 1 1 2.8-2.8l.1.1a1.7 1.7 0 0 0 1.8.3 1.7 1.7 0 0 0 1-1.5V3a2 2 0 0 1 4 0v.1a1.7 1.7 0 0 0 1 1.5 1.7 1.7 0 0 0 1.8-.3l.1-.1a2 2 0 1 1 2.8 2.8l-.1.1a1.7 1.7 0 0 0-.3 1.8 1.7 1.7 0 0 0 1.5 1H21a2 2 0 0 1 0 4h-.1a1.7 1.7 0 0 0-1.5 1z" /></>,
    arrowR: <><path d="M5 12h14" /><path d="M13 5l7 7-7 7" /></>,
    arrowU: <><path d="M12 5v14" /><path d="M5 12l7-7 7 7" /></>,
    arrowD: <><path d="M12 5v14" /><path d="M19 12l-7 7-7-7" /></>,
    edit: <><path d="M12 20h9" /><path d="M16.5 3.5a2.1 2.1 0 1 1 3 3L7 19l-4 1 1-4z" /></>,
    trash: <><path d="M3 6h18" /><path d="M8 6V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2" /><path d="M5 6l1 14a2 2 0 0 0 2 2h8a2 2 0 0 0 2-2l1-14" /></>,
    eye: <><path d="M2 12s4-7 10-7 10 7 10 7-4 7-10 7-10-7-10-7z" /><circle cx="12" cy="12" r="3" /></>,
    lock: <><rect x="4" y="11" width="16" height="10" rx="2" /><path d="M8 11V7a4 4 0 0 1 8 0v4" /></>,
    refresh: <><path d="M21 12a9 9 0 1 1-3-6.7" /><path d="M21 4v5h-5" /></>,
    calendar: <><rect x="3" y="5" width="18" height="16" rx="2" /><path d="M8 3v4M16 3v4M3 10h18" /></>,
    flag: <><path d="M5 21V4" /><path d="M5 4h12l-2 4 2 4H5" /></>,
    send: <><path d="M22 2L11 13" /><path d="M22 2l-7 20-4-9-9-4z" /></>,
    layers: <><path d="M12 3l9 5-9 5-9-5z" /><path d="M3 13l9 5 9-5" /><path d="M3 18l9 5 9-5" /></>,
    book: <><path d="M4 4a2 2 0 0 1 2-2h13v18H6a2 2 0 0 0-2 2z" /><path d="M4 20V4" /></>,
    menu: <><path d="M3 6h18" /><path d="M3 12h18" /><path d="M3 18h18" /></>,
    moon: <path d="M21 13a9 9 0 1 1-10-10 7 7 0 0 0 10 10z" />,
    sun: <><circle cx="12" cy="12" r="4" /><path d="M12 2v2M12 20v2M4.93 4.93l1.41 1.41M17.66 17.66l1.41 1.41M2 12h2M20 12h2M4.93 19.07l1.41-1.41M17.66 6.34l1.41-1.41" /></>,
    drag: <><circle cx="9" cy="6" r="1.2" fill={color} /><circle cx="15" cy="6" r="1.2" fill={color} /><circle cx="9" cy="12" r="1.2" fill={color} /><circle cx="15" cy="12" r="1.2" fill={color} /><circle cx="9" cy="18" r="1.2" fill={color} /><circle cx="15" cy="18" r="1.2" fill={color} /></>,
    msft: <><rect x="3" y="3" width="8" height="8" fill="#F25022" stroke="none" /><rect x="13" y="3" width="8" height="8" fill="#7FBA00" stroke="none" /><rect x="3" y="13" width="8" height="8" fill="#00A4EF" stroke="none" /><rect x="13" y="13" width="8" height="8" fill="#FFB900" stroke="none" /></>,
    link: <><path d="M10 13a5 5 0 0 0 7.54.54l3-3a5 5 0 0 0-7.07-7.07l-1.72 1.71" /><path d="M14 11a5 5 0 0 0-7.54-.54l-3 3a5 5 0 0 0 7.07 7.07l1.71-1.71" /></>,
  };

  return <svg {...props}>{paths[name] ?? null}</svg>;
}

// ════════════════════════════════════════════════════════════════════
// Logo (GrowthSI wordmark)
// ════════════════════════════════════════════════════════════════════
export function Logo({ size = 28 }: { size?: number }) {
  const c = theme.accent;
  return (
    <div style={{ display: "inline-flex", alignItems: "center", gap: 8 }}>
      <svg width={size} height={size} viewBox="0 0 32 32" fill="none">
        <rect x="2" y="2" width="28" height="28" rx="9" fill={c} />
        <path
          d="M10 20c0 1.5 1.5 2.5 3.5 2.5s3.5-.7 3.5-2.5c0-3-7-2-7-5 0-1.5 1.5-2.5 3.5-2.5s3.5 1 3.5 2.5"
          stroke="#fff"
          strokeWidth="1.8"
          strokeLinecap="round"
          fill="none"
        />
        <circle cx="22" cy="11" r="1.5" fill="#fff" />
      </svg>
      <span style={{ fontSize: size * 0.55, fontWeight: 600, color: theme.ink, letterSpacing: "-0.02em" }}>GrowthSI</span>
    </div>
  );
}

// ════════════════════════════════════════════════════════════════════
// Field / Select — formularios
// ════════════════════════════════════════════════════════════════════
type FieldProps = {
  label: string;
  value: string;
  onChange: (v: string) => void;
  type?: string;
  placeholder?: string;
  required?: boolean;
  disabled?: boolean;
  hint?: string;
  error?: string;
  autoComplete?: string;
};

export function Field({ label, value, onChange, type = "text", placeholder, required, disabled, hint, error, autoComplete }: FieldProps) {
  return (
    <label style={{ display: "flex", flexDirection: "column", gap: 6 }}>
      <span style={{ fontSize: 11, fontWeight: 600, color: theme.inkSoft, letterSpacing: "-0.005em" }}>
        {label}
        {required && <span style={{ color: theme.danger, marginLeft: 4 }}>*</span>}
      </span>
      <input
        type={type}
        value={value}
        onChange={(e) => onChange(e.target.value)}
        placeholder={placeholder}
        disabled={disabled}
        required={required}
        autoComplete={autoComplete}
        style={{
          height: 40,
          padding: "0 12px",
          borderRadius: theme.r.md,
          background: "rgba(0,0,0,0.25)",
          border: `1px solid ${error ? theme.danger : theme.border}`,
          color: theme.ink,
          fontSize: 13,
          fontFamily: "inherit",
          outline: "none",
          opacity: disabled ? 0.6 : 1,
          cursor: disabled ? "not-allowed" : "text",
        }}
        onFocus={(e) => { if (!error) e.target.style.borderColor = theme.accent; }}
        onBlur={(e) => { if (!error) e.target.style.borderColor = theme.border; }}
      />
      {error && <span style={{ fontSize: 11, color: theme.danger }}>{error}</span>}
      {hint && !error && <span style={{ fontSize: 11, color: theme.inkMuted }}>{hint}</span>}
    </label>
  );
}

export function Select({ label, value, onChange, options, required }: { label: string; value: string; onChange: (v: string) => void; options: string[]; required?: boolean }) {
  return (
    <label style={{ display: "flex", flexDirection: "column", gap: 6 }}>
      <span style={{ fontSize: 11, fontWeight: 600, color: theme.inkSoft }}>
        {label}
        {required && <span style={{ color: theme.danger, marginLeft: 4 }}>*</span>}
      </span>
      <select
        value={value}
        onChange={(e) => onChange(e.target.value)}
        style={{
          height: 40,
          padding: "0 12px",
          borderRadius: theme.r.md,
          background: "rgba(0,0,0,0.25)",
          border: `1px solid ${theme.border}`,
          color: theme.ink,
          fontSize: 13,
          fontFamily: "inherit",
          outline: "none",
        }}
      >
        <option value="" disabled>Seleccionar…</option>
        {options.map((o) => (
          <option key={o} value={o} style={{ background: theme.surfaceSolid }}>{o}</option>
        ))}
      </select>
    </label>
  );
}

export { theme };
export type { Theme };
