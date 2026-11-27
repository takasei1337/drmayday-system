const tooltipStyles = `
.base-tooltip-wrap {
  position: relative;
  display: inline-flex;
}
.base-tooltip-content {
  position: absolute;
  z-index: 1000;
  padding: 5px 10px;
  font-size: 12px;
  font-weight: 500;
  line-height: 1.4;
  color: var(--color-text-inverse, #FFFFFF);
  background: var(--color-neutral-800, #1E293B);
  border-radius: var(--radius-xs, 4px);
  white-space: nowrap;
  pointer-events: none;
  opacity: 0;
  visibility: hidden;
  transition: opacity 0.12s ease;
  box-shadow: var(--shadow-sm, 0 1px 3px rgba(0,0,0,0.1));
}
/* Positions */
.base-tooltip-wrap.pos-top .base-tooltip-content {
  bottom: 100%;
  left: 50%;
  transform: translateX(-50%);
  margin-bottom: 6px;
}
.base-tooltip-wrap.pos-bottom .base-tooltip-content {
  top: 100%;
  left: 50%;
  transform: translateX(-50%);
  margin-top: 6px;
}
.base-tooltip-wrap.pos-left .base-tooltip-content {
  right: 100%;
  top: 50%;
  transform: translateY(-50%);
  margin-right: 6px;
}
.base-tooltip-wrap.pos-right .base-tooltip-content {
  left: 100%;
  top: 50%;
  transform: translateY(-50%);
  margin-left: 6px;
}

/* Hover & Focus show */
.base-tooltip-wrap:hover .base-tooltip-content,
.base-tooltip-wrap:focus-within .base-tooltip-content {
  opacity: 1;
  visibility: visible;
}
`;

let _tooltipStylesInjected = false;
function injectTooltipStyles() {
  if (_tooltipStylesInjected || typeof document === 'undefined') return;
  _tooltipStylesInjected = true;
  const style = document.createElement('style');
  style.textContent = tooltipStyles;
  document.head.appendChild(style);
}

export function Tooltip({
  content,
  position = 'top',
  children,
  className = '',
}) {
  injectTooltipStyles();

  if (!content) return children;

  return (
    <span className={`base-tooltip-wrap pos-${position} ${className}`}>
      {children}
      <span className="base-tooltip-content" role="tooltip">
        {content}
      </span>
    </span>
  );
}

export default Tooltip;
