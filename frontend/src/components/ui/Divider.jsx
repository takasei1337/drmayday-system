/**
 * Divider — DR. MAYDAY Design System
 * Horizontal or vertical separator with optional center label.
 */

const SPACING = {
  sm: 'var(--space-2, 8px)',
  md: 'var(--space-4, 16px)',
  lg: 'var(--space-6, 24px)',
};

export function Divider({ orientation = 'h', spacing = 'md', label, className = '' }) {
  const margin = SPACING[spacing] || SPACING.md;
  const color = 'var(--color-border-default, #E2E8F0)';

  if (orientation === 'v') {
    return (
      <span
        className={`divider divider--vertical ${className}`}
        aria-hidden="true"
        style={{
          display: 'inline-block',
          width: '1px',
          alignSelf: 'stretch',
          backgroundColor: color,
          marginLeft: margin,
          marginRight: margin,
          flexShrink: 0,
        }}
      />
    );
  }

  if (label) {
    return (
      <div
        className={`divider divider--labeled ${className}`}
        style={{
          display: 'flex',
          alignItems: 'center',
          gap: '12px',
          marginTop: margin,
          marginBottom: margin,
          color: 'var(--color-text-muted, #64748B)',
          fontSize: '0.8125rem',
        }}
        role="separator"
      >
        <span style={{ flex: 1, height: '1px', backgroundColor: color }} />
        <span>{label}</span>
        <span style={{ flex: 1, height: '1px', backgroundColor: color }} />
      </div>
    );
  }

  return (
    <hr
      className={`divider divider--horizontal ${className}`}
      aria-hidden="true"
      style={{
        border: 'none',
        borderTop: `1px solid ${color}`,
        marginTop: margin,
        marginBottom: margin,
      }}
    />
  );
}

export default Divider;
