/**
 * Card — DR. MAYDAY Design System
 * Uses .base-card from uber-base-tokens.css + variant modifier classes.
 */

const PADDING = {
  none: '0',
  sm: 'var(--space-3, 12px)',
  md: 'var(--space-5, 20px)',
  lg: 'var(--space-6, 24px)',
};

const VARIANT_STYLES = {
  default: {},
  elevated: {
    boxShadow: 'var(--shadow-md, 0 4px 6px -1px rgba(0,0,0,.10), 0 2px 4px -2px rgba(0,0,0,.10))',
  },
  flat: {
    boxShadow: 'none',
    backgroundColor: 'var(--color-neutral-50, #F8FAFC)',
  },
  outlined: {
    boxShadow: 'none',
    border: '1px solid var(--color-border-default, #E2E8F0)',
  },
};

export function Card({
  variant = 'default',
  padding = 'md',
  className = '',
  children,
  header,
  footer,
  title,
  subtitle,
  style = {},
  ...rest
}) {
  const paddingValue = PADDING[padding] ?? PADDING.md;
  const variantStyle = VARIANT_STYLES[variant] || {};

  return (
    <div
      className={`base-card card card--${variant} ${className}`}
      style={{ padding: paddingValue, ...variantStyle, ...style }}
      {...rest}
    >
      {/* Optional header slot */}
      {(header || title) && (
        <div
          className="card__header"
          style={{
            marginBottom: 'var(--space-4, 16px)',
            paddingBottom: 'var(--space-3, 12px)',
            borderBottom: '1px solid var(--color-border-default, #E2E8F0)',
          }}
        >
          {header ?? (
            <>
              {title && (
                <p
                  className="card__title"
                  style={{
                    margin: 0,
                    fontWeight: 600,
                    fontSize: '1rem',
                    color: 'var(--color-text-primary, #0F172A)',
                  }}
                >
                  {title}
                </p>
              )}
              {subtitle && (
                <p
                  className="card__subtitle"
                  style={{
                    margin: '2px 0 0',
                    fontSize: '0.875rem',
                    color: 'var(--color-text-muted, #64748B)',
                  }}
                >
                  {subtitle}
                </p>
              )}
            </>
          )}
        </div>
      )}

      {/* Body */}
      <div className="card__body">{children}</div>

      {/* Optional footer slot */}
      {footer && (
        <div
          className="card__footer"
          style={{
            marginTop: 'var(--space-4, 16px)',
            paddingTop: 'var(--space-3, 12px)',
            borderTop: '1px solid var(--color-border-default, #E2E8F0)',
          }}
        >
          {footer}
        </div>
      )}
    </div>
  );
}

export default Card;
