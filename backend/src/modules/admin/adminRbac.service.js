const bcrypt = require('bcryptjs');
const db = require('../../config/db');
const prisma = require('../../config/prisma');
const { createSheetError } = require('../../common/response');

const VN_PHONE_REGEX = /^(03|05|07|08|09)[0-9]{8}$/;
const PERMISSION_NAME_REGEX = /^[A-Za-z][A-Za-z0-9_.:-]*$/;
const MAX_ROLE_PERMISSIONS_BATCH = 50;
const XSS_PATTERN =
  /<\s*\/?\s*[a-zA-Z][^>]*>|<\s*(script|iframe|object|embed|svg|img|body|style|link|meta|form|input|button|a)\b|javascript\s*:|vbscript\s*:|data\s*:\s*text\/html|on(?:error|load|click|mouseover|focus|blur|submit|change|input|keydown|keyup|mouseenter|mouseleave)\s*=/i;

function hasControlChars(str) {
  return /[\x00-\x08\x0B\x0C\x0E-\x1F\x7F]/.test(str);
}

function validateOptionalDescription(value, maxLength = 500) {
  if (value === undefined) return undefined;
  if (value === null) return null;
  if (typeof value !== 'string') {
    throw createSheetError('Kiểu dữ liệu description không hợp lệ', 1003, 400);
  }
  const trimmed = value.trim();
  if (value.length > 0 && trimmed === '') {
    throw createSheetError('description không được chỉ chứa khoảng trắng', 1004, 400);
  }
  if (trimmed.length > maxLength || XSS_PATTERN.test(trimmed) || hasControlChars(trimmed)) {
    throw createSheetError(
      `description không hợp lệ hoặc vượt quá ${maxLength} ký tự`,
      1004,
      400
    );
  }
  return trimmed;
}

const GENDER_INPUT_MAP = {
  male: { dbGender: 'Nam', rawGender: 'male' },
  nam: { dbGender: 'Nam', rawGender: 'male' },
  female: { dbGender: 'Nu', rawGender: 'female' },
  nu: { dbGender: 'Nu', rawGender: 'female' },
  'nữ': { dbGender: 'Nu', rawGender: 'female' },
  other: { dbGender: null, rawGender: 'other' },
  khac: { dbGender: null, rawGender: 'other' },
  'khác': { dbGender: null, rawGender: 'other' },
};

function isValidVNPhone(phone) {
  return typeof phone === 'string' && VN_PHONE_REGEX.test(phone.trim());
}

function parsePositiveInt(value, fieldName, { required = false } = {}) {
  if (value === undefined || value === null || value === '') {
    if (required) {
      throw createSheetError(`Thiếu tham số bắt buộc: ${fieldName}`, 1002, 400);
    }
    return null;
  }

  if (typeof value === 'boolean' || typeof value === 'object') {
    throw createSheetError(`Kiểu dữ liệu không hợp lệ cho ${fieldName}`, 1003, 400);
  }

  if (typeof value !== 'string' && typeof value !== 'number') {
    throw createSheetError(`Kiểu dữ liệu không hợp lệ cho ${fieldName}`, 1003, 400);
  }

  if (typeof value === 'string' && value.trim() === '') {
    throw createSheetError(`Giá trị không hợp lệ cho ${fieldName}`, 1004, 400);
  }

  if (typeof value === 'number' && !Number.isInteger(value)) {
    throw createSheetError(`Kiểu dữ liệu không hợp lệ cho ${fieldName}`, 1003, 400);
  }

  const str = String(value).trim();
  if (!/^-?\d+$/.test(str)) {
    throw createSheetError(`Kiểu dữ liệu không hợp lệ cho ${fieldName}`, 1003, 400);
  }

  const num = Number(str);
  if (!Number.isSafeInteger(num) || num <= 0) {
    throw createSheetError(`Giá trị không hợp lệ cho ${fieldName}`, 1004, 400);
  }

  return num;
}

function parseActiveFlag(value, defaultValue = 1) {
  if (value === undefined || value === null || value === '') {
    return defaultValue;
  }
  if (value === true || value === 1 || value === '1') return 1;
  if (value === false || value === 0 || value === '0') return 0;
  throw createSheetError('Giá trị is_active chỉ nhận 0 hoặc 1', 1004, 400);
}

function mapGenderInput(gender) {
  if (gender === undefined || gender === null || String(gender).trim() === '') {
    return { provided: false, dbGender: null, rawGender: null };
  }
  if (typeof gender !== 'string') {
    throw createSheetError('Kiểu dữ liệu gender không hợp lệ', 1003, 400);
  }
  const key = gender.trim().toLowerCase();
  const mapped = GENDER_INPUT_MAP[key];
  if (!mapped) {
    throw createSheetError('Giá trị giới tính không hợp lệ (male, female, other)', 1004, 400);
  }
  return { provided: true, dbGender: mapped.dbGender, rawGender: mapped.rawGender };
}

function formatGenderOutput(dbGender, extraProfile) {
  if (extraProfile && extraProfile.genderRaw) {
    return extraProfile.genderRaw;
  }
  if (dbGender === 'Nam') return 'male';
  if (dbGender === 'Nu') return 'female';
  return null;
}

function isPatientRoleName(roleName) {
  const normalized = String(roleName || '').trim().toLowerCase();
  return normalized === 'benh_nhan' || normalized === 'patient';
}

function toIsoOrNull(val) {
  if (!val) return null;
  const d = val instanceof Date ? val : new Date(val);
  return Number.isNaN(d.getTime()) ? null : d.toISOString();
}

class AdminRbacService {
  async _getDefaultBranchId(client = db) {
    const activeRes = await client.query(
      'SELECT ma_chi_nhanh FROM public.chinhanh WHERE trang_thai = TRUE ORDER BY ma_chi_nhanh ASC LIMIT 1'
    );
    if (activeRes.rows[0]) {
      return Number(activeRes.rows[0].ma_chi_nhanh);
    }

    const anyRes = await client.query(
      'SELECT ma_chi_nhanh FROM public.chinhanh ORDER BY ma_chi_nhanh ASC LIMIT 1'
    );
    if (anyRes.rows[0]) {
      return Number(anyRes.rows[0].ma_chi_nhanh);
    }

    throw createSheetError('Chưa có chi nhánh nào trong hệ thống', 9992, 404);
  }

  async _findAccountByUserId(userId) {
    const query = `
      SELECT tk.ma_tai_khoan, tk.ma_nguoi, tk.ma_vai_tro, tk.ten_dang_nhap,
             tk.trang_thai_hoat_dong, tk.thoi_diem_tao, tk.thoi_diem_cap_nhat,
             vt.ten_vai_tro, vt.ten_hien_thi,
             ng.ho_ten, ng.ngay_sinh, ng.gioi_tinh, ng.so_dien_thoai,
             ng.dia_chi_tinh_tp, ng.dia_chi_xa_phuong, ng.dia_chi_so_nha_thon_pho,
             bn.ma_benh_nhan, bn.nghe_nghiep, bn.dan_toc, bn.bhyt_so_the, bn.bhyt_gia_tri_den,
             bn.nguoi_nha_ho_ten_dia_chi, bn.nguoi_nha_so_dien_thoai,
             nv.ma_nhan_vien, nv.ma_chi_nhanh AS nv_ma_chi_nhanh
      FROM public.taikhoan tk
      JOIN public.nguoi ng ON tk.ma_nguoi = ng.ma_nguoi
      JOIN public.vaitro vt ON tk.ma_vai_tro = vt.ma_vai_tro
      LEFT JOIN public.benhnhan bn ON bn.ma_benh_nhan = ng.ma_nguoi
      LEFT JOIN public.nhanvien nv ON nv.ma_nhan_vien = ng.ma_nguoi
      WHERE tk.ma_tai_khoan = $1 OR tk.ma_nguoi = $1
      ORDER BY CASE WHEN tk.ma_tai_khoan = $1 THEN 0 ELSE 1 END
      LIMIT 1
    `;
    const result = await db.query(query, [userId]);
    if (!result.rows[0]) {
      throw createSheetError('Người dùng không tồn tại', 9992, 404);
    }
    return result.rows[0];
  }

  async _buildUserDetailResponse(row) {
    const maNguoiBig = BigInt(row.ma_nguoi);
    const isPatient = isPatientRoleName(row.ten_vai_tro);
    const isStaff = Boolean(row.ma_nhan_vien) || !isPatient;

    const [extraProfile, staffMeta, firstVisitRes] = await Promise.all([
      prisma.patientExtraProfile.findUnique({ where: { maNguoi: maNguoiBig } }),
      isStaff ? prisma.staffAssignmentMeta.findUnique({ where: { maNhanVien: maNguoiBig } }) : Promise.resolve(null),
      row.ma_benh_nhan
        ? db.query(
            'SELECT MIN(thoi_diem_kham_lan_dau) AS first_visit FROM public.hosobenhan WHERE ma_benh_nhan = $1',
            [row.ma_benh_nhan]
          )
        : Promise.resolve({ rows: [] }),
    ]);

    const firstVisitFromDb = firstVisitRes.rows[0]?.first_visit || null;
    const firstVisit = extraProfile?.firstVisit || firstVisitFromDb;

    const detail = {
      user_id: Number(row.ma_tai_khoan),
      full_name: row.ho_ten,
      phone: row.so_dien_thoai || row.ten_dang_nhap,
      role_id: Number(row.ma_vai_tro),
      is_active: row.trang_thai_hoat_dong ? 1 : 0,
      gender: formatGenderOutput(row.gioi_tinh, extraProfile),
      year_of_birth:
        extraProfile?.yearOfBirth !== null && extraProfile?.yearOfBirth !== undefined
          ? Number(extraProfile.yearOfBirth)
          : row.ngay_sinh
            ? new Date(row.ngay_sinh).getUTCFullYear()
            : null,
      career: row.nghe_nghiep ?? null,
      ethnic: row.dan_toc ?? null,
      hamlet_address: row.dia_chi_so_nha_thon_pho ?? null,
      commune_address: row.dia_chi_xa_phuong ?? null,
      city_address: row.dia_chi_tinh_tp ?? null,
      work_place: extraProfile?.workPlace ?? null,
      health_insurance_number: row.bhyt_so_the ?? null,
      health_insurance_validate:
        extraProfile?.healthInsuranceValidate ??
        (row.bhyt_gia_tri_den ? new Date(row.bhyt_gia_tri_den).toISOString().slice(0, 10) : null),
      next_of_kin_name: row.nguoi_nha_ho_ten_dia_chi ?? null,
      next_of_kin_phone: row.nguoi_nha_so_dien_thoai ?? null,
      first_visit: toIsoOrNull(firstVisit),
    };

    if (isStaff) {
      detail.branch_id =
        staffMeta?.branchId !== null && staffMeta?.branchId !== undefined
          ? Number(staffMeta.branchId)
          : row.nv_ma_chi_nhanh !== null && row.nv_ma_chi_nhanh !== undefined
            ? Number(row.nv_ma_chi_nhanh)
            : null;
      detail.department_id =
        staffMeta?.departmentId !== null && staffMeta?.departmentId !== undefined
          ? Number(staffMeta.departmentId)
          : null;
      detail.room_id =
        staffMeta?.roomId !== null && staffMeta?.roomId !== undefined
          ? Number(staffMeta.roomId)
          : null;
    }

    return detail;
  }

  // 1. POST /admin/users
  async createUser(payload = {}) {
    const rawFullName = payload.full_name;
    const rawPhone = payload.phone;
    const password = payload.password;
    const rawRoleId = payload.role_id;

    if (
      rawFullName === undefined ||
      rawFullName === null ||
      String(rawFullName).trim() === '' ||
      rawPhone === undefined ||
      rawPhone === null ||
      String(rawPhone).trim() === '' ||
      password === undefined ||
      password === null ||
      password === '' ||
      rawRoleId === undefined ||
      rawRoleId === null ||
      rawRoleId === ''
    ) {
      throw createSheetError('Thiếu trường thông tin bắt buộc', 1002, 400);
    }

    if (typeof rawFullName !== 'string' || typeof rawPhone !== 'string' || typeof password !== 'string') {
      throw createSheetError('Kiểu dữ liệu đầu vào không hợp lệ', 1003, 400);
    }

    const fullName = rawFullName.trim();
    const phone = rawPhone.trim();
    const roleId = parsePositiveInt(rawRoleId, 'role_id', { required: true });
    const isActive = parseActiveFlag(payload.is_active, 1);
    const genderInfo = mapGenderInput(payload.gender);

    if (!isValidVNPhone(phone)) {
      throw createSheetError('Số điện thoại không đúng chuẩn VN (03/05/07/08/09)', 1004, 400);
    }

    if (password.length < 6) {
      throw createSheetError('Mật khẩu phải có tối thiểu 6 ký tự', 1004, 400);
    }

    const dupCheck = await db.query(
      `
      SELECT tk.ma_tai_khoan
      FROM public.taikhoan tk
      LEFT JOIN public.nguoi ng ON tk.ma_nguoi = ng.ma_nguoi
      WHERE tk.ten_dang_nhap = $1 OR ng.so_dien_thoai = $1
      LIMIT 1
      `,
      [phone]
    );
    if (dupCheck.rows.length > 0) {
      throw createSheetError('Số điện thoại hoặc tên đăng nhập đã tồn tại', 9996, 409);
    }

    const roleRes = await db.query(
      'SELECT ma_vai_tro, ten_vai_tro, ten_hien_thi FROM public.vaitro WHERE ma_vai_tro = $1 LIMIT 1',
      [roleId]
    );
    const role = roleRes.rows[0];
    if (!role) {
      throw createSheetError('Vai trò không tồn tại', 9992, 404);
    }

    const isPatient = isPatientRoleName(role.ten_vai_tro);
    const salt = await bcrypt.genSalt(10);
    const hashedPassword = await bcrypt.hash(password, salt);

    const client = await db.pool.connect();
    let maNguoi;
    let maTaiKhoan;
    let defaultBranchId = null;

    try {
      await client.query('BEGIN');

      const nguoiRes = await client.query(
        `
        INSERT INTO public.nguoi (ho_ten, so_dien_thoai, gioi_tinh)
        VALUES ($1, $2, $3)
        RETURNING ma_nguoi
        `,
        [fullName, phone, genderInfo.dbGender]
      );
      maNguoi = nguoiRes.rows[0].ma_nguoi;

      const tkRes = await client.query(
        `
        INSERT INTO public.taikhoan (ma_nguoi, ma_vai_tro, ten_dang_nhap, mat_khau_ma_hoa, trang_thai_hoat_dong)
        VALUES ($1, $2, $3, $4, $5)
        RETURNING ma_tai_khoan
        `,
        [maNguoi, roleId, phone, hashedPassword, isActive === 1]
      );
      maTaiKhoan = tkRes.rows[0].ma_tai_khoan;

      if (isPatient) {
        await client.query(
          'INSERT INTO public.benhnhan (ma_benh_nhan) VALUES ($1)',
          [maNguoi]
        );
      } else {
        defaultBranchId = await this._getDefaultBranchId(client);
        await client.query(
          'INSERT INTO public.nhanvien (ma_nhan_vien, ma_chi_nhanh) VALUES ($1, $2)',
          [maNguoi, defaultBranchId]
        );
      }

      await client.query('COMMIT');
    } catch (err) {
      await client.query('ROLLBACK');
      throw err;
    } finally {
      client.release();
    }

    if (genderInfo.provided) {
      await prisma.patientExtraProfile.upsert({
        where: { maNguoi: BigInt(maNguoi) },
        update: { genderRaw: genderInfo.rawGender },
        create: { maNguoi: BigInt(maNguoi), genderRaw: genderInfo.rawGender },
      });
    }

    if (!isPatient && defaultBranchId !== null) {
      await prisma.staffAssignmentMeta.upsert({
        where: { maNhanVien: BigInt(maNguoi) },
        update: { branchId: BigInt(defaultBranchId) },
        create: { maNhanVien: BigInt(maNguoi), branchId: BigInt(defaultBranchId) },
      });
    }

    return {
      user_id: Number(maTaiKhoan),
      full_name: fullName,
      phone,
      role_id: Number(roleId),
      is_active: isActive,
    };
  }

  // 2. GET /admin/users
  async listUsers(queryParams = {}) {
    const page = queryParams.page !== undefined && queryParams.page !== ''
      ? parsePositiveInt(queryParams.page, 'page')
      : 1;
    const limit = queryParams.limit !== undefined && queryParams.limit !== ''
      ? parsePositiveInt(queryParams.limit, 'limit')
      : 20;
    const roleId = queryParams.role_id !== undefined && queryParams.role_id !== ''
      ? parsePositiveInt(queryParams.role_id, 'role_id')
      : null;

    if (limit > 200) {
      throw createSheetError('limit không được vượt quá 200', 1004, 400);
    }

    const offset = (page - 1) * limit;

    const [countRes, listRes] = await Promise.all([
      db.query(
        `
        SELECT COUNT(*)::int AS total
        FROM public.taikhoan tk
        WHERE ($1::bigint IS NULL OR tk.ma_vai_tro = $1)
        `,
        [roleId]
      ),
      db.query(
        `
        SELECT tk.ma_tai_khoan, tk.ma_vai_tro, tk.ten_dang_nhap, tk.trang_thai_hoat_dong,
               ng.ho_ten, ng.so_dien_thoai
        FROM public.taikhoan tk
        JOIN public.nguoi ng ON tk.ma_nguoi = ng.ma_nguoi
        WHERE ($1::bigint IS NULL OR tk.ma_vai_tro = $1)
        ORDER BY tk.ma_tai_khoan ASC
        LIMIT $2 OFFSET $3
        `,
        [roleId, limit, offset]
      ),
    ]);

    const total = Number(countRes.rows[0]?.total || 0);
    const data = listRes.rows.map((r) => ({
      user_id: Number(r.ma_tai_khoan),
      full_name: r.ho_ten,
      phone: r.so_dien_thoai || r.ten_dang_nhap,
      role_id: Number(r.ma_vai_tro),
      is_active: r.trang_thai_hoat_dong ? 1 : 0,
    }));

    return { data, total };
  }

  // 3. GET /admin/users/:id
  async getUserById(rawId) {
    const userId = parsePositiveInt(rawId, 'id', { required: true });
    const row = await this._findAccountByUserId(userId);
    return this._buildUserDetailResponse(row);
  }

  // 4. PUT /admin/users/:id
  async updateUser(rawId, payload = {}) {
    const userId = parsePositiveInt(rawId, 'id', { required: true });
    const existing = await this._findAccountByUserId(userId);

    const hasFullName = payload.full_name !== undefined;
    let nextFullName = null;
    if (hasFullName) {
      if (typeof payload.full_name !== 'string' || payload.full_name.trim() === '') {
        throw createSheetError('full_name không hợp lệ', 1004, 400);
      }
      nextFullName = payload.full_name.trim();
    }

    const genderInfo = mapGenderInput(payload.gender);

    const hasRoleId = payload.role_id !== undefined;
    let nextRole = null;
    if (hasRoleId) {
      const nextRoleId = parsePositiveInt(payload.role_id, 'role_id', { required: true });
      const roleRes = await db.query(
        'SELECT ma_vai_tro, ten_vai_tro FROM public.vaitro WHERE ma_vai_tro = $1 LIMIT 1',
        [nextRoleId]
      );
      if (!roleRes.rows[0]) {
        throw createSheetError('Vai trò không tồn tại', 9992, 404);
      }
      nextRole = roleRes.rows[0];
    }

    const hasIsActive = payload.is_active !== undefined;
    const nextIsActive = hasIsActive ? parseActiveFlag(payload.is_active) : null;

    const client = await db.pool.connect();
    let defaultBranchId = null;
    let ensuredStaff = false;

    try {
      await client.query('BEGIN');

      if (hasFullName || genderInfo.provided) {
        await client.query(
          `
          UPDATE public.nguoi
          SET ho_ten = COALESCE($1, ho_ten),
              gioi_tinh = CASE WHEN $2::boolean THEN $3 ELSE gioi_tinh END,
              thoi_diem_cap_nhat = CURRENT_TIMESTAMP
          WHERE ma_nguoi = $4
          `,
          [nextFullName, genderInfo.provided, genderInfo.dbGender, existing.ma_nguoi]
        );
      }

      if (hasRoleId || hasIsActive) {
        await client.query(
          `
          UPDATE public.taikhoan
          SET ma_vai_tro = COALESCE($1, ma_vai_tro),
              trang_thai_hoat_dong = CASE WHEN $2::boolean THEN $3 ELSE trang_thai_hoat_dong END,
              thoi_diem_cap_nhat = CURRENT_TIMESTAMP
          WHERE ma_tai_khoan = $4
          `,
          [
            nextRole ? nextRole.ma_vai_tro : null,
            hasIsActive,
            nextIsActive === 1,
            existing.ma_tai_khoan,
          ]
        );
      }

      if (nextRole) {
        if (isPatientRoleName(nextRole.ten_vai_tro)) {
          await client.query(
            'INSERT INTO public.benhnhan (ma_benh_nhan) VALUES ($1) ON CONFLICT (ma_benh_nhan) DO NOTHING',
            [existing.ma_nguoi]
          );
        } else if (!existing.ma_nhan_vien) {
          defaultBranchId = await this._getDefaultBranchId(client);
          await client.query(
            'INSERT INTO public.nhanvien (ma_nhan_vien, ma_chi_nhanh) VALUES ($1, $2) ON CONFLICT (ma_nhan_vien) DO NOTHING',
            [existing.ma_nguoi, defaultBranchId]
          );
          ensuredStaff = true;
        }
      }

      await client.query('COMMIT');
    } catch (err) {
      await client.query('ROLLBACK');
      throw err;
    } finally {
      client.release();
    }

    if (genderInfo.provided) {
      await prisma.patientExtraProfile.upsert({
        where: { maNguoi: BigInt(existing.ma_nguoi) },
        update: { genderRaw: genderInfo.rawGender },
        create: { maNguoi: BigInt(existing.ma_nguoi), genderRaw: genderInfo.rawGender },
      });
    }

    if (ensuredStaff && defaultBranchId !== null) {
      await prisma.staffAssignmentMeta.upsert({
        where: { maNhanVien: BigInt(existing.ma_nguoi) },
        update: { branchId: BigInt(defaultBranchId) },
        create: { maNhanVien: BigInt(existing.ma_nguoi), branchId: BigInt(defaultBranchId) },
      });
    }

    const updated = await this._findAccountByUserId(Number(existing.ma_tai_khoan));
    return this._buildUserDetailResponse(updated);
  }

  // 5. DELETE /admin/users/:id
  async deleteUser(rawId) {
    const userId = parsePositiveInt(rawId, 'id', { required: true });
    const existing = await this._findAccountByUserId(userId);

    const maTaiKhoan = existing.ma_tai_khoan;
    const maNguoi = existing.ma_nguoi;

    const client = await db.pool.connect();
    try {
      await client.query('BEGIN');

      await client.query('DELETE FROM public.taikhoan WHERE ma_tai_khoan = $1', [maTaiKhoan]);
      await client.query('UPDATE public.vaitroquyenhan SET ma_nguoi_gan = NULL WHERE ma_nguoi_gan = $1', [maNguoi]);
      await client.query('DELETE FROM public.nhanvien WHERE ma_nhan_vien = $1', [maNguoi]);
      await client.query('DELETE FROM public.benhnhan WHERE ma_benh_nhan = $1', [maNguoi]);
      await client.query('DELETE FROM public.nguoi WHERE ma_nguoi = $1', [maNguoi]);

      await client.query('COMMIT');
    } catch (err) {
      await client.query('ROLLBACK');
      if (err && err.code === '23503') {
        throw createSheetError('Người dùng đang có hồ sơ lâm sàng, không thể xóa', 1010, 409);
      }
      throw err;
    } finally {
      client.release();
    }

    const maNguoiBig = BigInt(maNguoi);
    const maTaiKhoanBig = BigInt(maTaiKhoan);
    await Promise.allSettled([
      prisma.patientExtraProfile.deleteMany({ where: { maNguoi: maNguoiBig } }),
      prisma.staffAssignmentMeta.deleteMany({ where: { maNhanVien: maNguoiBig } }),
      prisma.tokenBlacklist.deleteMany({ where: { maTaiKhoan: maTaiKhoanBig } }),
      prisma.deviceToken.deleteMany({ where: { userId: maTaiKhoanBig } }),
      prisma.notification.deleteMany({ where: { userId: maTaiKhoanBig } }),
      prisma.passwordResetToken.deleteMany({ where: { maTaiKhoan: maTaiKhoanBig } }),
    ]);

    return {};
  }

  // 6. PUT /admin/users/:id/assign
  async assignStaff(rawId, payload = {}) {
    const userId = parsePositiveInt(rawId, 'id', { required: true });
    const branchId = parsePositiveInt(payload.branch_id, 'branch_id', { required: true });
    const departmentId = parsePositiveInt(payload.department_id, 'department_id', { required: true });
    const roomId =
      payload.room_id !== undefined && payload.room_id !== null && payload.room_id !== ''
        ? parsePositiveInt(payload.room_id, 'room_id')
        : null;

    const existing = await this._findAccountByUserId(userId);
    if (isPatientRoleName(existing.ten_vai_tro) && !existing.ma_nhan_vien) {
      throw createSheetError('Người dùng là bệnh nhân, không thể phân công nhân viên', 1004, 400);
    }

    const [branchRes, dept, roomRes] = await Promise.all([
      db.query('SELECT ma_chi_nhanh FROM public.chinhanh WHERE ma_chi_nhanh = $1 LIMIT 1', [branchId]),
      prisma.department.findUnique({ where: { id: departmentId } }),
      roomId !== null
        ? db.query('SELECT ma_phong_kham FROM public.phongkham WHERE ma_phong_kham = $1 LIMIT 1', [roomId])
        : Promise.resolve({ rows: [] }),
    ]);

    if (!branchRes.rows[0]) {
      throw createSheetError('Chi nhánh không tồn tại', 9992, 404);
    }
    if (!dept) {
      throw createSheetError('Khoa/phòng ban không tồn tại', 9992, 404);
    }
    if (roomId !== null && !roomRes.rows[0]) {
      throw createSheetError('Phòng khám không tồn tại', 9992, 404);
    }

    await db.query(
      `
      INSERT INTO public.nhanvien (ma_nhan_vien, ma_chi_nhanh)
      VALUES ($1, $2)
      ON CONFLICT (ma_nhan_vien) DO UPDATE SET ma_chi_nhanh = EXCLUDED.ma_chi_nhanh
      `,
      [existing.ma_nguoi, branchId]
    );

    await prisma.staffAssignmentMeta.upsert({
      where: { maNhanVien: BigInt(existing.ma_nguoi) },
      update: {
        branchId: BigInt(branchId),
        departmentId,
        roomId: roomId !== null ? BigInt(roomId) : null,
      },
      create: {
        maNhanVien: BigInt(existing.ma_nguoi),
        branchId: BigInt(branchId),
        departmentId,
        roomId: roomId !== null ? BigInt(roomId) : null,
      },
    });

    return {
      user_id: Number(existing.ma_tai_khoan),
      branch_id: Number(branchId),
      department_id: Number(departmentId),
      room_id: roomId !== null ? Number(roomId) : null,
    };
  }

  // 7. POST /roles
  async createRole(payload = {}) {
    if (!payload || typeof payload !== 'object' || Array.isArray(payload)) {
      throw createSheetError('Kiểu dữ liệu payload không hợp lệ', 1003, 400);
    }
    if (payload.name === undefined || payload.name === null || payload.name === '') {
      throw createSheetError('Thiếu tên vai trò (name)', 1002, 400);
    }
    if (typeof payload.name !== 'string') {
      throw createSheetError('Kiểu dữ liệu name không hợp lệ', 1003, 400);
    }

    const name = payload.name.trim();
    if (!name || name.length > 50 || XSS_PATTERN.test(name) || hasControlChars(name)) {
      throw createSheetError('Tên vai trò không hợp lệ hoặc vượt quá 50 ký tự', 1004, 400);
    }

    const description =
      payload.description !== undefined ? validateOptionalDescription(payload.description, 500) : null;

    const parentRoleId =
      payload.parent_role_id !== undefined && payload.parent_role_id !== null && payload.parent_role_id !== ''
        ? parsePositiveInt(payload.parent_role_id, 'parent_role_id')
        : null;

    if (parentRoleId !== null) {
      const parentCheck = await db.query(
        'SELECT ma_vai_tro FROM public.vaitro WHERE ma_vai_tro = $1 LIMIT 1',
        [parentRoleId]
      );
      if (!parentCheck.rows[0]) {
        throw createSheetError('Vai trò cha (parent_role_id) không tồn tại', 9992, 404);
      }
    }

    const dupCheck = await db.query(
      'SELECT ma_vai_tro FROM public.vaitro WHERE LOWER(ten_vai_tro) = LOWER($1) LIMIT 1',
      [name]
    );
    if (dupCheck.rows.length > 0) {
      throw createSheetError('Vai trò đã tồn tại', 9996, 409);
    }

    const insertRes = await db.query(
      `
      INSERT INTO public.vaitro (ten_vai_tro, ten_hien_thi, mo_ta_vai_tro)
      VALUES ($1, $2, $3)
      RETURNING ma_vai_tro, ten_vai_tro, ten_hien_thi, mo_ta_vai_tro
      `,
      [name, name, description]
    );
    const created = insertRes.rows[0];

    await prisma.roleMeta.upsert({
      where: { maVaiTro: BigInt(created.ma_vai_tro) },
      update: { parentRoleId: parentRoleId !== null ? BigInt(parentRoleId) : null },
      create: {
        maVaiTro: BigInt(created.ma_vai_tro),
        parentRoleId: parentRoleId !== null ? BigInt(parentRoleId) : null,
      },
    });

    return {
      id: Number(created.ma_vai_tro),
      name: created.ten_vai_tro,
      description: created.mo_ta_vai_tro ?? null,
      parent_role_id: parentRoleId !== null ? Number(parentRoleId) : null,
    };
  }

  // 8. GET /roles
  async listRoles() {
    const result = await db.query(
      'SELECT ma_vai_tro, ten_vai_tro, mo_ta_vai_tro FROM public.vaitro ORDER BY ma_vai_tro ASC'
    );
    return result.rows.map((r) => ({
      id: Number(r.ma_vai_tro),
      name: r.ten_vai_tro,
      description: r.mo_ta_vai_tro ?? null,
    }));
  }

  // 9. POST /permissions
  async createPermission(payload = {}) {
    if (!payload || typeof payload !== 'object' || Array.isArray(payload)) {
      throw createSheetError('Kiểu dữ liệu payload không hợp lệ', 1003, 400);
    }
    if (payload.name === undefined || payload.name === null || payload.name === '') {
      throw createSheetError('Thiếu tên quyền hạn (name)', 1002, 400);
    }
    if (typeof payload.name !== 'string') {
      throw createSheetError('Kiểu dữ liệu name không hợp lệ', 1003, 400);
    }

    const name = payload.name.trim();
    if (!name) {
      throw createSheetError('Tên quyền hạn không được chỉ chứa khoảng trắng', 1004, 400);
    }
    if (name.length > 100 || !PERMISSION_NAME_REGEX.test(name) || XSS_PATTERN.test(name)) {
      throw createSheetError(
        'Tên quyền hạn không đúng định dạng (bắt đầu bằng chữ cái, chỉ gồm chữ, số, _, ., :, - và tối đa 100 ký tự)',
        1004,
        400
      );
    }

    const description =
      payload.description !== undefined ? validateOptionalDescription(payload.description, 500) : null;

    const dupCheck = await db.query(
      'SELECT ma_quyen_han FROM public.quyenhan WHERE LOWER(ten_quyen_han) = LOWER($1) LIMIT 1',
      [name]
    );
    if (dupCheck.rows.length > 0) {
      throw createSheetError('Quyền hạn đã tồn tại', 9996, 409);
    }

    const insertRes = await db.query(
      `
      INSERT INTO public.quyenhan (ten_quyen_han, nhom_quyen, mo_ta)
      VALUES ($1, 'GENERAL', $2)
      RETURNING ma_quyen_han, ten_quyen_han, mo_ta, thoi_diem_tao, thoi_diem_cap_nhat
      `,
      [name, description]
    );
    const created = insertRes.rows[0];

    return {
      id: Number(created.ma_quyen_han),
      name: created.ten_quyen_han,
      description: created.mo_ta ?? null,
      created_at: toIsoOrNull(created.thoi_diem_tao),
      updated_at: toIsoOrNull(created.thoi_diem_cap_nhat),
    };
  }

  // 10. GET /permissions
  async listPermissions() {
    const result = await db.query(
      `
      SELECT ma_quyen_han, ten_quyen_han, mo_ta, thoi_diem_tao, thoi_diem_cap_nhat
      FROM public.quyenhan
      ORDER BY ma_quyen_han ASC
      `
    );
    return result.rows.map((r) => ({
      id: Number(r.ma_quyen_han),
      name: r.ten_quyen_han,
      description: r.mo_ta ?? null,
      created_at: toIsoOrNull(r.thoi_diem_tao),
      updated_at: toIsoOrNull(r.thoi_diem_cap_nhat),
    }));
  }

  // 11. PUT /permissions/:id
  async updatePermission(rawId, payload = {}) {
    const permId = parsePositiveInt(rawId, 'id', { required: true });

    if (!payload || typeof payload !== 'object' || Array.isArray(payload)) {
      throw createSheetError('Kiểu dữ liệu payload không hợp lệ', 1003, 400);
    }

    const hasName = payload.name !== undefined;
    const hasDescription = payload.description !== undefined;
    if (!hasName && !hasDescription) {
      throw createSheetError('Thiếu dữ liệu cập nhật (name hoặc description)', 1002, 400);
    }

    let nextName = null;
    if (hasName) {
      if (typeof payload.name !== 'string') {
        throw createSheetError('Kiểu dữ liệu name không hợp lệ', 1003, 400);
      }
      nextName = payload.name.trim();
      if (!nextName || nextName.length > 100 || !PERMISSION_NAME_REGEX.test(nextName) || XSS_PATTERN.test(nextName)) {
        throw createSheetError(
          'Tên quyền hạn không đúng định dạng hoặc vượt quá 100 ký tự',
          1004,
          400
        );
      }
    }

    const nextDescription = hasDescription
      ? validateOptionalDescription(payload.description, 500)
      : null;

    const existRes = await db.query(
      'SELECT ma_quyen_han FROM public.quyenhan WHERE ma_quyen_han = $1 LIMIT 1',
      [permId]
    );
    if (!existRes.rows[0]) {
      throw createSheetError('Quyền hạn không tồn tại', 9992, 404);
    }

    if (nextName !== null) {
      const dupCheck = await db.query(
        'SELECT ma_quyen_han FROM public.quyenhan WHERE LOWER(ten_quyen_han) = LOWER($1) AND ma_quyen_han <> $2 LIMIT 1',
        [nextName, permId]
      );
      if (dupCheck.rows.length > 0) {
        throw createSheetError('Tên quyền hạn đã tồn tại', 9996, 409);
      }
    }

    const updateRes = await db.query(
      `
      UPDATE public.quyenhan
      SET ten_quyen_han = COALESCE($1, ten_quyen_han),
          mo_ta = CASE WHEN $2::boolean THEN $3 ELSE mo_ta END,
          thoi_diem_cap_nhat = GREATEST(NOW(), thoi_diem_tao + INTERVAL '1 millisecond', COALESCE(thoi_diem_cap_nhat, thoi_diem_tao) + INTERVAL '1 millisecond')
      WHERE ma_quyen_han = $4
      RETURNING ma_quyen_han, ten_quyen_han, mo_ta, thoi_diem_tao, thoi_diem_cap_nhat
      `,
      [nextName, hasDescription, nextDescription, permId]
    );
    const updated = updateRes.rows[0];

    return {
      id: Number(updated.ma_quyen_han),
      name: updated.ten_quyen_han,
      description: updated.mo_ta ?? null,
      created_at: toIsoOrNull(updated.thoi_diem_tao),
      updated_at: toIsoOrNull(updated.thoi_diem_cap_nhat),
    };
  }

  // 12. DELETE /permissions/:id
  async deletePermission(rawId) {
    const permId = parsePositiveInt(rawId, 'id', { required: true });

    const delRes = await db.query(
      'DELETE FROM public.quyenhan WHERE ma_quyen_han = $1 RETURNING ma_quyen_han',
      [permId]
    );
    if (!delRes.rows[0]) {
      throw createSheetError('Quyền hạn không tồn tại', 9992, 404);
    }

    await prisma.rolePermissionMeta.deleteMany({
      where: { maQuyenHan: BigInt(permId) },
    });

    return {};
  }

  // 13. POST /role_permissions
  async assignRolePermissions(payload = {}, currentUser = null) {
    if (!payload || typeof payload !== 'object' || Array.isArray(payload)) {
      throw createSheetError('Kiểu dữ liệu payload không hợp lệ', 1003, 400);
    }

    const rawPermissions =
      payload.permissions !== undefined ? payload.permissions : payload.permission_ids;

    if (
      payload.role_id === undefined ||
      payload.role_id === null ||
      payload.role_id === '' ||
      rawPermissions === undefined ||
      rawPermissions === null
    ) {
      throw createSheetError('Thiếu role_id hoặc danh sách quyền hạn', 1002, 400);
    }

    const roleId = parsePositiveInt(payload.role_id, 'role_id', { required: true });
    if (!Array.isArray(rawPermissions)) {
      throw createSheetError('Danh sách quyền hạn phải là một mảng ID quyền hạn', 1003, 400);
    }
    if (rawPermissions.length === 0) {
      throw createSheetError('Danh sách quyền hạn không được rỗng', 1004, 400);
    }
    if (rawPermissions.length > MAX_ROLE_PERMISSIONS_BATCH) {
      throw createSheetError(
        `Số lượng quyền hạn gán một lần không được vượt quá ${MAX_ROLE_PERMISSIONS_BATCH}`,
        1004,
        400
      );
    }

    const uniquePermIds = Array.from(
      new Set(
        rawPermissions.map((p) => {
          if (p === undefined || p === null || p === '') {
            throw createSheetError('Kiểu dữ liệu phần tử permission_id không hợp lệ', 1003, 400);
          }
          return parsePositiveInt(p, 'permission_id', { required: true });
        })
      )
    );

    const roleRes = await db.query(
      'SELECT ma_vai_tro FROM public.vaitro WHERE ma_vai_tro = $1 LIMIT 1',
      [roleId]
    );
    if (!roleRes.rows[0]) {
      throw createSheetError('Vai trò không tồn tại', 9992, 404);
    }

    const permRes = await db.query(
      'SELECT ma_quyen_han FROM public.quyenhan WHERE ma_quyen_han = ANY($1::bigint[])',
      [uniquePermIds]
    );
    if (permRes.rows.length !== uniquePermIds.length) {
      throw createSheetError('Một hoặc nhiều quyền hạn không tồn tại', 9992, 404);
    }

    const grantedBy = currentUser?.ma_nguoi ? Number(currentUser.ma_nguoi) : null;

    await db.query(
      `
      INSERT INTO public.vaitroquyenhan (ma_vai_tro, ma_quyen_han, ma_nguoi_gan)
      SELECT $1, unnest($2::bigint[]), $3
      ON CONFLICT (ma_vai_tro, ma_quyen_han) DO NOTHING
      `,
      [roleId, uniquePermIds, grantedBy]
    );

    const roleBig = BigInt(roleId);
    await Promise.all(
      uniquePermIds.map((permId) =>
        prisma.rolePermissionMeta.upsert({
          where: {
            maVaiTro_maQuyenHan: {
              maVaiTro: roleBig,
              maQuyenHan: BigInt(permId),
            },
          },
          update: {},
          create: {
            maVaiTro: roleBig,
            maQuyenHan: BigInt(permId),
          },
        })
      )
    );

    return {};
  }

  // 14. GET /role_permissions/:role_id
  async getRolePermissions(rawRoleId) {
    const roleId = parsePositiveInt(rawRoleId, 'role_id', { required: true });

    const roleRes = await db.query(
      'SELECT ma_vai_tro FROM public.vaitro WHERE ma_vai_tro = $1 LIMIT 1',
      [roleId]
    );
    if (!roleRes.rows[0]) {
      throw createSheetError('Vai trò không tồn tại', 9992, 404);
    }

    const rowsRes = await db.query(
      `
      SELECT vtqh.ma_vai_tro, vtqh.ma_quyen_han, vtqh.thoi_diem_gan,
             qh.ten_quyen_han, qh.mo_ta
      FROM public.vaitroquyenhan vtqh
      JOIN public.quyenhan qh ON vtqh.ma_quyen_han = qh.ma_quyen_han
      WHERE vtqh.ma_vai_tro = $1
      ORDER BY vtqh.ma_quyen_han ASC
      `,
      [roleId]
    );

    if (rowsRes.rows.length === 0) {
      return [];
    }

    const roleBig = BigInt(roleId);
    const existingMetas = await prisma.rolePermissionMeta.findMany({
      where: { maVaiTro: roleBig },
    });
    const metaMap = new Map(existingMetas.map((m) => [String(m.maQuyenHan), m]));

    const results = [];
    for (const row of rowsRes.rows) {
      const permKey = String(row.ma_quyen_han);
      let meta = metaMap.get(permKey);
      if (!meta) {
        meta = await prisma.rolePermissionMeta.upsert({
          where: {
            maVaiTro_maQuyenHan: {
              maVaiTro: roleBig,
              maQuyenHan: BigInt(row.ma_quyen_han),
            },
          },
          update: {},
          create: {
            maVaiTro: roleBig,
            maQuyenHan: BigInt(row.ma_quyen_han),
            assignedAt: row.thoi_diem_gan ? new Date(row.thoi_diem_gan) : new Date(),
          },
        });
        metaMap.set(permKey, meta);
      }

      results.push({
        role_permission_id: Number(meta.id),
        permission_id: Number(row.ma_quyen_han),
        name: row.ten_quyen_han,
        description: row.mo_ta ?? null,
        assigned_at: toIsoOrNull(meta.assignedAt || row.thoi_diem_gan),
      });
    }

    return results;
  }

  // 15. DELETE /role_permissions/:role_id/:permission_id
  async revokeRolePermission(rawRoleId, rawPermissionId) {
    const roleId = parsePositiveInt(rawRoleId, 'role_id', { required: true });
    const permissionId = parsePositiveInt(rawPermissionId, 'permission_id', { required: true });

    const delRes = await db.query(
      `
      DELETE FROM public.vaitroquyenhan
      WHERE ma_vai_tro = $1 AND ma_quyen_han = $2
      RETURNING ma_vai_tro, ma_quyen_han
      `,
      [roleId, permissionId]
    );
    if (!delRes.rows[0]) {
      throw createSheetError('Liên kết vai trò - quyền hạn không tồn tại', 9992, 404);
    }

    await prisma.rolePermissionMeta.deleteMany({
      where: {
        maVaiTro: BigInt(roleId),
        maQuyenHan: BigInt(permissionId),
      },
    });

    return {};
  }
}

module.exports = new AdminRbacService();
