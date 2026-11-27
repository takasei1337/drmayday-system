import { Link } from 'react-router-dom';

const breadcrumbStyles = `
.base-breadcrumb {
  display: flex;
  align-items: center;
  flex-wrap: wrap;
  gap: 8px;
  font-size: 13px;
  list-style: none;
  padding: 0;
  margin: 0;
}
.base-breadcrumb-item {
  display: inline-flex;
  align-items: center;
  gap: 8px;
}
.base-breadcrumb-link {
  color: var(--color-text-muted, #64748B);
  text-decoration: none;
  display: inline-flex;
  align-items: center;
  gap: 4px;
  transition: color 0.15s ease;
}
.base-breadcrumb-link:hover {
  color: var(--color-primary-600, #091F5B);
}
.base-breadcrumb-current {
  color: var(--color-text-primary, #0F172A);
  font-weight: 600;
  display: inline-flex;
  align-items: center;
  gap: 4px;
}
.base-breadcrumb-separator {
  color: var(--color-neutral-400, #94A3B8);
  display: inline-flex;
  align-items: center;
  font-size: 12px;
}
`;

let _breadcrumbStylesInjected = false;
function injectBreadcrumbStyles() {
  if (_breadcrumbStylesInjected || typeof document === 'undefined') return;
  _breadcrumbStylesInjected = true;
  const style = document.createElement('style');
  style.textContent = breadcrumbStyles;
  document.head.appendChild(style);
}

export function Breadcrumb({
  items = [],
  separator = 'chevron-right',
  className = '',
}) {
  injectBreadcrumbStyles();

  if (!items.length) return null;

  return (
    <nav aria-label="Breadcrumb" className={className}>
      <ol className="base-breadcrumb">
        {items.map((item, index) => {
          const isLast = index === items.length - 1;

          return (
            <li key={index} className="base-breadcrumb-item">
              {item.icon && (
                <span className={`isax icon-${item.icon}`} style={{ fontSize: 14 }} aria-hidden="true" />
              )}
              {isLast ? (
                <span className="base-breadcrumb-current" aria-current="page">
                  {item.label}
                </span>
              ) : item.href ? (
                <Link to={item.href} className="base-breadcrumb-link">
                  {item.label}
                </Link>
              ) : (
                <span className="base-breadcrumb-link">{item.label}</span>
              )}

              {!isLast && (
                <span className="base-breadcrumb-separator" aria-hidden="true">
                  {separator === 'slash' ? (
                    '/'
                  ) : (
                    <span className="isax icon-arrow-right-3" style={{ fontSize: 12 }}></span>
                  )}
                </span>
              )}
            </li>
          );
        })}
      </ol>
    </nav>
  );
}

export default Breadcrumb;
