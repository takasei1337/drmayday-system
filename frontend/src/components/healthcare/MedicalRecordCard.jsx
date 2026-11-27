import { Card } from '../ui/Card';
import { StatusBadge } from '../ui/Badge';
import { Button } from '../ui/Button';

export function MedicalRecordCard({
  recordName = 'Hồ sơ bệnh án',
  recordId,
  createdAt,
  doctor,
  department,
  recordType = 'Khám chuyên khoa',
  status = 'completed',
  statusLabel,
  summary,
  onViewDetail,
  className = '',
}) {
  return (
    <Card className={`medical-record-card ${className}`} padding="md">
      <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', gap: 12 }}>
        <div>
          <div style={{ display: 'flex', alignItems: 'center', gap: 8, flexWrap: 'wrap' }}>
            <span
              style={{
                fontSize: 12,
                fontWeight: 600,
                textTransform: 'uppercase',
                color: 'var(--color-primary-600, #091F5B)',
                letterSpacing: '0.04em',
              }}
            >
              {recordType}
            </span>
            {recordId && (
              <span style={{ fontSize: 12, color: 'var(--color-text-muted, #64748B)' }}>
                #{recordId}
              </span>
            )}
          </div>
          <h4
            style={{
              margin: '4px 0 0',
              fontSize: 16,
              fontWeight: 600,
              color: 'var(--color-text-primary, #0F172A)',
            }}
          >
            {recordName}
          </h4>
        </div>

        {status && (
          <StatusBadge variant={status} label={statusLabel} size="sm" />
        )}
      </div>

      {summary && (
        <p
          style={{
            margin: '12px 0 0',
            fontSize: 13,
            color: 'var(--color-text-secondary, #334155)',
            lineHeight: 1.5,
          }}
        >
          {summary}
        </p>
      )}

      <div
        style={{
          marginTop: 14,
          paddingTop: 12,
          borderTop: '1px solid var(--color-border-default, #E2E8F0)',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          flexWrap: 'wrap',
          gap: 10,
        }}
      >
        <div style={{ display: 'flex', alignItems: 'center', gap: 16, fontSize: 12, color: 'var(--color-text-muted, #64748B)' }}>
          {doctor && (
            <span style={{ display: 'inline-flex', alignItems: 'center', gap: 4 }}>
              <span className="isax icon-user" style={{ fontSize: 14 }} />
              {doctor}
            </span>
          )}
          {createdAt && (
            <span style={{ display: 'inline-flex', alignItems: 'center', gap: 4 }}>
              <span className="isax icon-calendar-1" style={{ fontSize: 14 }} />
              {createdAt}
            </span>
          )}
          {department && (
            <span style={{ display: 'inline-flex', alignItems: 'center', gap: 4 }}>
              <span className="isax icon-hospital" style={{ fontSize: 14 }} />
              {department}
            </span>
          )}
        </div>

        {onViewDetail && (
          <Button
            size="sm"
            variant="secondary"
            onClick={onViewDetail}
            trailingIcon="arrow-right-3"
          >
            Chi tiết
          </Button>
        )}
      </div>
    </Card>
  );
}

export default MedicalRecordCard;
