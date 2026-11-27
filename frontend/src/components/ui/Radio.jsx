import { useId } from 'react';

const radioStyles = `
.base-radio-wrapper {
  display: inline-flex;
  flex-direction: column;
  gap: 4px;
}
.base-radio-label-wrap {
  display: inline-flex;
  align-items: center;
  gap: 8px;
  cursor: pointer;
  user-select: none;
  font-size: 14px;
  color: var(--color-text-primary);
}
.base-radio-label-wrap.is-disabled {
  cursor: not-allowed;
  opacity: 0.5;
}
.base-radio-input {
  position: absolute;
  opacity: 0;
  width: 0;
  height: 0;
  margin: 0;
  pointer-events: none;
}
.base-radio-circle {
  width: 18px;
  height: 18px;
  border-radius: 50%;
  border: 1.5px solid var(--color-border-strong, #CBD5E1);
  background: var(--color-bg-surface);
  display: inline-flex;
  align-items: center;
  justify-content: center;
  flex-shrink: 0;
  transition: all 0.15s ease;
}
.base-radio-dot {
  width: 8px;
  height: 8px;
  border-radius: 50%;
  background: var(--color-primary-600);
  transform: scale(0);
  transition: transform 0.15s ease;
}
.base-radio-input:focus-visible + .base-radio-circle {
  box-shadow: 0 0 0 2px rgba(9, 31, 91, 0.2);
  border-color: var(--color-primary-600);
}
.base-radio-input:checked + .base-radio-circle {
  border-color: var(--color-primary-600);
}
.base-radio-input:checked + .base-radio-circle .base-radio-dot {
  transform: scale(1);
}
.base-radio-group {
  display: flex;
  flex-direction: column;
  gap: 8px;
}
.base-radio-group-label {
  font-size: 13px;
  font-weight: 600;
  color: var(--color-text-primary);
}
.base-radio-options {
  display: flex;
  gap: 12px;
}
.base-radio-options.is-vertical {
  flex-direction: column;
  gap: 8px;
}
.base-radio-options.is-horizontal {
  flex-direction: row;
  flex-wrap: wrap;
  gap: 16px;
}
`;

let _radioStylesInjected = false;
function injectRadioStyles() {
  if (_radioStylesInjected || typeof document === 'undefined') return;
  _radioStylesInjected = true;
  const style = document.createElement('style');
  style.textContent = radioStyles;
  document.head.appendChild(style);
}

export function Radio({
  label,
  checked = false,
  onChange,
  disabled = false,
  value,
  name,
  id,
  className = '',
  ...rest
}) {
  injectRadioStyles();
  const autoId = useId();
  const fieldId = id || autoId;

  return (
    <div className={`base-radio-wrapper ${className}`}>
      <label htmlFor={fieldId} className={`base-radio-label-wrap ${disabled ? 'is-disabled' : ''}`}>
        <input
          type="radio"
          id={fieldId}
          name={name}
          value={value}
          checked={checked}
          onChange={onChange}
          disabled={disabled}
          className="base-radio-input"
          {...rest}
        />
        <span className="base-radio-circle" aria-hidden="true">
          <span className="base-radio-dot" />
        </span>
        {label && <span className="base-radio-text">{label}</span>}
      </label>
    </div>
  );
}

export function RadioGroup({
  label,
  options = [],
  value,
  onChange,
  name,
  direction = 'vertical',
  error,
  helperText,
  className = '',
}) {
  injectRadioStyles();
  const autoName = useId();
  const groupName = name || autoName;

  return (
    <div className={`base-radio-group ${className}`} role="radiogroup" aria-label={label}>
      {label && <span className="base-radio-group-label">{label}</span>}
      <div className={`base-radio-options is-${direction}`}>
        {options.map((opt, i) => {
          const optVal = typeof opt === 'object' ? opt.value : opt;
          const optLabel = typeof opt === 'object' ? opt.label : opt;
          const optDisabled = typeof opt === 'object' ? opt.disabled : false;
          const isChecked = value === optVal;

          return (
            <Radio
              key={`${optVal}-${i}`}
              name={groupName}
              value={optVal}
              label={optLabel}
              checked={isChecked}
              disabled={optDisabled}
              onChange={(e) => onChange && onChange(e.target.value)}
            />
          );
        })}
      </div>
      {error && (
        <span style={{ fontSize: 12, color: 'var(--color-error-fg)', display: 'flex', alignItems: 'center', gap: 4 }}>
          <span className="isax icon-info-circle" style={{ fontSize: 12 }}></span>
          {error}
        </span>
      )}
      {!error && helperText && (
        <span style={{ fontSize: 12, color: 'var(--color-text-muted)' }}>{helperText}</span>
      )}
    </div>
  );
}

export default Radio;
