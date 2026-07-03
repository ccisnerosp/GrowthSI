// SGSI Platform — shared UI components
// Warm peach aesthetic, glass-morphism cards, soft rounded corners

const { useState, useEffect, useRef, useMemo, useCallback } = React;

// ─────────────────────────────────────────────────────────────
// THEME — palette + density tokens, derived from tweaks
// ─────────────────────────────────────────────────────────────
const PALETTES = {
  peach: {
    bgFrom: '#FFD4A8',
    bgVia: '#FFE4C4',
    bgTo: '#F8E8D5',
    accent: '#E8853A',     // orange
    accentSoft: '#FCE4CF',
    accentDeep: '#B85C12',
    surface: 'rgba(255, 251, 245, 0.78)',
    surfaceSolid: '#FFFBF5',
    surfaceOutlined: 'rgba(255,251,245,0.55)',
    border: 'rgba(184, 92, 18, 0.10)',
    borderStrong: 'rgba(184, 92, 18, 0.20)',
    ink: '#2A1F14',
    inkSoft: '#5A4A3A',
    inkMuted: '#8B7560',
    success: '#0F8A5F',
    warn: '#D97706',
    danger: '#C0392B',
    info: '#2680C2',
    chartA: '#E8853A',
    chartB: '#F4B860',
    chartC: '#9C5A20',
  },
  purple: {
    bgFrom: '#C8B4E8',
    bgVia: '#D6C4F0',
    bgTo: '#E8DCF5',
    accent: '#6B3FA0',
    accentSoft: '#E6DCF5',
    accentDeep: '#3F1B6E',
    surface: 'rgba(252, 250, 255, 0.78)',
    surfaceSolid: '#FCFAFF',
    surfaceOutlined: 'rgba(252,250,255,0.55)',
    border: 'rgba(63, 27, 110, 0.10)',
    borderStrong: 'rgba(63, 27, 110, 0.20)',
    ink: '#1F1530',
    inkSoft: '#473A60',
    inkMuted: '#7A6B90',
    success: '#0F8A5F',
    warn: '#D97706',
    danger: '#C0392B',
    info: '#2680C2',
    chartA: '#6B3FA0',
    chartB: '#A580D6',
    chartC: '#3F1B6E',
  },
  neutral: {
    bgFrom: '#E8E4DD',
    bgVia: '#F0ECE5',
    bgTo: '#F5F2EC',
    accent: '#4A4338',
    accentSoft: '#E0DAD0',
    accentDeep: '#1F1A12',
    surface: 'rgba(252, 250, 246, 0.82)',
    surfaceSolid: '#FCFAF6',
    surfaceOutlined: 'rgba(252,250,246,0.55)',
    border: 'rgba(31, 26, 18, 0.10)',
    borderStrong: 'rgba(31, 26, 18, 0.20)',
    ink: '#1F1A12',
    inkSoft: '#4A4338',
    inkMuted: '#7A7060',
    success: '#0F8A5F',
    warn: '#D97706',
    danger: '#C0392B',
    info: '#2680C2',
    chartA: '#4A4338',
    chartB: '#8B7560',
    chartC: '#1F1A12',
  },
};

const DARK_PALETTES = {
  peach: {
    bgFrom: '#2A1810',
    bgVia: '#3A2418',
    bgTo: '#1F140C',
    accent: '#F4A560',
    accentSoft: 'rgba(244, 165, 96, 0.18)',
    accentDeep: '#FFD4A8',
    surface: 'rgba(40, 28, 20, 0.72)',
    surfaceSolid: '#2A1F18',
    surfaceOutlined: 'rgba(40,28,20,0.40)',
    border: 'rgba(244, 165, 96, 0.10)',
    borderStrong: 'rgba(244, 165, 96, 0.20)',
    ink: '#FAF3E8',
    inkSoft: '#D4C5B0',
    inkMuted: '#9A8770',
    success: '#34D399',
    warn: '#FBBF24',
    danger: '#F87171',
    info: '#60A5FA',
    chartA: '#F4A560',
    chartB: '#FFD4A8',
    chartC: '#B85C12',
  },
  purple: {
    bgFrom: '#1A1028',
    bgVia: '#241638',
    bgTo: '#0F081A',
    accent: '#B080FF',
    accentSoft: 'rgba(176, 128, 255, 0.18)',
    accentDeep: '#E0D0FF',
    surface: 'rgba(36, 24, 56, 0.72)',
    surfaceSolid: '#241838',
    surfaceOutlined: 'rgba(36,24,56,0.40)',
    border: 'rgba(176, 128, 255, 0.10)',
    borderStrong: 'rgba(176, 128, 255, 0.20)',
    ink: '#F5EFFF',
    inkSoft: '#C8BAE0',
    inkMuted: '#8B7AA8',
    success: '#34D399',
    warn: '#FBBF24',
    danger: '#F87171',
    info: '#60A5FA',
    chartA: '#B080FF',
    chartB: '#E0D0FF',
    chartC: '#6B3FA0',
  },
  neutral: {
    bgFrom: '#1A1814',
    bgVia: '#252220',
    bgTo: '#0F0E0C',
    accent: '#D4C5A8',
    accentSoft: 'rgba(212, 197, 168, 0.18)',
    accentDeep: '#F5EFE0',
    surface: 'rgba(36, 32, 28, 0.72)',
    surfaceSolid: '#252220',
    surfaceOutlined: 'rgba(36,32,28,0.40)',
    border: 'rgba(212, 197, 168, 0.10)',
    borderStrong: 'rgba(212, 197, 168, 0.20)',
    ink: '#F5F0E8',
    inkSoft: '#C8BFB0',
    inkMuted: '#8B8170',
    success: '#34D399',
    warn: '#FBBF24',
    danger: '#F87171',
    info: '#60A5FA',
    chartA: '#D4C5A8',
    chartB: '#F5EFE0',
    chartC: '#8B7560',
  },
};

const DENSITY = {
  compact: { row: 36, pad: 12, gap: 8, fs: 12.5 },
  balanced: { row: 44, pad: 16, gap: 12, fs: 13 },
  comfortable: { row: 52, pad: 20, gap: 16, fs: 13.5 },
};

function useTheme(tweaks) {
  return useMemo(() => {
    const palettes = tweaks.dark ? DARK_PALETTES : PALETTES;
    const p = palettes[tweaks.palette] || palettes.peach;
    const d = DENSITY[tweaks.density] || DENSITY.balanced;
    let surface;
    if (tweaks.cards === 'solid') surface = p.surfaceSolid;
    else if (tweaks.cards === 'outlined') surface = p.surfaceOutlined;
    else surface = p.surface;
    return {
      ...p,
      density: d,
      cards: tweaks.cards || 'glass',
      surfaceActive: surface,
      isDark: !!tweaks.dark,
      // Border-radius tokens
      r: { sm: 8, md: 12, lg: 16, xl: 20, xxl: 28 },
    };
  }, [tweaks.dark, tweaks.palette, tweaks.density, tweaks.cards]);
}

// ─────────────────────────────────────────────────────────────
// Background — animated peach/purple/neutral aurora with grain
// ─────────────────────────────────────────────────────────────
function AuroraBg({ theme }) {
  return (
    <div style={{ position: 'absolute', inset: 0, overflow: 'hidden', zIndex: 0, pointerEvents: 'none' }}>
      <div style={{
        position: 'absolute', inset: 0,
        background: `linear-gradient(135deg, ${theme.bgFrom} 0%, ${theme.bgVia} 45%, ${theme.bgTo} 100%)`,
      }} />
      {/* Striated/lined accent — evokes the textured ribbons in the reference */}
      <svg style={{ position: 'absolute', top: '-10%', right: '-15%', width: '70%', height: '70%', opacity: theme.isDark ? 0.18 : 0.45 }} viewBox="0 0 800 800">
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
      <svg style={{ position: 'absolute', bottom: '-15%', left: '-10%', width: '60%', height: '70%', opacity: theme.isDark ? 0.12 : 0.35 }} viewBox="0 0 800 800">
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

// ─────────────────────────────────────────────────────────────
// Card — glass / solid / outlined variants
// ─────────────────────────────────────────────────────────────
function Card({ children, theme, padding, style, className, onClick, hover }) {
  const pad = padding ?? theme.density.pad;
  const base = {
    background: theme.surfaceActive,
    border: `1px solid ${theme.cards === 'outlined' ? theme.borderStrong : theme.border}`,
    borderRadius: theme.r.xl,
    padding: pad,
    boxShadow: theme.cards === 'glass'
      ? (theme.isDark ? '0 1px 0 rgba(255,255,255,0.04) inset, 0 8px 24px rgba(0,0,0,0.35)' : '0 1px 0 rgba(255,255,255,0.6) inset, 0 4px 16px rgba(60,30,10,0.06)')
      : theme.cards === 'solid'
        ? (theme.isDark ? '0 4px 12px rgba(0,0,0,0.4)' : '0 2px 8px rgba(60,30,10,0.04)')
        : 'none',
    backdropFilter: theme.cards === 'glass' ? 'blur(28px) saturate(140%)' : 'none',
    WebkitBackdropFilter: theme.cards === 'glass' ? 'blur(28px) saturate(140%)' : 'none',
    transition: 'transform .18s, box-shadow .18s',
    ...style,
  };
  return (
    <div className={className} style={base} onClick={onClick}
      onMouseEnter={hover ? (e) => { e.currentTarget.style.transform = 'translateY(-2px)'; } : undefined}
      onMouseLeave={hover ? (e) => { e.currentTarget.style.transform = 'translateY(0)'; } : undefined}
    >
      {children}
    </div>
  );
}

// ─────────────────────────────────────────────────────────────
// Button
// ─────────────────────────────────────────────────────────────
function Button({ children, variant = 'ghost', size = 'md', theme, icon, onClick, style, type, disabled, full }) {
  const sizes = {
    sm: { h: 28, px: 10, fs: 12, gap: 6, r: 8 },
    md: { h: 36, px: 14, fs: 13, gap: 8, r: 10 },
    lg: { h: 44, px: 18, fs: 14, gap: 10, r: 12 },
  }[size];
  const variants = {
    primary: {
      background: theme.accent,
      color: '#fff',
      border: 'none',
      boxShadow: `0 1px 0 rgba(255,255,255,0.25) inset, 0 4px 12px ${theme.accent}40`,
    },
    ghost: {
      background: 'transparent',
      color: theme.ink,
      border: `1px solid ${theme.borderStrong}`,
    },
    soft: {
      background: theme.accentSoft,
      color: theme.accentDeep,
      border: `1px solid ${theme.borderStrong}`,
    },
    danger: {
      background: 'transparent',
      color: theme.danger,
      border: `1px solid ${theme.danger}40`,
    },
    ai: {
      background: `linear-gradient(135deg, ${theme.accent}, ${theme.accentDeep})`,
      color: '#fff',
      border: 'none',
      boxShadow: `0 0 0 1px ${theme.accent}40, 0 4px 12px ${theme.accent}50`,
    },
  };
  return (
    <button
      type={type || 'button'}
      onClick={onClick}
      disabled={disabled}
      style={{
        height: sizes.h,
        padding: `0 ${sizes.px}px`,
        fontSize: sizes.fs,
        gap: sizes.gap,
        borderRadius: sizes.r,
        display: 'inline-flex',
        alignItems: 'center',
        justifyContent: 'center',
        fontWeight: 500,
        cursor: disabled ? 'not-allowed' : 'pointer',
        opacity: disabled ? 0.5 : 1,
        transition: 'all .15s',
        whiteSpace: 'nowrap',
        width: full ? '100%' : undefined,
        fontFamily: 'inherit',
        letterSpacing: '-0.005em',
        ...variants[variant],
        ...style,
      }}
      onMouseEnter={(e) => { if (!disabled) e.currentTarget.style.filter = 'brightness(1.05)'; }}
      onMouseLeave={(e) => { e.currentTarget.style.filter = 'brightness(1)'; }}
    >
      {icon && <span style={{ display: 'inline-flex' }}>{icon}</span>}
      {children}
    </button>
  );
}

// ─────────────────────────────────────────────────────────────
// Badge
// ─────────────────────────────────────────────────────────────
function Badge({ children, tone = 'neutral', theme, style, dot }) {
  const tones = {
    neutral: { bg: theme.isDark ? 'rgba(255,255,255,0.08)' : 'rgba(0,0,0,0.05)', fg: theme.inkSoft, border: theme.border },
    accent: { bg: theme.accentSoft, fg: theme.accentDeep, border: theme.borderStrong },
    success: { bg: theme.isDark ? 'rgba(52,211,153,0.15)' : '#D6F2E5', fg: theme.success, border: theme.isDark ? 'rgba(52,211,153,0.3)' : '#A8DCC0' },
    warn: { bg: theme.isDark ? 'rgba(251,191,36,0.15)' : '#FCEDC9', fg: theme.warn, border: theme.isDark ? 'rgba(251,191,36,0.3)' : '#F0CC80' },
    danger: { bg: theme.isDark ? 'rgba(248,113,113,0.15)' : '#FAD9D5', fg: theme.danger, border: theme.isDark ? 'rgba(248,113,113,0.3)' : '#E89A92' },
    info: { bg: theme.isDark ? 'rgba(96,165,250,0.15)' : '#D5E5F2', fg: theme.info, border: theme.isDark ? 'rgba(96,165,250,0.3)' : '#9BC2DB' },
  };
  const t = tones[tone] || tones.neutral;
  return (
    <span style={{
      display: 'inline-flex',
      alignItems: 'center',
      gap: 5,
      height: 22,
      padding: '0 8px',
      borderRadius: 999,
      background: t.bg,
      color: t.fg,
      fontSize: 11.5,
      fontWeight: 500,
      letterSpacing: '-0.005em',
      border: `1px solid ${t.border}`,
      whiteSpace: 'nowrap',
      ...style,
    }}>
      {dot && <span style={{ width: 6, height: 6, borderRadius: 999, background: t.fg }} />}
      {children}
    </span>
  );
}

// ─────────────────────────────────────────────────────────────
// Avatar — colored initials
// ─────────────────────────────────────────────────────────────
const AVATAR_COLORS = {
  amber:   { bg: '#FCE4CF', fg: '#B85C12' },
  rose:    { bg: '#FBD5D5', fg: '#A82A2A' },
  sky:     { bg: '#D4E8F5', fg: '#1E5A8A' },
  emerald: { bg: '#CFEDD8', fg: '#0F6B45' },
  violet:  { bg: '#E0D5F0', fg: '#5C338A' },
  orange:  { bg: '#FBDCC0', fg: '#A6480F' },
  pink:    { bg: '#F8D5E5', fg: '#A03A6E' },
  slate:   { bg: '#D8D4CC', fg: '#4A4338' },
  teal:    { bg: '#CFE8E5', fg: '#0F6B65' },
  red:     { bg: '#FBC9C0', fg: '#9A2A1A' },
};
function Avatar({ name, color = 'amber', size = 32, theme }) {
  const initials = name.split(' ').slice(0, 2).map(s => s[0]).join('').toUpperCase();
  const c = AVATAR_COLORS[color] || AVATAR_COLORS.amber;
  return (
    <div style={{
      width: size, height: size, borderRadius: 999,
      background: c.bg, color: c.fg,
      display: 'inline-flex', alignItems: 'center', justifyContent: 'center',
      fontSize: size * 0.38, fontWeight: 600, letterSpacing: '-0.02em',
      flexShrink: 0,
      border: theme ? `1.5px solid ${theme.surfaceSolid}` : undefined,
    }}>
      {initials}
    </div>
  );
}

// ─────────────────────────────────────────────────────────────
// Icon — minimal stroked icon set
// ─────────────────────────────────────────────────────────────
function Icon({ name, size = 16, color = 'currentColor', strokeWidth = 1.6 }) {
  const props = { width: size, height: size, viewBox: '0 0 24 24', fill: 'none', stroke: color, strokeWidth, strokeLinecap: 'round', strokeLinejoin: 'round' };
  const paths = {
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
  };
  return <svg {...props}>{paths[name] || null}</svg>;
}

// ─────────────────────────────────────────────────────────────
// Logo
// ─────────────────────────────────────────────────────────────
function Logo({ theme, size = 28, mono = false }) {
  const c = mono ? theme.ink : theme.accent;
  return (
    <div style={{ display: 'inline-flex', alignItems: 'center', gap: 8 }}>
      <svg width={size} height={size} viewBox="0 0 32 32" fill="none">
        <rect x="2" y="2" width="28" height="28" rx="9" fill={c} />
        <path d="M10 20c0 1.5 1.5 2.5 3.5 2.5s3.5-.7 3.5-2.5c0-3-7-2-7-5 0-1.5 1.5-2.5 3.5-2.5s3.5 1 3.5 2.5"
          stroke="#fff" strokeWidth="1.8" strokeLinecap="round" fill="none" />
        <circle cx="22" cy="11" r="1.5" fill="#fff" />
      </svg>
      <span style={{ fontSize: size * 0.55, fontWeight: 600, color: theme.ink, letterSpacing: '-0.02em' }}>GrowthSI</span>
    </div>
  );
}

// ─────────────────────────────────────────────────────────────
// SIDEBAR
// ─────────────────────────────────────────────────────────────
const NAV_ITEMS = [
  { id: 'dashboard', label: 'Dashboard', icon: 'dashboard', module: 'M5' },
  { id: 'contexto', label: 'Contexto I/E', icon: 'layers', module: 'M1' },
  { id: 'alcance', label: 'Alcance SGSI', icon: 'target', module: 'M1' },
  { id: 'documentos', label: 'Documentos', icon: 'doc', module: 'M2' },
  { id: 'riesgos', label: 'Riesgos', icon: 'alert', module: 'M3' },
  { id: 'soa', label: 'SoA — Anexo A', icon: 'shield', module: 'M3' },
  { id: 'auditorias', label: 'Auditorías', icon: 'clipboard', module: 'M4' },
  { id: 'nc', label: 'No Conformidades', icon: 'flag', module: 'M4' },
  { id: 'usuarios', label: 'Usuarios', icon: 'users', module: 'M6' },
];

function Sidebar({ theme, current, onNav, mode = 'full', tenant, org, onAIToggle }) {
  const _org = org || (window.SGSI_DATA && window.SGSI_DATA.organizacion) || {};
  const _name = _org.nombre_organizacion || (tenant && (tenant.nombre || tenant.name)) || '';
  const _sector = _org.sector || (tenant && tenant.sector) || '';
  const _emp = _org.numero_colaboradores || (tenant && tenant.employees) || '';
  const isIcon = mode === 'icon';
  const isCollapsed = mode === 'collapsed';
  const w = isIcon ? 64 : (isCollapsed ? 200 : 248);

  return (
    <aside style={{
      width: w,
      flexShrink: 0,
      padding: 14,
      display: 'flex', flexDirection: 'column',
      transition: 'width .2s',
    }}>
      <Card theme={theme} padding={0} style={{
        flex: 1, display: 'flex', flexDirection: 'column',
        padding: isIcon ? 10 : 14,
      }}>
        {/* Brand */}
        <div style={{ padding: isIcon ? '4px 0 18px' : '4px 6px 18px', display: 'flex', justifyContent: isIcon ? 'center' : 'flex-start' }}>
          {isIcon ? <Logo theme={theme} size={28} /> : <Logo theme={theme} size={28} />}
        </div>

        {/* Tenant card */}
        {!isIcon && (
          <div style={{
            padding: 10, marginBottom: 14,
            borderRadius: theme.r.md,
            background: theme.accentSoft,
            border: `1px solid ${theme.borderStrong}`,
          }}>
            <div style={{ fontSize: 10, fontWeight: 600, color: theme.accentDeep, letterSpacing: '0.08em', textTransform: 'uppercase', marginBottom: 4 }}>Empresa</div>
            <div style={{ fontSize: 13.5, fontWeight: 600, color: theme.ink, letterSpacing: '-0.01em' }}>{_name}</div>
            <div style={{ fontSize: 11, color: theme.inkMuted, marginTop: 2 }}>{_sector}{_emp ? ` · ${_emp} colab.` : ''}</div>
          </div>
        )}

        {!isIcon && (
          <div style={{ fontSize: 10, fontWeight: 600, color: theme.inkMuted, letterSpacing: '0.08em', textTransform: 'uppercase', padding: '0 8px 8px' }}>Módulos</div>
        )}

        {/* Nav items */}
        <nav style={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
          {NAV_ITEMS.map(item => {
            const active = current === item.id;
            return (
              <button key={item.id} onClick={() => onNav(item.id)}
                title={isIcon ? item.label : undefined}
                style={{
                  display: 'flex', alignItems: 'center',
                  gap: 10,
                  height: 38,
                  padding: isIcon ? 0 : '0 12px',
                  justifyContent: isIcon ? 'center' : 'flex-start',
                  borderRadius: theme.r.md,
                  border: 'none',
                  background: active ? theme.surfaceSolid : 'transparent',
                  color: active ? theme.ink : theme.inkSoft,
                  cursor: 'pointer',
                  fontSize: 13,
                  fontWeight: active ? 600 : 500,
                  fontFamily: 'inherit',
                  letterSpacing: '-0.005em',
                  position: 'relative',
                  textAlign: 'left',
                  transition: 'background .15s',
                  boxShadow: active ? (theme.isDark ? '0 1px 0 rgba(255,255,255,0.04) inset, 0 2px 8px rgba(0,0,0,0.25)' : '0 1px 0 rgba(255,255,255,0.6) inset, 0 2px 8px rgba(60,30,10,0.05)') : 'none',
                }}
                onMouseEnter={e => { if (!active) e.currentTarget.style.background = theme.isDark ? 'rgba(255,255,255,0.04)' : 'rgba(0,0,0,0.03)'; }}
                onMouseLeave={e => { if (!active) e.currentTarget.style.background = 'transparent'; }}
              >
                <Icon name={item.icon} size={17} color={active ? theme.accent : theme.inkSoft} />
                {!isIcon && (
                  <>
                    <span style={{ flex: 1 }}>{item.label}</span>
                  </>
                )}
              </button>
            );
          })}
        </nav>

        <div style={{ flex: 1 }} />
      </Card>
    </aside>
  );
}

// ─────────────────────────────────────────────────────────────
// HEADER — search, breadcrumb, notif, user
// ─────────────────────────────────────────────────────────────
function Header({ theme, title, subtitle, breadcrumb, user, actions }) {
  return (
    <div style={{
      display: 'flex', alignItems: 'center', gap: 14,
      padding: '14px 14px 0 0',
    }}>
      <Card theme={theme} padding={0} style={{ flex: 1, padding: '12px 18px', display: 'flex', alignItems: 'center', gap: 16 }}>
        <div style={{ flex: 1, minWidth: 0 }}>
          {breadcrumb && (
            <div style={{ fontSize: 11, color: theme.inkMuted, marginBottom: 2, letterSpacing: '0.02em' }}>{breadcrumb}</div>
          )}
          <div style={{ fontSize: 19, fontWeight: 600, color: theme.ink, letterSpacing: '-0.02em', lineHeight: 1.15 }}>{title}</div>
          {subtitle && <div style={{ fontSize: 12, color: theme.inkMuted, marginTop: 2 }}>{subtitle}</div>}
        </div>

        {actions}

        <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
          <button style={{
            width: 36, height: 36, borderRadius: 999,
            border: `1px solid ${theme.border}`,
            background: theme.isDark ? 'rgba(0,0,0,0.25)' : 'rgba(255,255,255,0.6)',
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            cursor: 'pointer', position: 'relative',
          }}>
            <Icon name="bell" size={16} color={theme.inkSoft} />
            <span style={{ position: 'absolute', top: 8, right: 9, width: 7, height: 7, borderRadius: 999, background: theme.danger, border: `1.5px solid ${theme.surfaceSolid}` }} />
          </button>
          <div style={{ display: 'flex', alignItems: 'center', gap: 10, paddingLeft: 8, borderLeft: `1px solid ${theme.border}` }}>
            <div style={{ textAlign: 'right' }}>
              <div style={{ fontSize: 12, fontWeight: 600, color: theme.ink, lineHeight: 1.2 }}>{user.name}</div>
              <div style={{ fontSize: 10.5, color: theme.inkMuted }}>{user.role}</div>
            </div>
            <Avatar name={user.name} color="amber" size={36} />
          </div>
        </div>
      </Card>
    </div>
  );
}

// ─────────────────────────────────────────────────────────────
// SectionHeader — consistent screen titles
// ─────────────────────────────────────────────────────────────
function SectionHeader({ theme, title, subtitle, actions }) {
  return (
    <div style={{ display: 'flex', alignItems: 'flex-end', justifyContent: 'space-between', marginBottom: 14, gap: 16 }}>
      <div>
        <div style={{ fontSize: 16, fontWeight: 600, color: theme.ink, letterSpacing: '-0.01em' }}>{title}</div>
        {subtitle && <div style={{ fontSize: 12, color: theme.inkMuted, marginTop: 3 }}>{subtitle}</div>}
      </div>
      {actions && <div style={{ display: 'flex', gap: 8, alignItems: 'center' }}>{actions}</div>}
    </div>
  );
}

// ─────────────────────────────────────────────────────────────
// KPI Card with mini sparkline
// ─────────────────────────────────────────────────────────────
function Sparkline({ values, color, width = 90, height = 32, area = true }) {
  const min = Math.min(...values), max = Math.max(...values);
  const range = max - min || 1;
  const pts = values.map((v, i) => [
    (i / (values.length - 1)) * width,
    height - ((v - min) / range) * (height - 4) - 2,
  ]);
  const path = pts.map((p, i) => (i === 0 ? `M${p[0]},${p[1]}` : `L${p[0]},${p[1]}`)).join(' ');
  const areaPath = `${path} L${width},${height} L0,${height} Z`;
  return (
    <svg width={width} height={height}>
      {area && <path d={areaPath} fill={color} fillOpacity={0.15} />}
      <path d={path} stroke={color} strokeWidth={1.8} fill="none" strokeLinecap="round" strokeLinejoin="round" />
      <circle cx={pts[pts.length - 1][0]} cy={pts[pts.length - 1][1]} r={2.5} fill={color} />
    </svg>
  );
}

function KPICard({ theme, label, value, sub, trend, sparkValues, sparkColor, icon, accentBg }) {
  return (
    <Card theme={theme} style={{ position: 'relative', overflow: 'hidden' }}>
      <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', gap: 10 }}>
        <div style={{ minWidth: 0, flex: 1 }}>
          <div style={{ fontSize: 10.5, fontWeight: 600, color: theme.inkMuted, letterSpacing: '0.08em', textTransform: 'uppercase', marginBottom: 8 }}>{label}</div>
          <div style={{ fontSize: 28, fontWeight: 600, color: theme.ink, letterSpacing: '-0.03em', lineHeight: 1, fontVariantNumeric: 'tabular-nums' }}>{value}</div>
          {sub && (
            <div style={{ fontSize: 11.5, color: theme.inkMuted, marginTop: 6, display: 'flex', alignItems: 'center', gap: 6 }}>
              {trend && (
                <span style={{ color: trend > 0 ? theme.success : theme.danger, fontWeight: 600 }}>
                  {trend > 0 ? '↑' : '↓'} {Math.abs(trend)}%
                </span>
              )}
              {sub}
            </div>
          )}
        </div>
        {sparkValues && <Sparkline values={sparkValues} color={sparkColor || theme.accent} />}
        {icon && (
          <div style={{
            width: 38, height: 38, borderRadius: 999,
            background: accentBg || theme.accentSoft,
            display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0,
          }}>
            <Icon name={icon} size={17} color={theme.accentDeep} />
          </div>
        )}
      </div>
    </Card>
  );
}

// ─────────────────────────────────────────────────────────────
// Modal
// ─────────────────────────────────────────────────────────────
function Modal({ open, onClose, theme, title, subtitle, children, width = 560, footer }) {
  if (!open) return null;
  return (
    <div style={{
      position: 'absolute', inset: 0, zIndex: 100,
      background: 'rgba(20, 12, 6, 0.45)',
      backdropFilter: 'blur(6px)',
      WebkitBackdropFilter: 'blur(6px)',
      display: 'flex', alignItems: 'center', justifyContent: 'center',
      padding: 24,
      animation: 'fadeIn .15s',
    }} onClick={onClose}>
      <div style={{
        width, maxWidth: '100%', maxHeight: '90%',
        background: theme.surfaceSolid,
        borderRadius: theme.r.xl,
        border: `1px solid ${theme.borderStrong}`,
        boxShadow: '0 24px 80px rgba(20, 12, 6, 0.5)',
        display: 'flex', flexDirection: 'column',
        overflow: 'hidden',
      }} onClick={e => e.stopPropagation()}>
        <div style={{
          padding: '16px 20px',
          display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between',
          borderBottom: `1px solid ${theme.border}`,
        }}>
          <div>
            <div style={{ fontSize: 15, fontWeight: 600, color: theme.ink, letterSpacing: '-0.01em' }}>{title}</div>
            {subtitle && <div style={{ fontSize: 12, color: theme.inkMuted, marginTop: 2 }}>{subtitle}</div>}
          </div>
          <button onClick={onClose} style={{
            width: 28, height: 28, borderRadius: 8,
            border: 'none', background: 'transparent',
            color: theme.inkMuted, cursor: 'pointer',
            display: 'flex', alignItems: 'center', justifyContent: 'center',
          }}>
            <Icon name="x" size={16} />
          </button>
        </div>
        <div style={{ flex: 1, overflow: 'auto', padding: 20 }}>{children}</div>
        {footer && (
          <div style={{ padding: '12px 20px', borderTop: `1px solid ${theme.border}`, display: 'flex', justifyContent: 'flex-end', gap: 8 }}>
            {footer}
          </div>
        )}
      </div>
    </div>
  );
}

// Side panel (Drawer)
function SidePanel({ open, onClose, theme, title, subtitle, children, footer, width = 480 }) {
  if (!open) return null;
  return (
    <div style={{
      position: 'absolute', inset: 0, zIndex: 100,
      background: 'rgba(20, 12, 6, 0.35)',
      backdropFilter: 'blur(4px)',
      WebkitBackdropFilter: 'blur(4px)',
      animation: 'fadeIn .15s',
    }} onClick={onClose}>
      <div style={{
        position: 'absolute', top: 0, right: 0, bottom: 0,
        width, maxWidth: '90%',
        background: theme.surfaceSolid,
        borderLeft: `1px solid ${theme.borderStrong}`,
        boxShadow: '-12px 0 40px rgba(20, 12, 6, 0.25)',
        display: 'flex', flexDirection: 'column',
        animation: 'slideL .2s',
      }} onClick={e => e.stopPropagation()}>
        <div style={{
          padding: '16px 20px',
          display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between',
          borderBottom: `1px solid ${theme.border}`,
        }}>
          <div>
            <div style={{ fontSize: 15, fontWeight: 600, color: theme.ink, letterSpacing: '-0.01em' }}>{title}</div>
            {subtitle && <div style={{ fontSize: 12, color: theme.inkMuted, marginTop: 2 }}>{subtitle}</div>}
          </div>
          <button onClick={onClose} style={{
            width: 28, height: 28, borderRadius: 8,
            border: 'none', background: 'transparent',
            color: theme.inkMuted, cursor: 'pointer',
            display: 'flex', alignItems: 'center', justifyContent: 'center',
          }}>
            <Icon name="x" size={16} />
          </button>
        </div>
        <div style={{ flex: 1, overflow: 'auto', padding: 20 }}>{children}</div>
        {footer && (
          <div style={{ padding: '12px 20px', borderTop: `1px solid ${theme.border}`, display: 'flex', justifyContent: 'flex-end', gap: 8 }}>
            {footer}
          </div>
        )}
      </div>
    </div>
  );
}

// ─────────────────────────────────────────────────────────────
// Tabs
// ─────────────────────────────────────────────────────────────
function Tabs({ theme, items, value, onChange }) {
  return (
    <div style={{
      display: 'inline-flex',
      padding: 4,
      background: theme.isDark ? 'rgba(0,0,0,0.3)' : 'rgba(0,0,0,0.04)',
      borderRadius: theme.r.md,
      gap: 2,
    }}>
      {items.map(it => (
        <button key={it.id} onClick={() => onChange(it.id)} style={{
          height: 28, padding: '0 14px',
          borderRadius: 8, border: 'none',
          background: value === it.id ? theme.surfaceSolid : 'transparent',
          color: value === it.id ? theme.ink : theme.inkMuted,
          fontSize: 12, fontWeight: value === it.id ? 600 : 500,
          cursor: 'pointer', fontFamily: 'inherit',
          boxShadow: value === it.id ? '0 1px 2px rgba(0,0,0,0.06)' : 'none',
          letterSpacing: '-0.005em',
          display: 'inline-flex', alignItems: 'center', gap: 6,
        }}>
          {it.icon && <Icon name={it.icon} size={13} color={value === it.id ? theme.accent : 'currentColor'} />}
          {it.label}
          {it.count != null && (
            <span style={{
              fontSize: 10, padding: '1px 6px', borderRadius: 999,
              background: value === it.id ? theme.accentSoft : (theme.isDark ? 'rgba(255,255,255,0.08)' : 'rgba(0,0,0,0.06)'),
              color: value === it.id ? theme.accentDeep : theme.inkMuted,
              fontVariantNumeric: 'tabular-nums', fontWeight: 600,
            }}>{it.count}</span>
          )}
        </button>
      ))}
    </div>
  );
}

// ─────────────────────────────────────────────────────────────
// AI Sparkle Button
// ─────────────────────────────────────────────────────────────
function AIButton({ theme, label = 'Generar con IA', size = 'sm', onClick }) {
  const sz = size === 'sm' ? { h: 26, fs: 11.5, ic: 12, px: 9 } : { h: 32, fs: 12.5, ic: 14, px: 12 };
  return (
    <button onClick={onClick} style={{
      height: sz.h, padding: `0 ${sz.px}px`,
      borderRadius: 999, border: `1px solid ${theme.borderStrong}`,
      background: `linear-gradient(135deg, ${theme.accent}18, ${theme.accent}08)`,
      color: theme.accentDeep, fontSize: sz.fs, fontWeight: 500,
      cursor: 'pointer', fontFamily: 'inherit',
      display: 'inline-flex', alignItems: 'center', gap: 5,
      letterSpacing: '-0.005em',
      transition: 'all .15s',
    }}
      onMouseEnter={e => { e.currentTarget.style.background = `linear-gradient(135deg, ${theme.accent}28, ${theme.accent}12)`; }}
      onMouseLeave={e => { e.currentTarget.style.background = `linear-gradient(135deg, ${theme.accent}18, ${theme.accent}08)`; }}
    >
      <Icon name="sparkle" size={sz.ic} color={theme.accent} />
      {label}
    </button>
  );
}

function Field2({ theme, label, v }) {
  return (
    <div>
      <div style={{ fontSize: 10.5, fontWeight: 600, color: theme.inkMuted, letterSpacing: '0.05em', textTransform: 'uppercase', marginBottom: 4 }}>{label}</div>
      <div style={{ fontSize: 13, color: theme.ink }}>{v}</div>
    </div>
  );
}

// Export everything to window
Object.assign(window, {
  PALETTES, DARK_PALETTES, DENSITY,
  useTheme, AuroraBg,
  Card, Button, Badge, Avatar, Icon, Logo, AVATAR_COLORS,
  Sidebar, Header, SectionHeader, KPICard, Sparkline, Modal, SidePanel, Tabs, AIButton,
  Field2,
  NAV_ITEMS,
});
