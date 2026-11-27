import { Alert } from '../ui/Alert';
import { Button } from '../ui/Button';

export function ClinicalAlert({
  level = 'informational', // 'critical' | 'warning' | 'informational'
  title,
  message,
  time,
  actions = [],
  dismissible = false,
  onDismiss,
  redFlag = false,
  className = '',
}) {
  // Map level to Alert component levels
  const alertLevel =
    level === 'critical' ? 'error' : level === 'warning' ? 'warning' : 'info';

  if (redFlag) {
    return (
      <div
        className={`clinical-alert-red-flag ${className}`}
        role="alert"
        style={{
          backgroundColor: 'var(--color-error-bg, #FEF2F2)',
          border: '2px solid var(--color-error-fg, #DC2626)',
          borderRadius: 'var(--radius-default, 16px)',
          padding: '20px',
          boxShadow: 'var(--shadow-md, 0 4px 6px -1px rgba(0,0,0,0.1))',
          animation: 'redflag-pulse 2s infinite',
        }}
      >
        <div style={{ display: 'flex', gap: 14, alignItems: 'flex-start' }}>
          <span
            className="isax icon-danger"
            style={{
              fontSize: 28,
              color: 'var(--color-error-fg, #DC2626)',
              flexShrink: 0,
              marginTop: 2,
            }}
          />
          <div style={{ flex: 1 }}>
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 8 }}>
              <h4
                style={{
                  margin: 0,
                  fontSize: 16,
                  fontWeight: 700,
                  color: 'var(--color-error-fg, #DC2626)',
                  textTransform: 'uppercase',
                  letterSpacing: '0.02em',
                }}
              >
                {title || 'Cảnh Báo Lâm Sàng Khẩn Cấp (Báo Động Đỏ)'}
              </h4>
              {time && (
                <span style={{ fontSize: 12, color: 'var(--color-error-fg, #DC2626)', fontWeight: 600 }}>
                  {time}
                </span>
              )}
            </div>

            <p
              style={{
                margin: '6px 0 16px',
                fontSize: 14,
                lineHeight: 1.5,
                color: 'var(--color-text-primary, #0F172A)',
              }}
            >
              {message}
            </p>

            <div style={{ display: 'flex', gap: 10, flexWrap: 'wrap' }}>
              <a
                href="tel:115"
                style={{
                  display: 'inline-flex',
                  alignItems: 'center',
                  gap: 6,
                  padding: '8px 16px',
                  backgroundColor: 'var(--color-error-fg, #DC2626)',
                  color: '#FFFFFF',
                  borderRadius: '999px',
                  fontWeight: 600,
                  fontSize: 14,
                  textDecoration: 'none',
                }}
              >
                <span className="isax icon-call" style={{ fontSize: 16 }} />
                Gọi Cấp Cứu 115
              </a>

              {actions.map((act, i) => (
                <Button
                  key={i}
                  size="sm"
                  variant={act.variant || 'secondary'}
                  onClick={act.onClick}
                >
                  {act.label}
                </Button>
              ))}
            </div>
          </div>
        </div>

        <style>{`
          @keyframes redflag-pulse {
            0%, 100% { border-color: var(--color-error-fg, #DC2626); }
            50% { border-color: rgba(220, 38, 38, 0.4); }
          }
        `}</style>
      </div>
    );
  }

  return (
    <div className={`clinical-alert ${className}`}>
      <Alert
        level={alertLevel}
        title={
          time ? (
            <span style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <span>{title}</span>
              <span style={{ fontSize: 12, fontWeight: 400, opacity: 0.8 }}>{time}</span>
            </span>
          ) : (
            title
          )
        }
        message={message}
        dismissible={dismissible}
        onDismiss={onDismiss}
        actions={actions}
      />
    </div>
  );
}

export default ClinicalAlert;
