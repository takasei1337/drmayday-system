import { useId, useEffect, useRef } from 'react';

const checkboxStyles = `
.base-checkbox-wrapper {
  display: inline-flex;
  flex-direction: column;
  gap: 4px;
}
.base-checkbox-label-wrap {
  display: inline-flex;
  align-items: center;
  gap: 8px;
  cursor: pointer;
  user-select: none;
  font-size: 14px;
  color: var(--color-text-primary);
}
.base-checkbox-label-wrap.is-disabled {
  cursor: not-allowed;
  opacity: 0.5;
}
.base-checkbox-input {
  position: absolute;
  opacity: 0;
  width: 0;
  height: 0;
  margin: 0;
  pointer-events: none;
}
.base-checkbox-box {
  width: 18px;
  height: 18px;
  border-radius: var(--radius-xs, 4px);
  border: 1.5px solid var(--color-border-strong, #CBD5E1);
  background: var(--color-bg-surface);
  display: inline-flex;
  align-items: center;
  justify-content: center;
  flex-shrink: 0;
  transition: all 0.15s ease;
  color: var(--color-text-inverse, #FFFFFF);
  font-size: 12px;
}
.base-checkbox-input:focus-visible + .base-checkbox-box {
  box-shadow: 0 0 0 2px rgba(9, 31, 91, 0.2);
  border-color: var(--color-primary-600);
}
.base-checkbox-input:checked + .base-checkbox-box,
.base-checkbox-box.is-indeterminate {
  background: var(--color-primary-600);
  border-color: var(--color-primary-600);
}
.base-checkbox-box.has-error {
  border-color: var(--color-error-fg);
}
.base-checkbox-helper {
  font-size: 12px;
  color: var(--color-text-muted);
  padding-left: 26px;
}
.base-checkbox-error {
  font-size: 12px;
  color: var(--color-error-fg);
  padding-left: 26px;
  display: flex;
  align-items: center;
  gap: 4px;
}
`;

let _checkboxStylesInjected = false;
function injectCheckboxStyles() {
  if (_checkboxStylesInjected || typeof document === 'undefined') return;
  _checkboxStylesInjected = true;
  const style = document.createElement('style');
  style.textContent = checkboxStyles;
  document.head.appendChild(style);
}

export function Checkbox({
  label,
  checked = false,
  onChange,
  disabled = false,
  indeterminate = false,
  error,
  helperText,
  id,
  name,
  className = '',
  ...rest
}) {
  injectCheckboxStyles();
  const autoId = useId();
  const fieldId = id || autoId;
  const inputRef = useRef(null);

  useEffect(() => {
    if (inputRef.current) {
      inputRef.current.indeterminate = indeterminate;
    }
  }, [indeterminate]);

  return (
    <div className={`base-checkbox-wrapper ${className}`}>
      <label htmlFor={fieldId} className={`base-checkbox-label-wrap ${disabled ? 'is-disabled' : ''}`}>
        <input
          ref={inputRef}
          type="checkbox"
          id={fieldId}
          name={name}
          checked={checked}
          onChange={onChange}
          disabled={disabled}
          className="base-checkbox-input"
          aria-invalid={!!error}
          aria-describedby={error ? `${fieldId}-error` : helperText ? `${fieldId}-helper` : undefined}
          {...rest}
        />
        <span
          className={`base-checkbox-box ${indeterminate ? 'is-indeterminate' : ''} ${error ? 'has-error' : ''}`}
          aria-hidden="true"
        >
          {indeterminate ? (
            <svg width="10" height="2" viewBox="0 0 10 2" fill="none" xmlns="http://www.w3.org/2000/svg">
              <path d="M1 1H9" stroke="currentColor" strokeWidth="2" strokeLinecap="round" />
            </svg>
          ) : checked ? (
            <svg width="11" height="9" viewBox="0 0 11 9" fill="none" xmlns="http://www.w3.org/2000/svg">
              <path d="M1.5 4.5L4.2 7.5L9.5 1.5" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
            </svg>
          ) : null}
        </span>
        {label && <span className="base-checkbox-text">{label}</span>}
      </label>

      {error && (
        <span className="base-checkbox-error" id={`${fieldId}-error`} role="alert">
          <span className="isax icon-info-circle" style={{ fontSize: 12 }}></span>
          {error}
        </span>
      )}
      {!error && helperText && (
        <span className="base-checkbox-helper" id={`${fieldId}-helper`}>
          {helperText}
        </span>
      )}
    </div>
  );
}

export default Checkbox;
