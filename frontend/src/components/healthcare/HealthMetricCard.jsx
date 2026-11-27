import { Card } from '../ui/Card';
import { StatusBadge } from '../ui/Badge';

const METRIC_DEFAULTS = {
  heart_rate: {
    name: 'Nhịp tim',
    unit: 'bpm',
    icon: 'heart',
  },
  blood_pressure: {
    name: 'Huyết áp',
    unit: 'mmHg',
    icon: 'activity',
  },
  blood_glucose: {
    name: 'Đường huyết',
    unit: 'mmol/L',
    icon: 'drop',
  },
  spo2: {
    name: 'Độ bão hòa oxy (SpO2)',
    unit: '%',
    icon: 'chart-2',
  },
  temperature: {
    name: 'Nhiệt độ cơ thể',
    unit: '°C',
    icon: 'sun-1',
  },
  weight: {
    name: 'Cân nặng',
    unit: 'kg',
    icon: 'weight',
  },
  bmi: {
    name: 'Chỉ số BMI',
    unit: 'kg/m²',
    icon: 'user-octagon',
  },
};

export function HealthMetricCard({
  metricKey,
  metricName,
  value,
  unit,
  status, // 'normal' | 'warning' | 'critical' | 'info'
  statusLabel,
  updatedAt,
  referenceMin,
  referenceMax,
  referenceText,
  icon,
  trend, // 'up' | 'down' | 'stable'
  trendValue,
  className = '',
}) {
  const meta = METRIC_DEFAULTS[metricKey] || {};
  const displayName = metricName || meta.name || 'Chỉ số sức khỏe';
  const displayUnit = unit || meta.unit || '';
  const displayIcon = icon || meta.icon || 'activity';

  // Only show status badge if explicitly specified
  const badgeVariant = status === 'normal' ? 'active' : status;

  const displayRef =
    referenceText ||
    (referenceMin !== undefined && referenceMax !== undefined
      ? `${referenceMin} – ${referenceMax} ${displayUnit}`
      : null);

  const hasFooter = Boolean(displayRef || updatedAt);

  return (
    <Card className={`health-metric-card ${className}`} padding="md">
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 8 }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
          <span
            className="health-metric-icon-wrap"
            style={{
              width: 36,
              height: 36,
              borderRadius: 'var(--radius-full, 999px)',
              backgroundColor: 'var(--color-primary-50, #F0F3FA)',
              color: 'var(--color-primary-600, #091F5B)',
              display: 'inline-flex',
              alignItems: 'center',
              justifyContent: 'center',
              fontSize: 18,
            }}
          >
            <span className={`isax icon-${displayIcon}`} />
          </span>
          <span
            style={{
              fontSize: 14,
              fontWeight: 600,
              color: 'var(--color-text-primary, #0F172A)',
            }}
          >
            {displayName}
          </span>
        </div>

        {badgeVariant && (
          <StatusBadge
            variant={badgeVariant}
            label={statusLabel}
            size="sm"
          />
        )}
      </div>

      <div style={{ marginTop: 14, display: 'flex', alignItems: 'baseline', gap: 6 }}>
        <span
          style={{
            fontSize: 28,
            fontWeight: 700,
            color: 'var(--color-text-primary, #0F172A)',
            lineHeight: 1.1,
          }}
        >
          {value !== undefined && value !== null ? value : '—'}
        </span>
        {displayUnit && (
          <span
            style={{
              fontSize: 14,
              fontWeight: 500,
              color: 'var(--color-text-muted, #64748B)',
            }}
          >
            {displayUnit}
          </span>
        )}

        {trend && (
          <span
            style={{
              marginLeft: 'auto',
              display: 'inline-flex',
              alignItems: 'center',
              gap: 3,
              fontSize: 12,
              fontWeight: 600,
              color:
                trend === 'up'
                  ? 'var(--color-warning-fg, #B45309)'
                  : trend === 'down'
                  ? 'var(--color-info-fg, #0369A1)'
                  : 'var(--color-text-muted, #64748B)',
            }}
          >
            <span
              className={`isax icon-arrow-${
                trend === 'up' ? 'up' : trend === 'down' ? 'down' : 'right'
              }-3`}
              style={{ fontSize: 13 }}
            />
            {trendValue}
          </span>
        )}
      </div>

      {hasFooter && (
        <div
          style={{
            marginTop: 12,
            paddingTop: 10,
            borderTop: '1px solid var(--color-border-default, #E2E8F0)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            fontSize: 12,
            color: 'var(--color-text-muted, #64748B)',
          }}
        >
          {displayRef && <span>Tham chiếu: {displayRef}</span>}
          {updatedAt && <span>{updatedAt}</span>}
        </div>
      )}
    </Card>
  );
}

export default HealthMetricCard;
