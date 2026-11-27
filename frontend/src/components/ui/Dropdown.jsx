import { useState, useRef, useEffect, useCallback } from 'react';
import { createPortal } from 'react-dom';

const dropdownStyles = `
.base-dropdown-wrap {
  position: relative;
  display: inline-flex;
}
.base-dropdown-menu {
  position: fixed;
  z-index: 99999;
  min-width: 190px;
  background: var(--color-bg-surface, #FFFFFF);
  border: 1px solid var(--color-border-default, #E2E8F0);
  border-radius: var(--radius-card, 8px);
  box-shadow: 0 10px 25px -5px rgba(0, 0, 0, 0.12), 0 8px 10px -6px rgba(0, 0, 0, 0.08);
  padding: 6px;
  list-style: none;
  margin: 0;
  animation: dropdown-fade-in 0.15s cubic-bezier(0.16, 1, 0.3, 1);
  font-family: var(--base-font-family, 'Inter', -apple-system, BlinkMacSystemFont, sans-serif);
}
.base-dropdown-item {
  display: flex;
  align-items: center;
  gap: 10px;
  width: 100%;
  padding: 8px 12px;
  font-size: 13px;
  font-weight: 500;
  color: var(--color-text-primary, #0F172A);
  background: transparent;
  border: none;
  border-radius: 6px;
  cursor: pointer;
  text-align: left;
  transition: background-color 0.12s ease, color 0.12s ease;
  font-family: inherit;
  white-space: nowrap;
}
.base-dropdown-item:hover:not(:disabled) {
  background-color: var(--color-neutral-100, #F1F5F9);
  color: var(--color-text-primary, #0F172A);
}
.base-dropdown-item.variant-destructive {
  color: var(--color-error-fg, #DC2626);
}
.base-dropdown-item.variant-destructive:hover:not(:disabled) {
  background-color: var(--color-error-bg, #FEF2F2);
  color: var(--color-error-fg, #DC2626);
}
.base-dropdown-item:disabled {
  opacity: 0.45;
  cursor: not-allowed;
}
.base-dropdown-divider {
  height: 1px;
  background-color: var(--color-border-default, #E2E8F0);
  margin: 4px 0;
}

@keyframes dropdown-fade-in {
  from { opacity: 0; transform: translateY(-4px); }
  to   { opacity: 1; transform: translateY(0); }
}
`;

let _dropdownStylesInjected = false;
function injectDropdownStyles() {
  if (_dropdownStylesInjected || typeof document === 'undefined') return;
  _dropdownStylesInjected = true;
  const style = document.createElement('style');
  style.textContent = dropdownStyles;
  document.head.appendChild(style);
}

const getIconClass = (icon) => {
  if (!icon) return '';
  if (icon.startsWith('isax')) return icon;
  if (icon.startsWith('icon-')) return `isax ${icon}`;
  return `isax icon-${icon}`;
};

export function Dropdown({
  trigger,
  items = [],
  align = 'right',
  width = 'auto',
  className = '',
}) {
  injectDropdownStyles();
  const [open, setOpen] = useState(false);
  const [coords, setCoords] = useState(null);
  const triggerRef = useRef(null);
  const menuRef = useRef(null);

  const updatePosition = useCallback(() => {
    if (!triggerRef.current) return;
    const rect = triggerRef.current.getBoundingClientRect();
    const menuWidth = typeof width === 'number' ? width : 190;

    // Trigger scrolled out of view
    if (rect.bottom < 0 || rect.top > window.innerHeight) {
      setOpen(false);
      return;
    }

    const spaceBelow = window.innerHeight - rect.bottom;
    const spaceAbove = rect.top;
    const openUpwards = spaceBelow < 220 && spaceAbove > spaceBelow;

    let left = align === 'right' ? rect.right - menuWidth : rect.left;
    if (left < 8) left = 8;
    if (left + menuWidth > window.innerWidth - 8) {
      left = window.innerWidth - menuWidth - 8;
    }

    const top = openUpwards ? undefined : rect.bottom + 4;
    const bottom = openUpwards ? window.innerHeight - rect.top + 4 : undefined;

    setCoords({
      top,
      bottom,
      left,
      width: width !== 'auto' ? width : undefined,
    });
  }, [align, width]);

  useEffect(() => {
    if (!open) return;
    updatePosition();

    function handleScrollOrResize() {
      updatePosition();
    }

    function handleClickOutside(e) {
      if (
        triggerRef.current &&
        !triggerRef.current.contains(e.target) &&
        menuRef.current &&
        !menuRef.current.contains(e.target)
      ) {
        setOpen(false);
      }
    }

    function handleKeyDown(e) {
      if (e.key === 'Escape') {
        setOpen(false);
      }
    }

    document.addEventListener('mousedown', handleClickOutside);
    document.addEventListener('keydown', handleKeyDown);
    window.addEventListener('scroll', handleScrollOrResize, true);
    window.addEventListener('resize', handleScrollOrResize);

    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
      document.removeEventListener('keydown', handleKeyDown);
      window.removeEventListener('scroll', handleScrollOrResize, true);
      window.removeEventListener('resize', handleScrollOrResize);
    };
  }, [open, updatePosition]);

  return (
    <div className={`base-dropdown-wrap ${className}`}>
      <div
        ref={triggerRef}
        onClick={(e) => {
          e.stopPropagation();
          setOpen((prev) => !prev);
        }}
        style={{ display: 'inline-flex', cursor: 'pointer' }}
      >
        {trigger}
      </div>

      {open && coords && typeof document !== 'undefined' && createPortal(
        <ul
          ref={menuRef}
          className="base-dropdown-menu"
          style={{
            top: coords.top != null ? `${coords.top}px` : undefined,
            bottom: coords.bottom != null ? `${coords.bottom}px` : undefined,
            left: `${coords.left}px`,
            width: coords.width,
          }}
          role="menu"
          onClick={(e) => e.stopPropagation()}
        >
          {items.map((item, index) => {
            if (item.divider) {
              return <li key={`div-${index}`} className="base-dropdown-divider" role="separator" />;
            }

            return (
              <li key={`item-${index}`} role="none">
                <button
                  type="button"
                  role="menuitem"
                  disabled={item.disabled}
                  className={`base-dropdown-item ${
                    item.variant === 'destructive' ? 'variant-destructive' : ''
                  }`}
                  onClick={(e) => {
                    e.stopPropagation();
                    item.onClick?.(e);
                    setOpen(false);
                  }}
                >
                  {item.icon && (
                    <span
                      className={getIconClass(item.icon)}
                      style={{ fontSize: 16 }}
                      aria-hidden="true"
                    />
                  )}
                  <span>{item.label}</span>
                </button>
              </li>
            );
          })}
        </ul>,
        document.body
      )}
    </div>
  );
}

/**
 * TableActionMenu — Standard 3-dot dropdown menu for data tables
 * Follows Uber Base Design System circular compact button and popover menu
 */
export function TableActionMenu({
  items = [],
  align = 'right',
  title = 'Tùy chọn thao tác',
  icon = 'more-2',
  className = '',
}) {
  return (
    <Dropdown
      align={align}
      className={className}
      trigger={
        <button
          type="button"
          className="base-btn base-btn-secondary base-btn-sm base-btn-icon-only cursor-pointer"
          title={title}
          aria-label={title}
        >
          <span className={`isax icon-${icon} text-base text-gray-600`}></span>
        </button>
      }
      items={items}
    />
  );
}

export default Dropdown;
