import { Card } from '../ui/Card';
import { StatusBadge } from '../ui/Badge';

export function WeeklyHealthMetricCard({
  metricName = 'Chỉ số theo tuần',
  averageValue,
  unit = '',
  trend,
  trendLabel,
  dailyData = [], // [{ day: 'T2', value: 12 }, ...]
  dateRange,
  status,
  statusLabel,
  className = '',
}) {
  const maxVal = Math.max(...dailyData.map((d) => Number(d.value) || 0), 1);

  return (
    <Card className={`weekly-health-metric-card ${className}`} padding="md">
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', gap: 12 }}>
        <div>
          <span
            style={{
              fontSize: 13,
              fontWeight: 600,
              color: 'var(--color-text-secondary, #334155)',
            }}
          >
            {metricName}
          </span>
          {dateRange && (
            <p
              style={{
                margin: '2px 0 0',
                fontSize: 12,
                color: 'var(--color-text-muted, #64748B)',
              }}
            >
              {dateRange}
            </p>
          )}
        </div>

        {status && (
          <StatusBadge variant={status} label={statusLabel} size="sm" />
        )}
      </div>

      <div style={{ marginTop: 12, display: 'flex', alignItems: 'baseline', gap: 6 }}>
        <span
          style={{
            fontSize: 26,
            fontWeight: 700,
            color: 'var(--color-text-primary, #0F172A)',
          }}
        >
          {averageValue !== undefined ? averageValue : '—'}
        </span>
        {unit && (
          <span style={{ fontSize: 13, fontWeight: 500, color: 'var(--color-text-muted, #64748B)' }}>
            {unit}
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
                trend === 'down'
                  ? 'var(--color-success-fg, #15803D)'
                  : trend === 'up'
                  ? 'var(--color-warning-fg, #B45309)'
                  : 'var(--color-text-muted, #64748B)',
            }}
          >
            <span
              className={`isax icon-arrow-${
                trend === 'up' ? 'up' : trend === 'down' ? 'down' : 'right'
              }-3`}
              style={{ fontSize: 13 }}
            />
            {trendLabel}
          </span>
        )}
      </div>

      {/* Daily mini chart */}
      {dailyData.length > 0 && (
        <div style={{ marginTop: 16 }}>
          <div
            style={{
              display: 'flex',
              alignItems: 'flex-end',
              justifyContent: 'space-between',
              height: 56,
              gap: 6,
              padding: '0 4px',
            }}
          >
            {dailyData.map((d, i) => {
              const val = Number(d.value) || 0;
              const heightPercent = Math.max(8, Math.round((val / maxVal) * 100));

              return (
                <div
                  key={i}
                  style={{
                    flex: 1,
                    display: 'flex',
                    flexDirection: 'column',
                    alignItems: 'center',
                    height: '100%',
                    justifyContent: 'flex-end',
                  }}
                  title={`${d.day}: ${val} ${unit}`}
                >
                  <div
                    style={{
                      width: '100%',
                      maxWidth: 18,
                      height: `${heightPercent}%`,
                      backgroundColor:
                        i === dailyData.length - 1
                          ? 'var(--color-primary-600, #091F5B)'
                          : 'var(--color-primary-200, #BAC8E5)',
                      borderRadius: 'var(--radius-xs, 4px) var(--radius-xs, 4px) 0 0',
                      transition: 'height 0.3s ease',
                    }}
                  />
                  <span
                    style={{
                      fontSize: 12,
                      fontWeight: 500,
                      color: 'var(--color-text-muted, #64748B)',
                      marginTop: 4,
                    }}
                  >
                    {d.day}
                  </span>
                </div>
              );
            })}
          </div>
        </div>
      )}
    </Card>
  );
}

export default WeeklyHealthMetricCard;
