/**
 * Alert — DR. MAYDAY Design System
 * Unified single style: clean white surface, subtle border, primary accent bar, uniform typography.
 * No multi-color distraction. All alerts follow one consistent, clinical presentation.
 */
import { useState } from 'react';

export function Alert({
  title,
  message,
  dismissible = false,
  onDismiss,
  actions = [],
  className = '',
}) {
  const [visible, setVisible] = useState(true);
  const [hiding, setHiding] = useState(false);

  function handleDismiss() {
    setHiding(true);
    setTimeout(() => {
      setVisible(false);
      onDismiss?.();
    }, 280);
  }

  if (!visible) return null;

  return (
    <>
      <div
        className={`alert ${hiding ? 'alert--hiding' : ''} ${className}`}
        role="alert"
        aria-live="polite"
        style={{
          display: 'flex',
          gap: '12px',
          backgroundColor: 'var(--color-bg-surface, #FFFFFF)',
          border: '1px solid var(--color-border-default, #E2E8F0)',
          borderLeft: '4px solid var(--color-primary-600, #091F5B)',
          borderRadius: 'var(--radius-card, 8px)',
          padding: '14px 16px',
          boxShadow: 'none',
          animation: hiding ? 'alert-out 0.28s ease forwards' : 'alert-in 0.22s ease',
        }}
      >
        {/* Unified clinical icon */}
        <span
          className="isax icon-info-circle"
          style={{
            color: 'var(--color-primary-600, #091F5B)',
            fontSize: '20px',
            flexShrink: 0,
            marginTop: '1px',
          }}
          aria-hidden="true"
        />

        {/* Content */}
        <div style={{ flex: 1, minWidth: 0 }}>
          {title && (
            <p
              className="alert__title"
              style={{
                margin: '0 0 2px',
                fontWeight: 600,
                fontSize: '14px',
                color: 'var(--color-text-primary, #0F172A)',
              }}
            >
              {title}
            </p>
          )}
          {message && (
            <p
              className="alert__message"
              style={{
                margin: 0,
                fontSize: '13px',
                lineHeight: 1.5,
                color: 'var(--color-text-secondary, #334155)',
              }}
            >
              {message}
            </p>
          )}
          {actions.length > 0 && (
            <div style={{ marginTop: '10px', display: 'flex', gap: '12px', flexWrap: 'wrap' }}>
              {actions.map((action, i) => (
                <button
                  key={i}
                  type="button"
                  onClick={action.onClick}
                  style={{
                    background: 'none',
                    border: 'none',
                    padding: 0,
                    fontWeight: 600,
                    fontSize: '13px',
                    color: 'var(--color-primary-600, #091F5B)',
                    cursor: 'pointer',
                    textDecoration: 'underline',
                  }}
                >
                  {action.label}
                </button>
              ))}
            </div>
          )}
        </div>

        {/* Dismiss button */}
        {dismissible && (
          <button
            type="button"
            onClick={handleDismiss}
            aria-label="Đóng thông báo"
            style={{
              background: 'none',
              border: 'none',
              cursor: 'pointer',
              padding: '2px',
              color: 'var(--color-text-muted, #64748B)',
              flexShrink: 0,
              display: 'flex',
              alignItems: 'flex-start',
            }}
          >
            <span className="isax icon-close-circle" style={{ fontSize: '18px' }} aria-hidden="true" />
          </button>
        )}
      </div>

      <style>{`
        @keyframes alert-in {
          from { opacity: 0; }
          to   { opacity: 1; }
        }
        @keyframes alert-out {
          from { opacity: 1; max-height: 200px; }
          to   { opacity: 0; max-height: 0; padding: 0; overflow: hidden; }
        }
      `}</style>
    </>
  );
}

export default Alert;
