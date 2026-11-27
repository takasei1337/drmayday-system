/**
 * Badge & StatusBadge — DR. MAYDAY Design System
 * Colors use CSS token vars; inline style fallbacks use semantic token names.
 */

const STATUS_CONFIG = {
  active: {
    bg: 'var(--color-success-bg, #ECFDF3)',
    color: 'var(--color-success-fg, #15803D)',
    border: '#A7F3D0',
    label: 'Hoạt động',
  },
  inactive: {
    bg: 'var(--color-neutral-100, #F1F5F9)',
    color: 'var(--color-neutral-600, #475569)',
    border: '#E2E8F0',
    label: 'Không hoạt động',
  },
  pending: {
    bg: 'var(--color-warning-bg, #FFFBEB)',
    color: 'var(--color-warning-fg, #B45309)',
    border: '#FDE68A',
    label: 'Chờ xử lý',
  },
  in_progress: {
    bg: 'var(--color-info-bg, #E0F2FE)',
    color: 'var(--color-info-fg, #0369A1)',
    border: '#BAE6FD',
    label: 'Đang khám',
  },
  completed: {
    bg: 'var(--color-success-bg, #ECFDF3)',
    color: 'var(--color-success-fg, #15803D)',
    border: '#A7F3D0',
    label: 'Hoàn thành',
  },
  cancelled: {
    bg: 'var(--color-error-bg, #FEF2F2)',
    color: 'var(--color-error-fg, #DC2626)',
    border: '#FECACA',
    label: 'Đã hủy',
  },
  critical: {
    bg: 'var(--color-error-bg, #FEF2F2)',
    color: 'var(--color-error-fg, #DC2626)',
    border: '#FECACA',
    label: 'Khẩn cấp',
    pulse: true,
  },
  warning: {
    bg: 'var(--color-warning-bg, #FFFBEB)',
    color: 'var(--color-warning-fg, #B45309)',
    border: '#FDE68A',
    label: 'Cảnh báo',
  },
  info: {
    bg: 'var(--color-info-bg, #E0F2FE)',
    color: 'var(--color-info-fg, #0369A1)',
    border: '#BAE6FD',
    label: 'Thông tin',
  },
};

const SIZE_STYLES = {
  sm: { fontSize: '0.75rem', padding: '2px 8px', borderRadius: 'var(--radius-badge, 4px)' },
  md: { fontSize: '0.75rem', padding: '2px 8px', borderRadius: 'var(--radius-badge, 4px)' },
};

export function StatusBadge({ variant = 'info', label, dot = false, size = 'md', className = '' }) {
  const cfg = STATUS_CONFIG[variant] || STATUS_CONFIG.info;
  const displayLabel = label ?? cfg.label;
  const sizeStyle = SIZE_STYLES[size] || SIZE_STYLES.md;

  return (
    <>
      <span
        className={`status-badge status-badge--${variant} ${className}`}
        style={{
          display: 'inline-flex',
          alignItems: 'center',
          gap: '5px',
          fontWeight: 600,
          lineHeight: 1.4,
          whiteSpace: 'nowrap',
          backgroundColor: cfg.bg,
          color: cfg.color,
          border: `1px solid ${cfg.border || 'transparent'}`,
          ...sizeStyle,
          animation: cfg.pulse ? 'badge-pulse 1.5s ease-in-out infinite' : undefined,
        }}
        aria-label={displayLabel}
      >
        {dot && (
          <span
            style={{
              width: '6px',
              height: '6px',
              borderRadius: '50%',
              backgroundColor: 'currentColor',
              flexShrink: 0,
            }}
            aria-hidden="true"
          />
        )}
        {displayLabel}
      </span>

      <style>{`
        @keyframes badge-pulse {
          0%, 100% { opacity: 1; }
          50%       { opacity: 0.6; }
        }
      `}</style>
    </>
  );
}

export function Badge({ label, children, className = '', style = {} }) {
  return (
    <span
      className={`badge ${className}`}
      style={{
        display: 'inline-flex',
        alignItems: 'center',
        fontSize: '0.75rem',
        fontWeight: 500,
        padding: '2px 8px',
        borderRadius: 'var(--radius-badge, 4px)',
        backgroundColor: 'var(--color-neutral-100, #F1F5F9)',
        color: 'var(--color-text-secondary, #334155)',
        lineHeight: 1.5,
        ...style,
      }}
    >
      {label ?? children}
    </span>
  );
}

export default StatusBadge;
