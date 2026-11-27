const tableStyles = `
.base-table-container {
  width: 100%;
  overflow-x: auto;
  -webkit-overflow-scrolling: touch;
  border-radius: var(--radius-card, 8px);
  border: 1px solid var(--color-border-default, #E2E8F0);
  background: var(--color-bg-surface, #FFFFFF);
  scrollbar-width: thin;
  scrollbar-color: #CBD5E1 #F1F5F9;
}
.base-table-container::-webkit-scrollbar {
  height: 8px;
  width: 8px;
}
.base-table-container::-webkit-scrollbar-track {
  background: #F1F5F9;
  border-radius: 999px;
  margin: 0 4px;
}
.base-table-container::-webkit-scrollbar-thumb {
  background: #CBD5E1;
  border-radius: 999px;
  border: 2px solid #F1F5F9;
}
.base-table-container::-webkit-scrollbar-thumb:hover {
  background: #94A3B8;
}
.base-table {
  width: 100%;
  border-collapse: collapse;
  font-size: 14px;
  text-align: left;
}
.base-table-head {
  background: var(--color-neutral-50, #F8FAFC);
  border-bottom: 1.5px solid var(--color-border-default, #E2E8F0);
}
.base-table-head th {
  padding: 12px 16px;
  font-weight: 600;
  font-size: 13px;
  color: var(--color-text-secondary, #334155);
  white-space: nowrap !important;
}
.base-table-row {
  border-bottom: 1px solid var(--color-border-default, #E2E8F0);
  transition: background-color 0.15s ease;
}
.base-table.is-hoverable .base-table-row:hover {
  background-color: var(--color-neutral-50, #F8FAFC);
}
.base-table-row.is-selected {
  background-color: var(--color-primary-50, #F0F3FA);
}
.base-table.is-striped .base-table-row:nth-child(even) {
  background-color: var(--color-neutral-50, #F8FAFC);
}
.base-table-cell {
  padding: 14px 16px;
  color: var(--color-text-primary, #0F172A);
  vertical-align: middle;
  white-space: nowrap !important;
}
.base-table-cell.base-table-cell-nowrap {
  white-space: nowrap;
}
.base-table-sort-btn {
  display: inline-flex;
  align-items: center;
  gap: 6px;
  background: none;
  border: none;
  padding: 0;
  font: inherit;
  color: inherit;
  font-weight: 600;
  cursor: pointer;
}
.base-table-empty {
  padding: 48px 16px;
  text-align: center;
  color: var(--color-text-muted, #64748B);
}
.base-table-cell.is-action-cell .base-btn:not(.base-btn-icon-only):not(.base-btn-circle),
.base-table-cell[style*="text-align: right"] .base-btn:not(.base-btn-icon-only):not(.base-btn-circle) {
  min-width: 104px;
  justify-content: center;
  text-align: center;
}
@media (min-width: 1400px) {
  .base-table th.sticky-action-col,
  .base-table td.sticky-action-col,
  .base-table th.base-table-col-sticky-right,
  .base-table td.base-table-col-sticky-right,
  .base-table.has-sticky-actions th:last-child,
  .base-table.has-sticky-actions td:last-child,
  .base-table-cell.sticky-right,
  .base-table-cell.is-action-cell {
    position: sticky !important;
    right: 0 !important;
    z-index: 10 !important;
    background-color: var(--color-bg-surface, #ffffff);
    box-shadow: -4px 0 8px -2px rgba(0, 0, 0, 0.06);
  }
  .base-table thead th.sticky-action-col,
  .base-table thead th.base-table-col-sticky-right,
  .base-table.has-sticky-actions thead th:last-child,
  .base-table-head th.sticky-action-col,
  .base-table-head th.base-table-col-sticky-right,
  th.base-table-cell.sticky-right {
    z-index: 15 !important;
    background-color: var(--color-neutral-50, #f8fafc) !important;
  }
  .base-table tbody tr:hover td.sticky-action-col,
  .base-table tbody tr:hover td.base-table-col-sticky-right,
  .base-table.has-sticky-actions tbody tr:hover td:last-child,
  .base-table.is-hoverable .base-table-row:hover .base-table-cell.sticky-right,
  .base-table.is-hoverable .base-table-row:hover .base-table-cell.is-action-cell {
    background-color: var(--color-neutral-50, #f8fafc) !important;
  }
  .base-table tbody tr.is-selected td.sticky-action-col,
  .base-table tbody tr.is-selected td.base-table-col-sticky-right,
  .base-table.has-sticky-actions tbody tr.is-selected td:last-child,
  .base-table-row.is-selected .base-table-cell.sticky-right,
  .base-table-row.is-selected .base-table-cell.is-action-cell {
    background-color: var(--color-primary-50, #f0f3fa) !important;
  }
}
`;

let _tableStylesInjected = false;
function injectTableStyles() {
  if (_tableStylesInjected || typeof document === 'undefined') return;
  _tableStylesInjected = true;
  const style = document.createElement('style');
  style.textContent = tableStyles;
  document.head.appendChild(style);
}

export function Table({
  children,
  striped = false,
  hoverable = true,
  minWidth,
  className = '',
  containerClassName = '',
  style,
  containerStyle,
}) {
  injectTableStyles();

  return (
    <div
      className={`base-table-container ${containerClassName}`}
      style={containerStyle}
    >
      <table
        className={`base-table ${striped ? 'is-striped' : ''} ${
          hoverable ? 'is-hoverable' : ''
        } ${className}`}
        style={{ ...(minWidth ? { minWidth } : {}), ...style }}
      >
        {children}
      </table>
    </div>
  );
}

export function TableHead({ children, className = '' }) {
  injectTableStyles();
  return <thead className={`base-table-head ${className}`}>{children}</thead>;
}

export function TableBody({ children, className = '' }) {
  injectTableStyles();
  return <tbody className={`base-table-body ${className}`}>{children}</tbody>;
}

export function TableRow({
  children,
  selected = false,
  onClick,
  className = '',
  ...rest
}) {
  injectTableStyles();
  return (
    <tr
      className={`base-table-row ${selected ? 'is-selected' : ''} ${className}`}
      onClick={onClick}
      style={{ cursor: onClick ? 'pointer' : undefined }}
      {...rest}
    >
      {children}
    </tr>
  );
}

export function TableCell({
  children,
  header = false,
  align = 'left',
  width,
  sticky = false,
  sortable = false,
  sortDir = null, // 'asc' | 'desc' | null
  onSort,
  className = '',
  style = {},
  ...rest
}) {
  injectTableStyles();
  const Tag = header ? 'th' : 'td';
  const stickyClass = sticky ? 'sticky-action-col base-table-col-sticky-right' : '';
  const mergedClass = `base-table-cell ${stickyClass} ${className}`.trim();
  const alignStyle = { textAlign: align, width: width || undefined, ...style };

  if (header && sortable) {
    return (
      <Tag className={mergedClass} style={alignStyle} {...rest}>
        <button
          type="button"
          className="base-table-sort-btn"
          onClick={onSort}
        >
          <span>{children}</span>
          <span className="isax" style={{ fontSize: 14 }}>
            {sortDir === 'asc' ? (
              <span className="isax icon-arrow-up-2"></span>
            ) : sortDir === 'desc' ? (
              <span className="isax icon-arrow-down-2"></span>
            ) : (
              <span className="isax icon-sort" style={{ opacity: 0.5 }}></span>
            )}
          </span>
        </button>
      </Tag>
    );
  }

  return (
    <Tag className={mergedClass} style={alignStyle} {...rest}>
      {children}
    </Tag>
  );
}

export function TableEmpty({
  colSpan = 1,
  message = 'Không có dữ liệu',
  icon = 'document',
}) {
  injectTableStyles();
  return (
    <tr>
      <td colSpan={colSpan} className="base-table-empty">
        <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 8 }}>
          <span className={`isax icon-${icon}`} style={{ fontSize: 32, opacity: 0.4 }}></span>
          <p style={{ margin: 0, fontSize: 14 }}>{message}</p>
        </div>
      </td>
    </tr>
  );
}

export default Table;
