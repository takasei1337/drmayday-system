const tabsStyles = `
.base-tabs-list {
  display: flex;
  align-items: center;
  gap: 8px;
  user-select: none;
  overflow-x: auto;
  max-width: 100%;
  scrollbar-width: none;
}
@media (max-width: 1279px) {
  .base-tabs-list.variant-pills,
  .base-tabs-list.variant-underline {
    flex-wrap: wrap;
    overflow-x: visible;
    gap: 6px 12px;
  }
  .variant-pills .base-tab-item {
    white-space: normal;
    text-align: center;
  }
}
.base-tabs-list::-webkit-scrollbar {
  display: none;
}
.base-tabs-list.is-full-width {
  width: 100%;
}
.base-tabs-list.is-full-width .base-tab-item {
  flex: 1;
  justify-content: center;
}

/* Variant: Underline (Clinical Standard) */
.base-tabs-list.variant-underline {
  border-bottom: 1.5px solid var(--color-border-default, #E2E8F0);
  gap: 20px;
}
.variant-underline .base-tab-item {
  padding: 10px 4px;
  border-radius: 0;
  background: transparent;
  color: var(--color-text-secondary, #334155);
}
.variant-underline .base-tab-item:hover:not(:disabled) {
  color: var(--color-primary-600, #091F5B);
}
.variant-underline .base-tab-item.is-active {
  color: var(--color-primary-600, #091F5B);
  font-weight: 600;
}
.variant-underline .base-tab-item.is-active::after {
  content: '';
  position: absolute;
  bottom: -1.5px;
  left: 0;
  right: 0;
  height: 2.5px;
  background: var(--color-primary-600, #091F5B);
  border-radius: 2px 2px 0 0;
}

/* Variant: Segmented Control */
.base-tabs-list.variant-pills {
  background: var(--color-neutral-100, #F1F5F9);
  padding: 3px;
  border-radius: var(--radius-button, 6px);
  gap: 3px;
  border: 1px solid var(--color-border-default, #E2E8F0);
}
.variant-pills .base-tab-item {
  border-radius: var(--radius-button, 6px);
  padding: 6px 14px;
  color: var(--color-text-secondary, #475569);
  background: transparent;
}
.variant-pills .base-tab-item:hover:not(:disabled) {
  color: var(--color-text-primary, #0F172A);
}
.variant-pills .base-tab-item.is-active {
  background: var(--color-bg-surface, #FFFFFF);
  color: var(--color-primary-600, #091F5B);
  font-weight: 600;
  box-shadow: none;
  border: 1px solid var(--color-border-default, #E2E8F0);
}

/* Variant: Boxed / Card header tabs */
.base-tabs-list.variant-boxed {
  background: var(--color-neutral-50, #F8FAFC);
  padding: 0 12px;
  border-bottom: 1px solid var(--color-border-default, #E2E8F0);
  gap: 4px;
}
.variant-boxed .base-tab-item {
  padding: 10px 16px;
  border-radius: var(--radius-sm, 8px) var(--radius-sm, 8px) 0 0;
  margin-bottom: -1px;
}
.variant-boxed .base-tab-item.is-active {
  background: #FFFFFF;
  border: 1px solid var(--color-border-default, #E2E8F0);
  border-bottom-color: #FFFFFF;
  color: var(--color-primary-600, #091F5B);
  font-weight: 600;
}

/* Common tab button styles */
.base-tab-item {
  display: inline-flex;
  align-items: center;
  gap: 8px;
  font-size: 13px;
  font-weight: 500;
  border: none;
  cursor: pointer;
  outline: none;
  transition: all 0.15s ease;
  position: relative;
  white-space: nowrap;
}
.base-tab-item:disabled {
  opacity: 0.45;
  cursor: not-allowed;
}

/* Sizes */
.base-tabs-list.size-sm .base-tab-item {
  font-size: 12px;
  padding-top: 6px;
  padding-bottom: 6px;
  gap: 6px;
}
.base-tabs-list.size-lg .base-tab-item {
  font-size: 15px;
  padding-top: 12px;
  padding-bottom: 12px;
  gap: 10px;
}

/* Tab Badge */
.base-tab-badge {
  font-size: 12px;
  font-weight: 600;
  padding: 1px 6px;
  border-radius: 999px;
  background: var(--color-neutral-200, #E2E8F0);
  color: var(--color-text-secondary, #475569);
  line-height: 1.2;
}
.base-tab-item.is-active .base-tab-badge {
  background: var(--color-primary-100, #DCE3F2);
  color: var(--color-primary-600, #091F5B);
}
`;

let _tabsStylesInjected = false;
function injectTabsStyles() {
  if (_tabsStylesInjected || typeof document === 'undefined') return;
  _tabsStylesInjected = true;
  const style = document.createElement('style');
  style.textContent = tabsStyles;
  document.head.appendChild(style);
}

function resolveIconClass(iconName, isActive) {
  if (!iconName) return '';
  let clean = iconName.trim();
  // Remove 'isax' prefix if already provided
  clean = clean.replace(/^isax(-b)?\s+/, '');
  // Normalize 'icon-' prefix
  const bareName = clean.startsWith('icon-') ? clean.slice(5) : clean;
  const iconPrefix = isActive ? 'isax-b' : 'isax';
  return `${iconPrefix} icon-${bareName}`;
}

export function Tabs({
  tabs = [],
  activeTab,
  onChange,
  variant = 'underline', // 'underline' | 'pills' | 'boxed'
  size = 'md', // 'sm' | 'md' | 'lg'
  fullWidth = false,
  showBadge = false, // Mặc định không hiển thị số lượng trên tab theo chuẩn thiết kế y tế
  className = '',
}) {
  injectTabsStyles();

  return (
    <div
      className={`base-tabs-list variant-${variant} size-${size} ${fullWidth ? 'is-full-width' : ''} ${className}`}
      role="tablist"
    >
      {tabs.map((tab) => {
        const isActive = activeTab === tab.id;
        const iconClass = resolveIconClass(tab.icon, isActive);

        return (
          <button
            key={tab.id}
            type="button"
            role="tab"
            aria-selected={isActive}
            aria-controls={`panel-${tab.id}`}
            id={`tab-${tab.id}`}
            disabled={tab.disabled}
            className={`base-tab-item ${isActive ? 'is-active' : ''}`}
            onClick={() => !tab.disabled && onChange && onChange(tab.id)}
          >
            {iconClass && (
              <span
                className={iconClass}
                style={{ fontSize: size === 'sm' ? 14 : size === 'lg' ? 18 : 16 }}
                aria-hidden="true"
              />
            )}
            <span>{tab.label}</span>
            {showBadge && tab.badge !== undefined && tab.badge !== null && (
              <span className="base-tab-badge">{tab.badge}</span>
            )}
          </button>
        );
      })}
    </div>
  );
}

export function TabPanel({ id, activeTab, children, className = '' }) {
  if (activeTab !== id) return null;

  return (
    <div
      id={`panel-${id}`}
      role="tabpanel"
      aria-labelledby={`tab-${id}`}
      className={`base-tab-panel ${className}`}
      style={{ marginTop: 16 }}
    >
      {children}
    </div>
  );
}

export const TabBar = Tabs;

export default Tabs;
