/**
 * Shared normalization, validation, and RBAC helpers for Auth & Patient modules.
 */

function createAppError(message, code = 2003, statusCode = 400) {
  const err = new Error(message);
  err.code = code;
  err.statusCode = statusCode;
  return err;
}

function isValidVNPhone(phone) {
  if (!phone || typeof phone !== 'string') return false;
  return /^(0[3|5|7|8|9])[0-9]{8}$/.test(phone.trim());
}

function isValid10DigitPhone(phone) {
  if (!phone || typeof phone !== 'string') return false;
  return /^[0-9]{10}$/.test(phone.trim());
}

/**
 * Chuẩn hóa giới tính cho bảng public.nguoi (CHECK IN ('Nam', 'Nu'))
 * Giá trị 'other' được lưu là null trong Main DB và giữ nguyên ở Sub DB.
 */
function normalizeDbGender(input) {
  if (input === undefined) return { provided: false, dbValue: undefined, rawValue: undefined };
  if (input === null || String(input).trim() === '') {
    return { provided: true, dbValue: null, rawValue: null };
  }
  const normalized = String(input).trim().toLowerCase();
  if (['nam', 'male', 'm', '1'].includes(normalized)) {
    return { provided: true, dbValue: 'Nam', rawValue: String(input).trim() };
  }
  if (['nu', 'nữ', 'female', 'f', '2'].includes(normalized)) {
    return { provided: true, dbValue: 'Nu', rawValue: String(input).trim() };
  }
  if (['other', 'khac', 'khác', '0', '3'].includes(normalized)) {
    return { provided: true, dbValue: null, rawValue: 'other' };
  }
  throw createAppError('Giới tính không hợp lệ (hỗ trợ: Nam, Nu, male, female, other)', 2003, 400);
}

/**
 * Chuẩn hóa nghề nghiệp theo CHECK constraint của public.benhnhan:
 * ('Cong nhan', 'Nong dan', 'Hoc sinh - Sinh vien', 'Can bo cong chuc', 'Khac')
 */
function normalizeCareer(input) {
  if (input === undefined) return undefined;
  if (input === null || String(input).trim() === '') return null;
  const raw = String(input).trim();
  const low = raw.toLowerCase();
  const map = {
    'cong nhan': 'Cong nhan',
    'công nhân': 'Cong nhan',
    worker: 'Cong nhan',
    'nong dan': 'Nong dan',
    'nông dân': 'Nong dan',
    farmer: 'Nong dan',
    'hoc sinh - sinh vien': 'Hoc sinh - Sinh vien',
    'học sinh - sinh viên': 'Hoc sinh - Sinh vien',
    'hoc sinh': 'Hoc sinh - Sinh vien',
    'sinh vien': 'Hoc sinh - Sinh vien',
    student: 'Hoc sinh - Sinh vien',
    'can bo cong chuc': 'Can bo cong chuc',
    'cán bộ công chức': 'Can bo cong chuc',
    'cong chuc': 'Can bo cong chuc',
    officer: 'Can bo cong chuc',
    'staff': 'Can bo cong chuc',
    khac: 'Khac',
    'khác': 'Khac',
    other: 'Khac',
  };
  return map[low] || 'Khac';
}

function getUserRoleLower(user) {
  return String(user?.vai_tro || user?.role_name || '').trim().toLowerCase();
}

function isStaffRole(user) {
  const role = getUserRoleLower(user);
  return ['admin', 'bac_si', 'dieu_duong', 'doctor', 'nurse', 'staff'].includes(role);
}

function isDoctorOrAdmin(user) {
  const role = getUserRoleLower(user);
  return ['admin', 'bac_si', 'doctor'].includes(role);
}

function isPatientRole(user) {
  const role = getUserRoleLower(user);
  return ['benh_nhan', 'patient'].includes(role);
}

function toNumber(val) {
  if (val === null || val === undefined) return null;
  const n = Number(val);
  return Number.isNaN(n) ? null : n;
}

/**
 * Lấy ma_benh_nhan từ user token hoặc query DB theo ma_nguoi
 */
async function resolvePatientIdForUser(db, user) {
  if (user?.ma_benh_nhan) return Number(user.ma_benh_nhan);
  if (!user?.ma_nguoi) return null;
  const res = await db.query(
    'SELECT ma_benh_nhan FROM public.benhnhan WHERE ma_benh_nhan = $1 LIMIT 1',
    [user.ma_nguoi]
  );
  return res.rows[0] ? Number(res.rows[0].ma_benh_nhan) : null;
}

module.exports = {
  createAppError,
  isValidVNPhone,
  isValid10DigitPhone,
  normalizeDbGender,
  normalizeCareer,
  getUserRoleLower,
  isStaffRole,
  isDoctorOrAdmin,
  isPatientRole,
  toNumber,
  resolvePatientIdForUser,
};

