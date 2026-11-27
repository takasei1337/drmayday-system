import { Card } from '../ui/Card';
import { Avatar } from '../ui/Avatar';
import { StatusBadge } from '../ui/Badge';

export function PatientIdentityCard({
  avatar,
  fullName = 'Chưa cập nhật',
  patientCode,
  gender,
  dob,
  age,
  phone,
  status = 'active',
  statusLabel,
  insuranceId,
  address,
  onEdit,
  className = '',
}) {
  return (
    <Card className={`patient-identity-card ${className}`} padding="md">
      <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', gap: 16 }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 14 }}>
          <Avatar src={avatar} name={fullName} size="lg" />
          <div>
            <div style={{ display: 'flex', alignItems: 'center', gap: 8, flexWrap: 'wrap' }}>
              <h3
                style={{
                  margin: 0,
                  fontSize: 18,
                  fontWeight: 700,
                  color: 'var(--color-text-primary, #0F172A)',
                }}
              >
                {fullName}
              </h3>
              {status && (
                <StatusBadge variant={status} label={statusLabel} size="sm" />
              )}
            </div>
            {patientCode && (
              <p
                style={{
                  margin: '4px 0 0',
                  fontSize: 13,
                  fontWeight: 500,
                  color: 'var(--color-primary-600, #091F5B)',
                }}
              >
                Mã BN: {patientCode}
              </p>
            )}
          </div>
        </div>

        {onEdit && (
          <button
            type="button"
            onClick={onEdit}
            style={{
              background: 'none',
              border: 'none',
              cursor: 'pointer',
              color: 'var(--color-text-muted, #64748B)',
              padding: 6,
              borderRadius: '50%',
              display: 'flex',
              alignItems: 'center',
            }}
            aria-label="Chỉnh sửa thông tin"
          >
            <span className="isax icon-edit-2" style={{ fontSize: 18 }} />
          </button>
        )}
      </div>

      <div
        style={{
          display: 'grid',
          gridTemplateColumns: 'repeat(auto-fit, minmax(140px, 1fr))',
          gap: 12,
          marginTop: 18,
          paddingTop: 14,
          borderTop: '1px solid var(--color-border-default, #E2E8F0)',
        }}
      >
        <div>
          <span style={{ fontSize: 12, color: 'var(--color-text-muted, #64748B)', display: 'block' }}>
            Giới tính
          </span>
          <span style={{ fontSize: 14, fontWeight: 500, color: 'var(--color-text-primary, #0F172A)' }}>
            {gender || '—'}
          </span>
        </div>

        <div>
          <span style={{ fontSize: 12, color: 'var(--color-text-muted, #64748B)', display: 'block' }}>
            Ngày sinh / Tuổi
          </span>
          <span style={{ fontSize: 14, fontWeight: 500, color: 'var(--color-text-primary, #0F172A)' }}>
            {dob ? `${dob}${age ? ` (${age} tuổi)` : ''}` : age ? `${age} tuổi` : '—'}
          </span>
        </div>

        <div>
          <span style={{ fontSize: 12, color: 'var(--color-text-muted, #64748B)', display: 'block' }}>
            Số điện thoại
          </span>
          <span style={{ fontSize: 14, fontWeight: 500, color: 'var(--color-text-primary, #0F172A)' }}>
            {phone || '—'}
          </span>
        </div>

        {insuranceId && (
          <div>
            <span style={{ fontSize: 12, color: 'var(--color-text-muted, #64748B)', display: 'block' }}>
              Số BHYT
            </span>
            <span style={{ fontSize: 14, fontWeight: 500, color: 'var(--color-text-primary, #0F172A)' }}>
              {insuranceId}
            </span>
          </div>
        )}

        {address && (
          <div style={{ gridColumn: '1 / -1' }}>
            <span style={{ fontSize: 12, color: 'var(--color-text-muted, #64748B)', display: 'block' }}>
              Địa chỉ
            </span>
            <span style={{ fontSize: 13, color: 'var(--color-text-secondary, #334155)' }}>
              {address}
            </span>
          </div>
        )}
      </div>
    </Card>
  );
}

export default PatientIdentityCard;
