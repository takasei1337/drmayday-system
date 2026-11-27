import { useId } from 'react';

const selectStyles = `
.base-select-wrapper {
  display: flex;
  flex-direction: column;
  gap: 6px;
  width: 100%;
}
.base-select-label {
  font-size: 13px;
  font-weight: 600;
  color: var(--color-text-primary);
  display: flex;
  align-items: center;
  gap: 3px;
}
.base-select-label .required-star {
  color: var(--color-error-fg);
}
.base-select-field-wrap {
  position: relative;
  display: block;
  width: 100%;
}
.base-select {
  width: 100%;
  min-width: 0;
  height: var(--input-height, 40px);
  padding: 0 36px 0 12px;
  font-size: 14px;
  font-family: inherit;
  color: var(--color-text-primary);
  background-color: var(--color-bg-surface);
  background-image: none !important;
  border: 1px solid var(--color-border-default);
  border-radius: var(--radius-input, 6px);
  outline: none;
  -webkit-appearance: none !important;
  -moz-appearance: none !important;
  appearance: none !important;
  cursor: pointer;
  transition: border-color 0.15s ease, box-shadow 0.15s ease;
  box-sizing: border-box;
}
.base-select::-ms-expand {
  display: none !important;
}
.base-select::picker-icon {
  display: none !important;
  content: none !important;
}
.base-select:focus {
  border-color: var(--color-primary-600);
  box-shadow: 0 0 0 1px var(--color-primary-600);
}
.base-select.has-error {
  border-color: var(--color-error-fg);
}
.base-select.has-error:focus {
  box-shadow: 0 0 0 1px var(--color-error-fg);
}
.base-select:disabled {
  opacity: 0.5;
  cursor: not-allowed;
  background: var(--color-neutral-100);
}
.base-select-chevron {
  position: absolute;
  right: 12px;
  top: 50%;
  transform: translateY(-50%);
  display: flex;
  align-items: center;
  justify-content: center;
  pointer-events: none;
  color: var(--color-icon-muted);
  font-size: 16px;
}
.base-select-helper {
  font-size: 12px;
  color: var(--color-text-muted);
  margin-top: 2px;
}
.base-select-error {
  font-size: 12px;
  color: var(--color-error-fg);
  display: flex;
  align-items: center;
  gap: 4px;
  margin-top: 2px;
}
`;

let _selectStylesInjected = false;
function injectSelectStyles() {
  if (_selectStylesInjected || typeof document === 'undefined') return;
  _selectStylesInjected = true;
  const style = document.createElement('style');
  style.textContent = selectStyles;
  document.head.appendChild(style);
}

export function Select({
  label,
  options = [],
  value,
  onChange,
  placeholder = 'Chọn một mục...',
  error,
  disabled = false,
  helperText,
  required = false,
  id,
  name,
  className = '',
  ...rest
}) {
  injectSelectStyles();
  const autoId = useId();
  const fieldId = id || autoId;

  return (
    <div className="base-select-wrapper">
      {label && (
        <label htmlFor={fieldId} className="base-select-label">
          {label}
          {required && <span className="required-star">*</span>}
        </label>
      )}

      <div className="base-select-field-wrap">
        <select
          id={fieldId}
          name={name}
          value={value}
          onChange={onChange}
          disabled={disabled}
          required={required}
          className={`base-select ${error ? 'has-error' : ''} ${className}`}
          aria-invalid={!!error}
          aria-describedby={error ? `${fieldId}-error` : helperText ? `${fieldId}-helper` : undefined}
          {...rest}
        >
          {placeholder && (
            <option value="" disabled>
              {placeholder}
            </option>
          )}
          {options.map((opt, i) => {
            const val = typeof opt === 'object' ? opt.value : opt;
            const text = typeof opt === 'object' ? opt.label : opt;
            const optDisabled = typeof opt === 'object' ? opt.disabled : false;
            return (
              <option key={`${val}-${i}`} value={val} disabled={optDisabled}>
                {text}
              </option>
            );
          })}
        </select>
        <span className="base-select-chevron">
          <span className="isax icon-arrow-down-1"></span>
        </span>
      </div>

      {error && (
        <span className="base-select-error" id={`${fieldId}-error`} role="alert">
          <span className="isax icon-info-circle" style={{ fontSize: 13 }}></span>
          {error}
        </span>
      )}
      {!error && helperText && (
        <span className="base-select-helper" id={`${fieldId}-helper`}>
          {helperText}
        </span>
      )}
    </div>
  );
}

export default Select;
