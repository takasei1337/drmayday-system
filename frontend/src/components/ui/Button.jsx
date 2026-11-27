/**
 * Button component — DR. MAYDAY Design System
 * Uses .base-btn-* classes from uber-base-tokens.css
 * No hardcoded hex colors.
 */

const variantClass = {
  primary: 'base-btn-primary',
  secondary: 'base-btn-secondary',
  tertiary: 'base-btn-ghost',
  ghost: 'base-btn-ghost',
  destructive: 'base-btn-danger',
};

const sizeClass = {
  sm: 'base-btn-sm',
  md: 'base-btn-md',
  lg: 'base-btn-lg',
};

const getIconClass = (icon) => {
  if (!icon) return '';
  if (icon.startsWith('isax')) return icon;
  if (icon.startsWith('icon-')) return `isax ${icon}`;
  return `isax icon-${icon}`;
};

const buttonStyles = `
@keyframes btn-spin {
  from { transform: rotate(0deg); }
  to   { transform: rotate(360deg); }
}
.base-btn-loading {
  pointer-events: none;
  opacity: 0.75;
}
.base-btn {
  border-radius: var(--radius-button, 6px) !important;
}
[data-density="patient"] .base-btn.base-btn-md:not(.base-btn-table-action) {
  min-height: 44px !important;
}
[data-density="patient"] .base-btn.base-btn-lg:not(.base-btn-table-action) {
  min-height: 48px !important;
}
.base-btn.base-btn-icon-only {
  padding: 0 !important;
  width: 36px;
  height: 36px;
  min-width: 36px;
  border-radius: var(--radius-button, 6px) !important;
  display: inline-flex;
  align-items: center;
  justify-content: center;
}
.base-btn.base-btn-circle {
  border-radius: 50% !important;
}
.base-btn.base-btn-icon-only .isax,
.base-btn.base-btn-icon-only [class^="isax"] {
  font-size: 16px;
  line-height: 1;
}
.base-btn.base-btn-icon-only.base-btn-sm {
  width: 32px;
  height: 32px;
  min-width: 32px;
  border-radius: 50% !important;
}
.base-btn.base-btn-icon-only.base-btn-sm .isax,
.base-btn.base-btn-icon-only.base-btn-sm [class^="isax"] {
  font-size: 15px;
  line-height: 1;
}
.base-btn.base-btn-icon-only.base-btn-lg {
  width: 42px;
  height: 42px;
  min-width: 42px;
  border-radius: 50% !important;
}
.base-btn.base-btn-table-action,
.base-btn-table-action {
  min-width: 104px;
  justify-content: center;
  text-align: center;
  white-space: nowrap;
}
.base-btn.base-btn-full-width {
  width: 100%;
}
.btn-label {
  display: inline;
}
`;

let _buttonStylesInjected = false;
function injectButtonStyles() {
  if (_buttonStylesInjected || typeof document === 'undefined') return;
  _buttonStylesInjected = true;
  const style = document.createElement('style');
  style.textContent = buttonStyles;
  document.head.appendChild(style);
}

export function Button({
  variant = 'primary',
  size = 'md',
  disabled = false,
  loading = false,
  leadingIcon,
  trailingIcon,
  iconOnly = false,
  tableAction = false,
  fullWidth = false,
  minWidth,
  onClick,
  type = 'button',
  className = '',
  style,
  children,
  ...rest
}) {
  injectButtonStyles();
  const isDisabled = disabled || loading;

  const resolvedSize = tableAction && size === 'md' ? 'sm' : size;

  const classes = [
    'base-btn',
    variantClass[variant] || 'base-btn-primary',
    sizeClass[resolvedSize] || 'base-btn-md',
    iconOnly ? 'base-btn-icon-only' : '',
    tableAction ? 'base-btn-table-action' : '',
    fullWidth ? 'base-btn-full-width w-full' : '',
    loading ? 'base-btn-loading' : '',
    className,
  ]
    .filter(Boolean)
    .join(' ');

  const mergedStyle = {
    ...(minWidth != null ? { minWidth: typeof minWidth === 'number' ? `${minWidth}px` : minWidth } : {}),
    ...style,
  };

  return (
    <button
      type={type}
      className={classes}
      style={Object.keys(mergedStyle).length > 0 ? mergedStyle : undefined}
      disabled={isDisabled}
      onClick={isDisabled ? undefined : onClick}
      aria-disabled={isDisabled}
      aria-busy={loading}
      {...rest}
    >
      {loading && (
        <span
          className="isax icon-refresh"
          style={{
            display: 'inline-flex',
            animation: 'btn-spin 0.8s linear infinite',
            fontSize: 'inherit',
          }}
          aria-hidden="true"
        />
      )}
      {!loading && leadingIcon && (
        <span className={getIconClass(leadingIcon)} aria-hidden="true" />
      )}
      {(!iconOnly || !leadingIcon) && children && <span className="btn-label">{children}</span>}
      {!loading && trailingIcon && (
        <span className={getIconClass(trailingIcon)} aria-hidden="true" />
      )}
    </button>
  );
}

export default Button;
