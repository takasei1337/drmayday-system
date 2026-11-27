/**
 * EmptyState — DR. MAYDAY Design System
 * Centered layout with optional Iconsax icon, title, description, and CTA.
 */

export function EmptyState({
  icon,
  title = 'Không có dữ liệu',
  description,
  action,
  className = '',
}) {
  return (
    <div
      className={`empty-state ${className}`}
      style={{
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        justifyContent: 'center',
        textAlign: 'center',
        padding: 'var(--space-10, 40px) var(--space-6, 24px)',
        gap: 'var(--space-3, 12px)',
      }}
    >
      {icon && (
        <span
          className={`isax ${icon} empty-state__icon`}
          aria-hidden="true"
          style={{
            fontSize: '48px',
            color: 'var(--color-icon-muted, #94A3B8)',
            lineHeight: 1,
          }}
        />
      )}

      <p
        className="empty-state__title"
        style={{
          margin: 0,
          fontWeight: 600,
          fontSize: '1rem',
          color: 'var(--color-text-secondary, #334155)',
        }}
      >
        {title}
      </p>

      {description && (
        <p
          className="empty-state__desc"
          style={{
            margin: 0,
            fontSize: '0.875rem',
            color: 'var(--color-text-muted, #64748B)',
            maxWidth: '360px',
          }}
        >
          {description}
        </p>
      )}

      {action && (
        <button
          onClick={action.onClick}
          className="base-btn base-btn-primary base-btn-sm"
          style={{ marginTop: 'var(--space-2, 8px)' }}
        >
          {action.label}
        </button>
      )}
    </div>
  );
}

export default EmptyState;
