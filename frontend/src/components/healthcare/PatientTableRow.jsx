import { TableRow, TableCell } from '../ui/Table';
import { Checkbox } from '../ui/Checkbox';
import { Avatar } from '../ui/Avatar';
import { StatusBadge } from '../ui/Badge';
import { Dropdown } from '../ui/Dropdown';

export function PatientTableRow({
  selected = false,
  onSelect,
  avatar,
  patientInfo = {}, // { name, code, gender, age }
  contactInfo = {}, // { phone, email }
  status = 'active',
  statusLabel,
  updatedAt,
  actions = [],
  className = '',
}) {
  const { name = 'Chưa cập nhật', code, gender, age } = patientInfo;
  const { phone } = contactInfo;

  return (
    <TableRow selected={selected} className={`patient-table-row ${className}`}>
      {/* Checkbox cell */}
      <TableCell width="48px">
        <Checkbox
          checked={selected}
          onChange={(e) => onSelect && onSelect(e.target.checked)}
          disabled={!onSelect}
          aria-label={`Chọn bệnh nhân ${name}`}
        />
      </TableCell>

      {/* Dedicated Column: Mã hồ sơ bệnh nhân */}
      <TableCell className="base-mono" style={{ whiteSpace: 'nowrap', fontWeight: 600, color: 'var(--base-brand-navy, #091F5B)' }}>
        {code || '—'}
      </TableCell>

      {/* Dedicated Column: Họ và tên bệnh nhân (Avatar + Tên) */}
      <TableCell style={{ whiteSpace: 'nowrap' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
          <Avatar src={avatar} name={name} size="sm" />
          <span style={{ fontWeight: 600, color: 'var(--color-text-primary, #0F172A)' }}>
            {name}
          </span>
        </div>
      </TableCell>

      {/* Dedicated Column: Số điện thoại */}
      <TableCell className="base-mono" style={{ whiteSpace: 'nowrap', color: 'var(--color-text-primary, #0F172A)' }}>
        {phone || '—'}
      </TableCell>

      {/* Dedicated Column: Giới tính */}
      <TableCell style={{ whiteSpace: 'nowrap', color: 'var(--color-text-secondary, #334155)' }}>
        {gender || '—'}
      </TableCell>

      {/* Dedicated Column: Tuổi */}
      <TableCell className="base-mono" style={{ whiteSpace: 'nowrap', color: 'var(--color-text-secondary, #334155)' }}>
        {age ? `${age} tuổi` : '—'}
      </TableCell>

      {/* Status cell */}
      <TableCell style={{ whiteSpace: 'nowrap' }}>
        <StatusBadge variant={status} label={statusLabel} size="sm" />
      </TableCell>

      {/* Updated at cell */}
      <TableCell style={{ whiteSpace: 'nowrap' }}>
        <span style={{ fontSize: 12, color: 'var(--color-text-muted, #64748B)' }}>
          {updatedAt || '—'}
        </span>
      </TableCell>

      {/* Action menu cell (Sticky right) */}
      <TableCell align="right" width="60px" sticky style={{ whiteSpace: 'nowrap' }}>
        {actions.length > 0 && (
          <Dropdown
            align="right"
            trigger={
              <button
                type="button"
                style={{
                  background: 'none',
                  border: 'none',
                  padding: 6,
                  borderRadius: '50%',
                  cursor: 'pointer',
                  color: 'var(--color-icon-muted, #94A3B8)',
                  display: 'flex',
                  alignItems: 'center',
                }}
                aria-label="Thao tác"
              >
                <span className="isax icon-more" style={{ fontSize: 18 }} />
              </button>
            }
            items={actions}
          />
        )}
      </TableCell>
    </TableRow>
  );
}

export default PatientTableRow;
