import { useId } from 'react';

const datePickerStyles = `
.base-datepicker-wrapper {
  display: flex;
  flex-direction: column;
  gap: 6px;
  width: 100%;
}
.base-datepicker-label {
  font-size: 13px;
  font-weight: 600;
  color: var(--color-text-primary);
  display: flex;
  align-items: center;
  gap: 3px;
}
.base-datepicker-label .required-star {
  color: var(--color-error-fg);
}
.base-datepicker-field-wrap {
  position: relative;
  display: flex;
  align-items: center;
}
.base-datepicker {
  width: 100%;
  height: 40px;
  padding: 0 12px 0 38px;
  font-size: 14px;
  font-family: inherit;
  color: var(--color-text-primary);
  background: var(--color-bg-surface);
  border: 1px solid var(--color-border-default);
  border-radius: var(--radius-input, 6px);
  outline: none;
  transition: border-color 0.15s ease, box-shadow 0.15s ease;
  box-sizing: border-box;
}
.base-datepicker:focus {
  border-color: var(--color-primary-600);
  box-shadow: 0 0 0 1px var(--color-primary-600);
}
.base-datepicker.has-error {
  border-color: var(--color-error-fg);
}
.base-datepicker.has-error:focus {
  box-shadow: 0 0 0 1px var(--color-error-fg);
}
.base-datepicker:disabled {
  opacity: 0.5;
  cursor: not-allowed;
  background: var(--color-neutral-100);
}
.base-datepicker-icon {
  position: absolute;
  left: 12px;
  display: flex;
  align-items: center;
  pointer-events: none;
  color: var(--color-icon-muted);
  font-size: 16px;
}
.base-datepicker-helper {
  font-size: 12px;
  color: var(--color-text-muted);
  margin-top: 2px;
}
.base-datepicker-error {
  font-size: 12px;
  color: var(--color-error-fg);
  display: flex;
  align-items: center;
  gap: 4px;
  margin-top: 2px;
}
`;

let _datePickerStylesInjected = false;
function injectDatePickerStyles() {
  if (_datePickerStylesInjected || typeof document === 'undefined') return;
  _datePickerStylesInjected = true;
  const style = document.createElement('style');
  style.textContent = datePickerStyles;
  document.head.appendChild(style);
}

export function DatePicker({
  label,
  value,
  onChange,
  error,
  helperText,
  disabled = false,
  readOnly = false,
  required = false,
  id,
  name,
  min,
  max,
  className = '',
  ...rest
}) {
  injectDatePickerStyles();
  const autoId = useId();
  const fieldId = id || autoId;

  return (
    <div className="base-datepicker-wrapper">
      {label && (
        <label htmlFor={fieldId} className="base-datepicker-label">
          {label}
          {required && <span className="required-star">*</span>}
        </label>
      )}

      <div className="base-datepicker-field-wrap">
        <span className="base-datepicker-icon">
          <span className="isax icon-calendar-1"></span>
        </span>
        <input
          type="date"
          id={fieldId}
          name={name}
          value={value}
          onChange={onChange}
          disabled={disabled}
          readOnly={readOnly}
          required={required}
          min={min}
          max={max}
          className={`base-datepicker ${error ? 'has-error' : ''} ${className}`}
          aria-invalid={!!error}
          aria-describedby={error ? `${fieldId}-error` : helperText ? `${fieldId}-helper` : undefined}
          {...rest}
        />
      </div>

      {error && (
        <span className="base-datepicker-error" id={`${fieldId}-error`} role="alert">
          <span className="isax icon-info-circle" style={{ fontSize: 13 }}></span>
          {error}
        </span>
      )}
      {!error && helperText && (
        <span className="base-datepicker-helper" id={`${fieldId}-helper`}>
          {helperText}
        </span>
      )}
    </div>
  );
}

export default DatePicker;
