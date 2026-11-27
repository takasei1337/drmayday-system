/**
 * NotificationCard / NotificationItem — DR. MAYDAY Design System
 * Tuân thủ nghiêm ngặt Uber Base Design System & Inter Font Only.
 * Cấu trúc chuẩn hóa:
 * [Icon ở đầu màu xanh đặc] -> [Phần nội dung (tiêu đề + mô tả)] -> [Thời gian] -> [Icon mũi tên chi tiết]
 */

import { Link } from 'react-router-dom';

export function NotificationCard({
  id,
  title,
  message,
  time,
  icon = 'icon-notification',
  iconVariant = 'solid', // 'solid' (vòng tròn xanh đặc icon trắng) | 'glyph' (icon màu xanh đặc)
  iconBg,
  iconColor,
  unread = false,
  to,
  href,
  onClick,
  showArrow = true,
  standalone = false,
  className = '',
  style = {},
  ...rest
}) {
  // Normalize icon class name (hỗ trợ truyền icon-..., isax icon-..., hoặc chỉ tên icon)
  const getIconClass = (ic) => {
    if (!ic) return 'isax icon-notification';
    if (typeof ic !== 'string') return '';
    if (ic.includes('isax')) return ic;
    if (ic.startsWith('icon-')) return `isax ${ic}`;
    return `isax icon-${ic}`;
  };

  const iconClass = getIconClass(icon);

  // Common interactive classes
  const containerClasses = `group flex flex-wrap sm:flex-nowrap items-start sm:items-center gap-3 sm:gap-4 p-4 sm:p-4.5 transition-colors text-left w-full ${
    standalone
      ? 'border border-[var(--base-border-opaque,#E4E7EC)] rounded-lg'
      : ''
  } ${
    unread
      ? 'bg-[var(--base-brand-primary-50,#F3F6FC)]/70'
      : 'bg-white hover:bg-gray-50/80'
  } ${className}`;

  // Content node
  const renderContent = () => (
    <>
      {/* 1. Icon ở đầu chỉ để màu xanh đặc */}
      <div className="relative shrink-0">
        {iconVariant === 'solid' ? (
          <div
            className="w-10 h-10 rounded-full flex items-center justify-center shrink-0"
            style={{
              backgroundColor: iconBg || 'var(--base-brand-navy, #091F5B)',
              color: iconColor || '#FFFFFF',
            }}
          >
            {typeof icon === 'string' ? (
              <span className={`${iconClass} text-lg`} aria-hidden="true" />
            ) : (
              icon
            )}
          </div>
        ) : (
          <div
            className="w-10 h-10 flex items-center justify-center shrink-0"
            style={{
              color: iconColor || 'var(--base-brand-navy, #091F5B)',
            }}
          >
            {typeof icon === 'string' ? (
              <span className={`${iconClass} text-2xl`} aria-hidden="true" />
            ) : (
              icon
            )}
          </div>
        )}

        {/* Chấm trạng thái chưa đọc định vị tinh gọn góc icon */}
        {unread && (
          <span
            className="absolute -top-0.5 -right-0.5 w-2.5 h-2.5 rounded-full bg-[var(--base-brand-navy,#091F5B)] ring-2 ring-white"
            aria-label="Chưa đọc"
          />
        )}
      </div>

      {/* 2. Phần nội dung (không có tag theo yêu cầu) */}
      <div className="flex-1 min-w-0 basis-[calc(100%-3.5rem)] sm:basis-auto">
        <h4
          className={`text-sm tracking-tight text-gray-900 break-words leading-snug ${
            unread ? 'font-bold' : 'font-semibold'
          }`}
          style={{ fontFamily: "var(--base-font-family, 'Inter', sans-serif)" }}
        >
          {title}
        </h4>
        {message && (
          <p
            className="text-xs text-[var(--base-content-secondary,#475569)] mt-1 leading-relaxed break-words"
            style={{ fontFamily: "var(--base-font-family, 'Inter', sans-serif)" }}
          >
            {message}
          </p>
        )}
      </div>

      {/* 3 & 4. Thời gian & Icon mũi tên */}
      {(time || showArrow) && (
        <div className="flex items-center justify-end gap-2 w-full sm:w-auto pt-1 sm:pt-0 shrink-0">
          {time && (
            <div className="text-left sm:text-right">
              <span
                className="text-xs font-mono text-[var(--color-text-muted,#64748B)] whitespace-nowrap block"
                style={{
                  fontFamily: "var(--base-font-mono, 'Inter', sans-serif)",
                  fontVariantNumeric: 'tabular-nums',
                }}
              >
                {time}
              </span>
            </div>
          )}

          {showArrow && (
            <div className="shrink-0 text-gray-400 group-hover:text-[var(--base-brand-navy,#091F5B)] transition-colors">
              <span className="isax icon-arrow-right-1 text-sm block" aria-hidden="true" />
            </div>
          )}
        </div>
      )}
    </>
  );

  if (to) {
    return (
      <Link
        to={to}
        id={id ? `notif-${id}` : undefined}
        onClick={onClick}
        className={containerClasses}
        style={style}
        {...rest}
      >
        {renderContent()}
      </Link>
    );
  }

  if (href) {
    return (
      <a
        href={href}
        id={id ? `notif-${id}` : undefined}
        onClick={onClick}
        className={containerClasses}
        style={style}
        {...rest}
      >
        {renderContent()}
      </a>
    );
  }

  if (onClick) {
    return (
      <div
        id={id ? `notif-${id}` : undefined}
        role="button"
        tabIndex={0}
        onClick={onClick}
        onKeyDown={(e) => {
          if (e.key === 'Enter' || e.key === ' ') {
            e.preventDefault();
            onClick(e);
          }
        }}
        className={`${containerClasses} cursor-pointer`}
        style={style}
        {...rest}
      >
        {renderContent()}
      </div>
    );
  }

  return (
    <div id={id ? `notif-${id}` : undefined} className={containerClasses} style={style} {...rest}>
      {renderContent()}
    </div>
  );
}

export const NotificationItem = NotificationCard;
export default NotificationCard;
