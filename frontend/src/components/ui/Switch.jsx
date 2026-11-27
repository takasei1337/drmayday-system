import { useId } from 'react';

const switchStyles = `
.base-switch-wrapper {
  display: inline-flex;
  align-items: center;
  gap: 10px;
  cursor: pointer;
  user-select: none;
}
.base-switch-wrapper.is-disabled {
  cursor: not-allowed;
  opacity: 0.5;
}
.base-switch-input {
  position: absolute;
  opacity: 0;
  width: 0;
  height: 0;
  margin: 0;
  pointer-events: none;
}
.base-switch-track {
  position: relative;
  display: inline-flex;
  align-items: center;
  background: var(--color-neutral-300, #CBD5E1);
  border-radius: 999px;
  transition: background-color 0.2s ease, box-shadow 0.2s ease;
  flex-shrink: 0;
}
.base-switch-track.size-sm {
  width: 32px;
  height: 18px;
  padding: 2px;
}
.base-switch-track.size-md {
  width: 44px;
  height: 24px;
  padding: 2px;
}
.base-switch-track.size-lg {
  width: 52px;
  height: 28px;
  padding: 3px;
}
.base-switch-thumb {
  background: #FFFFFF;
  border-radius: 50%;
  box-shadow: 0 1px 3px rgba(0, 0, 0, 0.2);
  transition: transform 0.2s cubic-bezier(0.4, 0, 0.2, 1);
}
.size-sm .base-switch-thumb {
  width: 14px;
  height: 14px;
}
.size-md .base-switch-thumb {
  width: 20px;
  height: 20px;
}
.size-lg .base-switch-thumb {
  width: 22px;
  height: 22px;
}
.base-switch-input:focus-visible + .base-switch-track {
  box-shadow: 0 0 0 2px rgba(9, 31, 91, 0.2);
}
.base-switch-input:checked + .base-switch-track {
  background: var(--color-primary-600, #091F5B);
}
.base-switch-input:checked + .base-switch-track.size-sm .base-switch-thumb {
  transform: translateX(14px);
}
.base-switch-input:checked + .base-switch-track.size-md .base-switch-thumb {
  transform: translateX(20px);
}
.base-switch-input:checked + .base-switch-track.size-lg .base-switch-thumb {
  transform: translateX(24px);
}
.base-switch-label {
  font-size: 14px;
  color: var(--color-text-primary);
  font-weight: 500;
}
`;

let _switchStylesInjected = false;
function injectSwitchStyles() {
  if (_switchStylesInjected || typeof document === 'undefined') return;
  _switchStylesInjected = true;
  const style = document.createElement('style');
  style.textContent = switchStyles;
  document.head.appendChild(style);
}

export function Switch({
  checked = false,
  onChange,
  disabled = false,
  label,
  labelPosition = 'right',
  size = 'md',
  id,
  name,
  className = '',
  ...rest
}) {
  injectSwitchStyles();
  const autoId = useId();
  const fieldId = id || autoId;

  const handleChange = (e) => {
    if (disabled) return;
    onChange && onChange(e.target.checked);
  };

  return (
    <label
      htmlFor={fieldId}
      className={`base-switch-wrapper ${disabled ? 'is-disabled' : ''} ${className}`}
    >
      {label && labelPosition === 'left' && (
        <span className="base-switch-label">{label}</span>
      )}

      <input
        type="checkbox"
        id={fieldId}
        name={name}
        role="switch"
        aria-checked={checked}
        checked={checked}
        onChange={handleChange}
        disabled={disabled}
        className="base-switch-input"
        {...rest}
      />

      <span className={`base-switch-track size-${size}`} aria-hidden="true">
        <span className="base-switch-thumb" />
      </span>

      {label && labelPosition === 'right' && (
        <span className="base-switch-label">{label}</span>
      )}
    </label>
  );
}

export default Switch;
