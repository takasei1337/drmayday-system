/**
 * Avatar — DR. MAYDAY Design System
 * Shows image if src provided, otherwise initials with consistent hash-based color.
 */

const SIZES = {
  xs: 24,
  sm: 32,
  md: 40,
  lg: 48,
  xl: 64,
};

// Deterministic palette using CSS token vars
const AVATAR_COLORS = [
  { bg: 'var(--color-primary-100, #DCE3F2)', fg: 'var(--color-primary-700, #071947)' },
  { bg: 'var(--color-success-bg, #ECFDF3)', fg: 'var(--color-success-fg, #15803D)' },
  { bg: 'var(--color-warning-bg, #FFFBEB)', fg: 'var(--color-warning-fg, #B45309)' },
  { bg: 'var(--color-info-bg, #E0F2FE)', fg: 'var(--color-info-fg, #0369A1)' },
  { bg: 'var(--color-primary-200, #BAC8E5)', fg: 'var(--color-primary-800, #051333)' },
  { bg: 'var(--color-neutral-200, #E2E8F0)', fg: 'var(--color-neutral-800, #1E293B)' },
];

function hashName(name = '') {
  let h = 0;
  for (let i = 0; i < name.length; i++) {
    h = (h * 31 + name.charCodeAt(i)) >>> 0;
  }
  return h;
}

function getInitials(name = '') {
  const parts = name.trim().split(/\s+/).filter(Boolean);
  if (!parts.length) return '?';
  if (parts.length === 1) return parts[0][0].toUpperCase();
  return (parts[0][0] + parts[parts.length - 1][0]).toUpperCase();
}

export function Avatar({ src, name = '', size = 'md', className = '' }) {
  const px = SIZES[size] || SIZES.md;
  const initials = getInitials(name);
  const palette = AVATAR_COLORS[hashName(name) % AVATAR_COLORS.length];
  const fontSize = Math.max(12, Math.round(px * 0.38));

  const baseStyle = {
    width: `${px}px`,
    height: `${px}px`,
    borderRadius: '50%',
    flexShrink: 0,
    display: 'inline-flex',
    alignItems: 'center',
    justifyContent: 'center',
    overflow: 'hidden',
    userSelect: 'none',
  };

  if (src) {
    return (
      <img
        src={src}
        alt={name || 'avatar'}
        className={`avatar avatar--${size} ${className}`}
        style={{ ...baseStyle, objectFit: 'cover' }}
        onError={(e) => {
          e.currentTarget.style.display = 'none';
        }}
      />
    );
  }

  return (
    <span
      className={`avatar avatar--${size} ${className}`}
      style={{
        ...baseStyle,
        backgroundColor: palette.bg,
        color: palette.fg,
        fontSize: `${fontSize}px`,
        fontWeight: 600,
        letterSpacing: '0.02em',
      }}
      aria-label={name || 'avatar'}
      title={name}
    >
      {initials}
    </span>
  );
}

export default Avatar;
