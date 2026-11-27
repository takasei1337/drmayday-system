import { useId } from 'react';

const textareaStyles = `
.base-textarea-wrapper {
  display: flex;
  flex-direction: column;
  gap: 6px;
  width: 100%;
}
.base-textarea-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
}
.base-textarea-label {
  font-size: 13px;
  font-weight: 600;
  color: var(--color-text-primary);
  display: flex;
  align-items: center;
  gap: 3px;
}
.base-textarea-label .required-star {
  color: var(--color-error-fg);
}
.base-textarea-charcount {
  font-size: 12px;
  color: var(--color-text-muted);
}
.base-textarea {
  width: 100%;
  padding: 10px 12px;
  font-size: 14px;
  font-family: inherit;
  color: var(--color-text-primary);
  background: var(--color-bg-surface);
  border: 1px solid var(--color-border-default);
  border-radius: var(--radius-input, 6px);
  outline: none;
  resize: vertical;
  min-height: 80px;
  transition: border-color 0.15s ease, box-shadow 0.15s ease;
  box-sizing: border-box;
}
.base-textarea::placeholder {
  color: var(--color-text-muted);
  font-weight: 400;
}
.base-textarea:focus {
  border-color: var(--color-primary-600);
  box-shadow: 0 0 0 1px var(--color-primary-600);
}
.base-textarea.has-error {
  border-color: var(--color-error-fg);
}
.base-textarea.has-error:focus {
  box-shadow: 0 0 0 1px var(--color-error-fg);
}
.base-textarea:disabled {
  opacity: 0.5;
  cursor: not-allowed;
  background: var(--color-neutral-100);
}
.base-textarea[readonly] {
  background: var(--color-neutral-50);
  cursor: default;
}
.base-textarea-helper {
  font-size: 12px;
  color: var(--color-text-muted);
  margin-top: 2px;
}
.base-textarea-error {
  font-size: 12px;
  color: var(--color-error-fg);
  display: flex;
  align-items: center;
  gap: 4px;
  margin-top: 2px;
}
`;

let _textareaStylesInjected = false;
function injectTextareaStyles() {
  if (_textareaStylesInjected || typeof document === 'undefined') return;
  _textareaStylesInjected = true;
  const style = document.createElement('style');
  style.textContent = textareaStyles;
  document.head.appendChild(style);
}

export function Textarea({
  label,
  value,
  onChange,
  placeholder,
  rows = 4,
  error,
  disabled = false,
  readOnly = false,
  helperText,
  maxLength,
  showCharCount = false,
  required = false,
  id,
  name,
  className = '',
  ...rest
}) {
  injectTextareaStyles();
  const autoId = useId();
  const fieldId = id || autoId;
  const currentLength = typeof value === 'string' ? value.length : 0;

  return (
    <div className="base-textarea-wrapper">
      {(label || (showCharCount && maxLength)) && (
        <div className="base-textarea-header">
          {label && (
            <label htmlFor={fieldId} className="base-textarea-label">
              {label}
              {required && <span className="required-star">*</span>}
            </label>
          )}
          {showCharCount && maxLength && (
            <span className="base-textarea-charcount">
              {currentLength}/{maxLength}
            </span>
          )}
        </div>
      )}

      <textarea
        id={fieldId}
        name={name}
        rows={rows}
        value={value}
        onChange={onChange}
        placeholder={placeholder}
        disabled={disabled}
        readOnly={readOnly}
        required={required}
        maxLength={maxLength}
        className={`base-textarea ${error ? 'has-error' : ''} ${className}`}
        aria-invalid={!!error}
        aria-describedby={error ? `${fieldId}-error` : helperText ? `${fieldId}-helper` : undefined}
        {...rest}
      />

      {error && (
        <span className="base-textarea-error" id={`${fieldId}-error`} role="alert">
          <span className="isax icon-info-circle" style={{ fontSize: 13 }}></span>
          {error}
        </span>
      )}
      {!error && helperText && (
        <span className="base-textarea-helper" id={`${fieldId}-helper`}>
          {helperText}
        </span>
      )}
    </div>
  );
}

export default Textarea;
