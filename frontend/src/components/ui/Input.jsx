import { useState, useId } from 'react';

const inputStyles = `
.base-input-wrapper {
  display: flex;
  flex-direction: column;
  gap: 6px;
  width: 100%;
}
.base-input-label {
  font-size: 13px;
  font-weight: 600;
  color: var(--color-text-primary);
  display: flex;
  align-items: center;
  gap: 3px;
}
.base-input-label .required-star {
  color: var(--color-error-fg);
}
.base-input-field-wrap {
  position: relative;
  display: flex;
  align-items: center;
}
.base-input {
  width: 100%;
  height: 40px;
  padding: 0 12px;
  font-size: 14px;
  font-family: inherit;
  color: var(--color-text-primary);
  background: var(--color-bg-surface);
  border: 1px solid var(--color-border-default);
  border-radius: var(--radius-input, 6px);
  outline: none;
  transition: border-color 0.2s ease, box-shadow 0.2s ease;
  box-sizing: border-box;
}
.base-input::-webkit-search-cancel-button,
.base-input::-webkit-search-decoration,
.base-input::-webkit-search-results-button,
.base-input::-webkit-search-results-decoration {
  -webkit-appearance: none !important;
  appearance: none !important;
  display: none !important;
}
.base-input::placeholder {
  color: var(--color-text-muted);
  font-weight: 400;
}
.base-input:focus {
  border-color: var(--color-primary-600);
  box-shadow: 0 0 0 1px var(--color-primary-600);
}
.base-input.has-error {
  border-color: var(--color-error-fg);
}
.base-input.has-error:focus {
  box-shadow: 0 0 0 1px var(--color-error-fg);
}
.base-input:disabled {
  opacity: 0.5;
  cursor: not-allowed;
  background: var(--color-neutral-100);
}
.base-input[readonly] {
  background: var(--color-neutral-50);
  cursor: default;
}
.base-input.has-leading-icon {
  padding-left: 38px;
}
.base-input.has-trailing-icon {
  padding-right: 38px;
}
.base-input-icon {
  position: absolute;
  display: flex;
  align-items: center;
  justify-content: center;
  width: 38px;
  height: 100%;
  color: var(--color-icon-muted);
  font-size: 17px;
  pointer-events: none;
  user-select: none;
}
.base-input-icon.leading { left: 0; }
.base-input-icon.trailing { right: 0; pointer-events: auto; cursor: pointer; }
.base-input-icon.trailing.clickable:hover { color: var(--color-text-primary); }
.base-input-clear {
  position: absolute;
  right: 10px;
  display: flex;
  align-items: center;
  justify-content: center;
  width: 20px;
  height: 20px;
  background: transparent;
  color: var(--color-icon-muted, #94A3B8);
  font-size: 16px;
  cursor: pointer;
  border: none;
  outline: none;
  padding: 0;
  transition: color 0.15s ease;
}
.base-input-clear:hover {
  color: var(--color-text-primary, #0F172A);
}
.base-input-helper {
  font-size: 12px;
  color: var(--color-text-muted);
  margin-top: 2px;
}
.base-input-error {
  font-size: 12px;
  color: var(--color-error-fg);
  display: flex;
  align-items: center;
  gap: 4px;
  margin-top: 2px;
}
`;

let _inputStylesInjected = false;
function injectInputStyles() {
  if (_inputStylesInjected || typeof document === 'undefined') return;
  _inputStylesInjected = true;
  const style = document.createElement('style');
  style.textContent = inputStyles;
  document.head.appendChild(style);
}

export default function Input({
  type = 'text',
  label,
  placeholder,
  value,
  onChange,
  helperText,
  error,
  disabled,
  readOnly,
  leadingIcon,
  trailingIcon,
  onTrailingIconClick,
  required,
  id,
  name,
  className = '',
  ...rest
}) {
  injectInputStyles();
  const [showPassword, setShowPassword] = useState(false);
  const autoId = useId();
  const fieldId = id || autoId;

  const isPassword = type === 'password';
  const isSearch = type === 'search';

  const resolvedType = isPassword ? (showPassword ? 'text' : 'password') : (isSearch ? 'text' : type);

  const hasLeading = !!(leadingIcon || isSearch);
  const hasTrailing = !!(trailingIcon || isPassword || (isSearch && value));

  const inputClasses = [
    'base-input',
    hasLeading ? 'has-leading-icon' : '',
    hasTrailing ? 'has-trailing-icon' : '',
    error ? 'has-error' : '',
    className,
  ].filter(Boolean).join(' ');

  return (
    <div className="base-input-wrapper">
      {label && (
        <label htmlFor={fieldId} className="base-input-label">
          {label}
          {required && <span className="required-star">*</span>}
        </label>
      )}
      <div className="base-input-field-wrap">
        {/* Leading icon */}
        {isSearch && (
          <span className="base-input-icon leading">
            <span className="isax icon-search-normal"></span>
          </span>
        )}
        {!isSearch && leadingIcon && (
          <span className="base-input-icon leading">
            <span className={`isax icon-${leadingIcon}`}></span>
          </span>
        )}

        <input
          id={fieldId}
          name={name}
          type={resolvedType}
          inputMode={isSearch ? 'search' : rest.inputMode}
          value={value}
          onChange={onChange}
          placeholder={placeholder}
          disabled={disabled}
          readOnly={readOnly}
          required={required}
          className={inputClasses}
          aria-invalid={!!error}
          aria-describedby={error ? `${fieldId}-error` : helperText ? `${fieldId}-helper` : undefined}
          {...rest}
        />

        {/* Search clear button — single clean SVG cross (no circle, no browser native button) */}
        {isSearch && value && (
          <button
            type="button"
            className="base-input-clear"
            onClick={() => onChange && onChange({ target: { value: '' } })}
            aria-label="Xóa tìm kiếm"
          >
            <svg width="14" height="14" viewBox="0 0 14 14" fill="none" xmlns="http://www.w3.org/2000/svg">
              <path d="M10.5 3.5L3.5 10.5M3.5 3.5L10.5 10.5" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round"/>
            </svg>
          </button>
        )}

        {/* Password toggle */}
        {isPassword && (
          <span
            className="base-input-icon trailing clickable"
            onClick={() => setShowPassword(p => !p)}
            role="button"
            aria-label={showPassword ? 'Ẩn mật khẩu' : 'Hiện mật khẩu'}
          >
            <span className={`isax icon-${showPassword ? 'eye-slash' : 'eye'}`}></span>
          </span>
        )}

        {/* Custom trailing icon */}
        {!isPassword && !isSearch && trailingIcon && (
          <span
            className={`base-input-icon trailing${onTrailingIconClick ? ' clickable' : ''}`}
            onClick={onTrailingIconClick}
            role={onTrailingIconClick ? 'button' : undefined}
          >
            <span className={`isax icon-${trailingIcon}`}></span>
          </span>
        )}
      </div>

      {error && (
        <span className="base-input-error" id={`${fieldId}-error`} role="alert">
          <span className="isax icon-info-circle" style={{ fontSize: 13 }}></span>
          {error}
        </span>
      )}
      {!error && helperText && (
        <span className="base-input-helper" id={`${fieldId}-helper`}>{helperText}</span>
      )}
    </div>
  );
}
