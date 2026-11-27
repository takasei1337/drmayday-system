const paginationStyles = `
.base-pagination {
  display: flex;
  align-items: center;
  gap: 4px;
  user-select: none;
}
.base-page-btn {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  min-width: 36px;
  height: 36px;
  padding: 0 8px;
  font-size: 13px;
  font-weight: 500;
  border-radius: 50% !important;
  border: 1px solid var(--color-border-default, #E2E8F0);
  background: var(--color-bg-surface, #FFFFFF);
  color: var(--color-text-primary, #0F172A);
  cursor: pointer;
  outline: none;
  transition: all 0.15s ease;
}
.base-page-btn:hover:not(:disabled) {
  background: var(--color-neutral-100, #F1F5F9);
  border-color: var(--color-border-strong, #CBD5E1);
}
.base-page-btn.is-active {
  background: var(--color-primary-600, #091F5B);
  border-color: var(--color-primary-600, #091F5B);
  color: var(--color-text-inverse, #FFFFFF);
  font-weight: 600;
}
.base-page-btn:disabled {
  opacity: 0.4;
  cursor: not-allowed;
}
.base-page-ellipsis {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  width: 32px;
  height: 36px;
  color: var(--color-text-muted, #64748B);
  font-size: 14px;
}
`;

let _paginationStylesInjected = false;
function injectPaginationStyles() {
  if (_paginationStylesInjected || typeof document === 'undefined') return;
  _paginationStylesInjected = true;
  const style = document.createElement('style');
  style.textContent = paginationStyles;
  document.head.appendChild(style);
}

export function Pagination({
  currentPage = 1,
  totalPages = 1,
  onPageChange,
  showFirstLast = false,
  maxVisible = 5,
  className = '',
}) {
  injectPaginationStyles();

  if (totalPages <= 1) return null;

  const getPages = () => {
    const pages = [];
    let start = Math.max(1, currentPage - Math.floor(maxVisible / 2));
    let end = Math.min(totalPages, start + maxVisible - 1);

    if (end - start + 1 < maxVisible) {
      start = Math.max(1, end - maxVisible + 1);
    }

    if (start > 1) {
      pages.push(1);
      if (start > 2) pages.push('ellipsis-start');
    }

    for (let i = start; i <= end; i++) {
      pages.push(i);
    }

    if (end < totalPages) {
      if (end < totalPages - 1) pages.push('ellipsis-end');
      pages.push(totalPages);
    }

    return pages;
  };

  const pages = getPages();

  return (
    <nav className={`base-pagination ${className}`} aria-label="Phân trang">
      {/* First button (chỉ hiển thị khi bật cờ showFirstLast) */}
      {showFirstLast && (
        <button
          type="button"
          className="base-page-btn"
          disabled={currentPage === 1}
          onClick={() => onPageChange && onPageChange(1)}
          aria-label="Trang đầu"
          title="Trang đầu"
        >
          <span className="isax icon-arrow-left" style={{ fontSize: 14 }}></span>
        </button>
      )}

      {/* Prev button (duy nhất 1 nút chuyển lùi) */}
      <button
        type="button"
        className="base-page-btn"
        disabled={currentPage === 1}
        onClick={() => onPageChange && onPageChange(currentPage - 1)}
        aria-label="Trang trước"
        title="Trang trước"
      >
        <span className="isax icon-arrow-left-2" style={{ fontSize: 14 }}></span>
      </button>

      {/* Page list */}
      {pages.map((p, index) => {
        if (typeof p === 'string') {
          return (
            <span key={`${p}-${index}`} className="base-page-ellipsis" aria-hidden="true">
              ...
            </span>
          );
        }

        const isActive = p === currentPage;
        return (
          <button
            key={p}
            type="button"
            className={`base-page-btn ${isActive ? 'is-active' : ''}`}
            aria-current={isActive ? 'page' : undefined}
            onClick={() => onPageChange && onPageChange(p)}
          >
            {p}
          </button>
        );
      })}

      {/* Next button (duy nhất 1 nút chuyển tiến) */}
      <button
        type="button"
        className="base-page-btn"
        disabled={currentPage === totalPages}
        onClick={() => onPageChange && onPageChange(currentPage + 1)}
        aria-label="Trang sau"
        title="Trang sau"
      >
        <span className="isax icon-arrow-right-3" style={{ fontSize: 14 }}></span>
      </button>

      {/* Last button (chỉ hiển thị khi bật cờ showFirstLast) */}
      {showFirstLast && (
        <button
          type="button"
          className="base-page-btn"
          disabled={currentPage === totalPages}
          onClick={() => onPageChange && onPageChange(totalPages)}
          aria-label="Trang cuối"
          title="Trang cuối"
        >
          <span className="isax icon-arrow-right" style={{ fontSize: 14 }}></span>
        </button>
      )}
    </nav>
  );
}

export default Pagination;
