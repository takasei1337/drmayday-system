import { useEffect } from 'react';
import Button from './Button';

const modalStyles = `
.base-modal-backdrop {
  position: fixed;
  inset: 0;
  background-color: rgba(15, 23, 42, 0.55);
  backdrop-filter: blur(4px);
  display: flex;
  align-items: center;
  justify-content: center;
  z-index: 1050;
  padding: 16px;
  animation: modal-fade-in 0.2s ease;
}
.base-modal-dialog {
  background: var(--color-bg-surface, #FFFFFF);
  border-radius: var(--radius-modal, 10px);
  box-shadow: var(--shadow-lg, 0 10px 15px -3px rgba(0,0,0,0.1));
  display: flex;
  flex-direction: column;
  max-height: calc(100vh - 32px);
  width: 100%;
  animation: modal-scale-in 0.2s cubic-bezier(0.16, 1, 0.3, 1);
  overflow: hidden;
}
.base-modal-dialog.size-sm { max-width: 400px; }
.base-modal-dialog.size-md { max-width: 520px; }
.base-modal-dialog.size-lg { max-width: 720px; }
.base-modal-dialog.size-xl { max-width: 960px; }
.base-modal-dialog.size-full { max-width: calc(100vw - 32px); height: calc(100vh - 32px); }

.base-modal-header {
  padding: 18px 24px;
  border-bottom: 1px solid var(--color-border-default, #E2E8F0);
  display: flex;
  align-items: center;
  justify-content: space-between;
}
.base-modal-title {
  margin: 0;
  font-size: 18px;
  font-weight: 600;
  color: var(--color-text-primary, #0F172A);
}
.base-modal-close-btn {
  background: none;
  border: none;
  cursor: pointer;
  padding: 4px;
  border-radius: 50%;
  color: var(--color-icon-muted, #94A3B8);
  display: flex;
  align-items: center;
  justify-content: center;
  transition: color 0.15s ease, background-color 0.15s ease;
}
.base-modal-close-btn:hover {
  color: var(--color-text-primary, #0F172A);
  background-color: var(--color-neutral-100, #F1F5F9);
}
.base-modal-body {
  padding: 24px;
  overflow-y: auto;
  font-size: 14px;
  color: var(--color-text-secondary, #334155);
}
.base-modal-footer {
  padding: 16px 24px;
  border-top: 1px solid var(--color-border-default, #E2E8F0);
  display: flex;
  align-items: center;
  justify-content: flex-end;
  gap: 12px;
  background-color: var(--color-neutral-50, #F8FAFC);
}

@keyframes modal-fade-in {
  from { opacity: 0; }
  to   { opacity: 1; }
}
@keyframes modal-scale-in {
  from { opacity: 0; }
  to   { opacity: 1; }
}
`;

let _modalStylesInjected = false;
function injectModalStyles() {
  if (_modalStylesInjected || typeof document === 'undefined') return;
  _modalStylesInjected = true;
  const style = document.createElement('style');
  style.textContent = modalStyles;
  document.head.appendChild(style);
}

export function Modal({
  open = false,
  onClose,
  title,
  children,
  footer,
  size = 'md',
  closeOnBackdrop = true,
  showCloseButton = true,
  className = '',
}) {
  injectModalStyles();

  useEffect(() => {
    if (!open) return;
    const handleKeyDown = (e) => {
      if (e.key === 'Escape') onClose?.();
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [open, onClose]);

  if (!open) return null;

  return (
    <div
      className="base-modal-backdrop"
      role="dialog"
      aria-modal="true"
      onClick={closeOnBackdrop ? onClose : undefined}
    >
      <div
        className={`base-modal-dialog size-${size} ${className}`}
        onClick={(e) => e.stopPropagation()}
      >
        {(title || showCloseButton) && (
          <div className="base-modal-header">
            {title ? <h3 className="base-modal-title">{title}</h3> : <div />}
            {showCloseButton && (
              <button
                type="button"
                className="base-modal-close-btn"
                onClick={onClose}
                aria-label="Đóng"
              >
                <span className="isax icon-close-circle" style={{ fontSize: 20 }}></span>
              </button>
            )}
          </div>
        )}

        <div className="base-modal-body">{children}</div>

        {footer && <div className="base-modal-footer">{footer}</div>}
      </div>
    </div>
  );
}

export function ConfirmDialog({
  open = false,
  onClose,
  onConfirm,
  title = 'Xác nhận thao tác',
  message,
  confirmLabel = 'Xác nhận',
  cancelLabel = 'Hủy',
  variant = 'default', // 'default' | 'destructive'
  loading = false,
}) {
  return (
    <Modal
      open={open}
      onClose={onClose}
      title={title}
      size="sm"
      footer={
        <>
          <Button variant="secondary" onClick={onClose} disabled={loading}>
            {cancelLabel}
          </Button>
          <Button
            variant={variant === 'destructive' ? 'destructive' : 'primary'}
            onClick={onConfirm}
            loading={loading}
          >
            {confirmLabel}
          </Button>
        </>
      }
    >
      <div style={{ display: 'flex', gap: 14, alignItems: 'flex-start' }}>
        <span
          className={`isax ${
            variant === 'destructive' ? 'icon-warning-2' : 'icon-info-circle'
          }`}
          style={{
            fontSize: 24,
            color:
              variant === 'destructive'
                ? 'var(--color-error-fg, #DC2626)'
                : 'var(--color-primary-600, #091F5B)',
            flexShrink: 0,
            marginTop: 2,
          }}
        />
        <p style={{ margin: 0, lineHeight: 1.5 }}>{message}</p>
      </div>
    </Modal>
  );
}

export default Modal;
