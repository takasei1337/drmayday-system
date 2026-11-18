const db = require('../../config/db');
const prisma = require('../../config/prisma');
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const {
  createAppError,
  isValidVNPhone,
  isValid10DigitPhone,
  normalizeDbGender,
  normalizeCareer,
} = require('../patient/patient.helpers');

/**
 * Format tên hiển thị theo ví dụ trong Sheet 1.2 login:
 * "Nguyễn Văn A" -> "Nguyễn A"
 */
function formatDisplayName(fullName) {
  if (!fullName || typeof fullName !== 'string') return '';
  const parts = fullName.trim().split(/\s+/);
  if (parts.length <= 2) return fullName.trim();
  return `${parts[0]} ${parts[parts.length - 1]}`;
}

class AuthService {
  /**
   * 1.1 Đăng ký tài khoản (Sheet 1.1 signup)
   */
  async signup(data) {
    const fullName = (data.full_name || data.ho_ten || '').trim();
    const phone = (data.phone || data.so_dien_thoai || '').trim();
    const password = data.password || data.mat_khau;
    const rawGenderInput = data.gender !== undefined ? data.gender : data.gioi_tinh;
    const genderInfo = normalizeDbGender(rawGenderInput !== undefined ? rawGenderInput : 'other');

    if (!fullName || !phone || !password) {
      throw createAppError('Thiếu trường thông tin bắt buộc', 2001, 400);
    }

    if (!isValidVNPhone(phone)) {
      throw createAppError('Số điện thoại không đúng chuẩn VN (03/05/07/08/09)', 2004, 400);
    }

    if (password.length < 6) {
      throw createAppError('Mật khẩu phải có tối thiểu 6 ký tự', 2003, 400);
    }

    let yearOfBirth = null;
    if (data.year_of_birth !== undefined && data.year_of_birth !== null && data.year_of_birth !== '') {
      const yob = parseInt(data.year_of_birth, 10);
      const currentYear = new Date().getFullYear();
      if (Number.isNaN(yob) || yob < 1900 || yob > currentYear) {
        throw createAppError(`Năm sinh không hợp lệ (1900-${currentYear})`, 2003, 400);
      }
      yearOfBirth = yob;
    }

    const ngaySinh =
      data.ngay_sinh ||
      data.date_of_birth ||
      (yearOfBirth ? `${yearOfBirth}-01-01` : null);

    // Kiểm tra số điện thoại đã tồn tại chưa (Sheet code 3006)
    const checkQuery = `
      SELECT tk.ma_tai_khoan 
      FROM public.taikhoan tk
      LEFT JOIN public.nguoi ng ON tk.ma_nguoi = ng.ma_nguoi
      WHERE tk.ten_dang_nhap = $1 OR ng.so_dien_thoai = $1
      LIMIT 1
    `;
    const checkRes = await db.query(checkQuery, [phone]);
    if (checkRes.rows.length > 0) {
      throw createAppError('Số điện thoại hoặc email đã tồn tại', 3006, 400);
    }

    const salt = await bcrypt.genSalt(10);
    const hashedPassword = await bcrypt.hash(password, salt);

    const client = await db.pool.connect();
    let ma_nguoi;
    let roleId;
    let ma_tai_khoan;
    let thoi_diem_tao;
    let ma_benh_nhan;
    try {
      await client.query('BEGIN');

      // 1. Thêm vào bảng nguoi (gioi_tinh CHECK IN ('Nam', 'Nu'))
      const nguoiQuery = `
        INSERT INTO public.nguoi (ho_ten, so_dien_thoai, gioi_tinh, ngay_sinh, dia_chi_tinh_tp, dia_chi_xa_phuong, dia_chi_so_nha_thon_pho)
        VALUES ($1, $2, $3, $4, $5, $6, $7)
        RETURNING ma_nguoi
      `;
      const nguoiRes = await client.query(nguoiQuery, [
        fullName,
        phone,
        genderInfo.dbValue,
        ngaySinh,
        data.dia_chi_tinh_tp || data.address || null,
        data.dia_chi_xa_phuong || null,
        data.dia_chi_so_nha_thon_pho || null,
      ]);
      ma_nguoi = nguoiRes.rows[0].ma_nguoi;

      // 2. Lấy role BENH_NHAN (mặc định DB thật là 4)
      const vtRes = await client.query(
        `SELECT ma_vai_tro FROM public.vaitro
         WHERE LOWER(ten_vai_tro) IN ('benh_nhan', 'patient')
         ORDER BY CASE WHEN LOWER(ten_vai_tro) = 'benh_nhan' THEN 0 ELSE 1 END
         LIMIT 1`
      );
      roleId = vtRes.rows[0] ? vtRes.rows[0].ma_vai_tro : 4;

      // 3. Thêm vào bảng taikhoan
      const tkQuery = `
        INSERT INTO public.taikhoan (ma_nguoi, ma_vai_tro, ten_dang_nhap, mat_khau_ma_hoa, trang_thai_hoat_dong)
        VALUES ($1, $2, $3, $4, TRUE)
        RETURNING ma_tai_khoan, thoi_diem_tao
      `;
      const tkRes = await client.query(tkQuery, [ma_nguoi, roleId, phone, hashedPassword]);
      ma_tai_khoan = tkRes.rows[0].ma_tai_khoan;
      thoi_diem_tao = tkRes.rows[0].thoi_diem_tao;

      // 4. Thêm vào bảng benhnhan (PK & FK là ma_benh_nhan -> nguoi.ma_nguoi)
      const bnQuery = `
        INSERT INTO public.benhnhan (ma_benh_nhan)
        VALUES ($1)
        RETURNING ma_benh_nhan
      `;
      const bnRes = await client.query(bnQuery, [ma_nguoi]);
      ma_benh_nhan = bnRes.rows[0].ma_benh_nhan;

      await client.query('COMMIT');
    } catch (err) {
      await client.query('ROLLBACK');
      throw err;
    } finally {
      client.release();
    }

    // Lưu metadata mở rộng (gender 'other', yearOfBirth) trên Sub DB
    try {
      await prisma.patientExtraProfile.upsert({
        where: { maNguoi: BigInt(ma_nguoi) },
        create: {
          maNguoi: BigInt(ma_nguoi),
          genderRaw: genderInfo.rawValue || null,
          yearOfBirth: yearOfBirth || (ngaySinh ? new Date(ngaySinh).getFullYear() : null),
        },
        update: {
          genderRaw: genderInfo.rawValue || null,
          yearOfBirth: yearOfBirth || (ngaySinh ? new Date(ngaySinh).getFullYear() : undefined),
        },
      });
    } catch (subErr) {
      console.warn('[Signup Warning] Không thể lưu patientExtraProfile lên Sub DB:', subErr.message);
    }

    return {
      user_id: Number(ma_tai_khoan),
      full_name: fullName,
      phone,
      gender: genderInfo.rawValue || null,
      role_id: Number(roleId),
      is_active: 1,
      created_at: thoi_diem_tao ? thoi_diem_tao.toISOString() : new Date().toISOString(),
    };
  }

  /**
   * 1.2 Đăng nhập (Sheet 1.2 login)
   */
  async login(usernameOrPhone, password) {
    if (!usernameOrPhone || !password) {
      const err = new Error('Thiếu trường thông tin bắt buộc');
      err.code = 2001;
      err.statusCode = 400;
      throw err;
    }

    const queryText = `
      SELECT tk.ma_tai_khoan, tk.ma_nguoi, tk.ma_vai_tro, tk.ten_dang_nhap, 
             tk.mat_khau_ma_hoa, tk.trang_thai_hoat_dong,
             vt.ten_vai_tro, vt.ten_hien_thi,
             ng.ho_ten, ng.so_dien_thoai, ng.gioi_tinh,
             bn.ma_benh_nhan
      FROM public.taikhoan tk
      LEFT JOIN public.vaitro vt ON tk.ma_vai_tro = vt.ma_vai_tro
      LEFT JOIN public.nguoi ng ON tk.ma_nguoi = ng.ma_nguoi
      LEFT JOIN public.benhnhan bn ON bn.ma_benh_nhan = ng.ma_nguoi
      WHERE tk.ten_dang_nhap = $1 OR ng.so_dien_thoai = $1
      LIMIT 1
    `;
    const result = await db.query(queryText, [usernameOrPhone]);
    const user = result.rows[0];

    if (!user) {
      const err = new Error('Tài khoản không tồn tại');
      err.code = 3007;
      err.statusCode = 404;
      throw err;
    }

    if (!user.trang_thai_hoat_dong) {
      const err = new Error('Tài khoản hiện đang bị vô hiệu hóa hoặc khóa');
      err.code = 3007;
      err.statusCode = 403;
      throw err;
    }

    // So sánh mật khẩu
    let isMatch = false;
    if (user.mat_khau_ma_hoa.startsWith('$2a$') || user.mat_khau_ma_hoa.startsWith('$2b$')) {
      isMatch = await bcrypt.compare(password, user.mat_khau_ma_hoa);
    } else {
      isMatch = user.mat_khau_ma_hoa === password;
    }

    if (!isMatch) {
      const err = new Error('Mật khẩu không chính xác');
      err.code = 3008;
      err.statusCode = 400;
      throw err;
    }

    // Lấy quyền hạn của vai trò
    const permQuery = `
      SELECT qh.ten_quyen_han, qh.nhom_quyen
      FROM public.vaitroquyenhan vtqh
      JOIN public.quyenhan qh ON vtqh.ma_quyen_han = qh.ma_quyen_han
      WHERE vtqh.ma_vai_tro = $1
    `;
    const permResult = await db.query(permQuery, [user.ma_vai_tro]);
    const permissions = permResult.rows.map(r => r.ten_quyen_han);

    const maBenhNhan = user.ma_benh_nhan ? Number(user.ma_benh_nhan) : null;

    // Ký JWT Token
    const payload = {
      ma_tai_khoan: Number(user.ma_tai_khoan),
      ma_nguoi: Number(user.ma_nguoi),
      ma_benh_nhan: maBenhNhan,
      ten_dang_nhap: user.ten_dang_nhap,
      vai_tro: user.ten_vai_tro,
      ten_vai_tro_hien_thi: user.ten_hien_thi,
      ho_ten: user.ho_ten,
      so_dien_thoai: user.so_dien_thoai,
      quyen_han: permissions,
    };

    const token = jwt.sign(payload, process.env.JWT_SECRET || 'mayday_super_secret_jwt_key_2026', {
      expiresIn: process.env.JWT_EXPIRES_IN || '7d',
    });

    const userInfo = {
      user_id: String(user.ma_tai_khoan),
      full_name: user.ho_ten,
      phone: user.so_dien_thoai || user.ten_dang_nhap,
      role_id: String(user.ma_vai_tro),
    };

    return {
      token,
      user_info: userInfo,
    };
  }

  /**
   * 1.3 Đăng xuất (Sheet 1.3 logout)
   */
  async logout(token, userPayload) {
    let thoiDiemHetHan = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000);
    try {
      const decoded = jwt.decode(token);
      if (decoded && decoded.exp) {
        thoiDiemHetHan = new Date(decoded.exp * 1000);
      }
    } catch {}

    try {
      await prisma.tokenBlacklist.create({
        data: {
          token,
          maTaiKhoan: userPayload ? BigInt(userPayload.ma_tai_khoan) : null,
          lyDoThuHoi: 'LOGOUT',
          thoiDiemHetHan,
        },
      });
      return true;
    } catch (err) {
      console.error('[Logout Error] Không thể lưu vào Token Blacklist:', err.message);
      return false;
    }
  }

  /**
   * 1.4 Quên mật khẩu (Sheet 1.4 forgot_password)
   */
  async forgotPassword(phone) {
    const rawPhone = (phone || '').trim();
    if (!rawPhone) {
      const err = new Error('Thiếu trường thông tin bắt buộc');
      err.code = 2001;
      err.statusCode = 400;
      throw err;
    }

    if (!isValidVNPhone(rawPhone)) {
      const err = new Error('Số điện thoại không đúng chuẩn VN (03/05/07/08/09)');
      err.code = 2004;
      err.statusCode = 400;
      throw err;
    }

    const checkQuery = `
      SELECT tk.ma_tai_khoan
      FROM public.taikhoan tk
      LEFT JOIN public.nguoi ng ON tk.ma_nguoi = ng.ma_nguoi
      WHERE tk.ten_dang_nhap = $1 OR ng.so_dien_thoai = $1
      LIMIT 1
    `;
    const checkRes = await db.query(checkQuery, [rawPhone]);
    if (checkRes.rows.length === 0) {
      throw createAppError('Tài khoản không tồn tại', 3007, 404);
    }

    const otpCode = String(Math.floor(100000 + Math.random() * 900000));
    try {
      await prisma.passwordResetToken.create({
        data: {
          maTaiKhoan: BigInt(checkRes.rows[0].ma_tai_khoan),
          phone: rawPhone,
          otpCode,
          expiresAt: new Date(Date.now() + 15 * 60 * 1000),
        },
      });
    } catch (subErr) {
      console.warn('[ForgotPassword Warning] Không thể lưu OTP lên Sub DB:', subErr.message);
    }

    // Theo Sheet 1.4: Trả về thông báo thành công và data: {}
    return {};
  }

  /**
   * 1.5 Đổi mật khẩu (Sheet 1.5 change_password)
   */
  async changePassword(maTaiKhoan, oldPassword, newPassword, confirmPassword) {
    if (!oldPassword || !newPassword) {
      const err = new Error('Thiếu trường thông tin bắt buộc');
      err.code = 2001;
      err.statusCode = 400;
      throw err;
    }

    if (newPassword.length < 6) {
      const err = new Error('Mật khẩu mới phải có tối thiểu 6 ký tự');
      err.code = 2003;
      err.statusCode = 400;
      throw err;
    }

    if (confirmPassword && confirmPassword !== newPassword) {
      const err = new Error('Mật khẩu xác nhận không khớp');
      err.code = 2003;
      err.statusCode = 400;
      throw err;
    }

    // Lấy mật khẩu mã hóa hiện tại
    const userRes = await db.query(
      'SELECT ma_tai_khoan, mat_khau_ma_hoa FROM public.taikhoan WHERE ma_tai_khoan = $1 LIMIT 1',
      [maTaiKhoan]
    );
    const user = userRes.rows[0];
    if (!user) {
      const err = new Error('Tài khoản không tồn tại');
      err.code = 3007;
      err.statusCode = 404;
      throw err;
    }

    let isMatch = false;
    if (user.mat_khau_ma_hoa.startsWith('$2a$') || user.mat_khau_ma_hoa.startsWith('$2b$')) {
      isMatch = await bcrypt.compare(oldPassword, user.mat_khau_ma_hoa);
    } else {
      isMatch = user.mat_khau_ma_hoa === oldPassword;
    }

    if (!isMatch) {
      const err = new Error('Mật khẩu cũ không chính xác khi đổi mật khẩu');
      err.code = 3009;
      err.statusCode = 400;
      throw err;
    }

    const salt = await bcrypt.genSalt(10);
    const newHashedPassword = await bcrypt.hash(newPassword, salt);

    await db.query(
      'UPDATE public.taikhoan SET mat_khau_ma_hoa = $1, thoi_diem_cap_nhat = CURRENT_TIMESTAMP WHERE ma_tai_khoan = $2',
      [newHashedPassword, maTaiKhoan]
    );

    return {};
  }

  /**
   * 1.6 Admin tạo nhân viên y tế (Sheet 1.6 create_staff)
   */
  async createStaff(data) {
    const fullName = (data.full_name || data.ho_ten || '').trim();
    const phone = (data.phone || data.so_dien_thoai || '').trim();
    const password = data.password || data.mat_khau;
    const rawGenderInput = data.gender !== undefined ? data.gender : data.gioi_tinh;
    const genderInfo = normalizeDbGender(rawGenderInput !== undefined ? rawGenderInput : 'other');
    const roleId = data.role_id || data.ma_vai_tro;
    const branchId = data.branch_id || data.ma_chi_nhanh;
    const departmentId = data.department_id || data.ma_khoa_phong;

    if (!fullName || !phone || !password || !roleId || !branchId) {
      const err = new Error('Thiếu trường thông tin bắt buộc');
      err.code = 2001;
      err.statusCode = 400;
      throw err;
    }

    if (!isValidVNPhone(phone)) {
      const err = new Error('Số điện thoại không đúng chuẩn VN (03/05/07/08/09)');
      err.code = 2004;
      err.statusCode = 400;
      throw err;
    }

    if (password.length < 6) {
      const err = new Error('Mật khẩu phải có tối thiểu 6 ký tự');
      err.code = 2003;
      err.statusCode = 400;
      throw err;
    }

    // Kiểm tra trùng số điện thoại
    const checkQuery = `
      SELECT tk.ma_tai_khoan 
      FROM public.taikhoan tk
      LEFT JOIN public.nguoi ng ON tk.ma_nguoi = ng.ma_nguoi
      WHERE tk.ten_dang_nhap = $1 OR ng.so_dien_thoai = $1
      LIMIT 1
    `;
    const checkRes = await db.query(checkQuery, [phone]);
    if (checkRes.rows.length > 0) {
      const err = new Error('Số điện thoại hoặc email đã tồn tại');
      err.code = 3006;
      err.statusCode = 400;
      throw err;
    }

    // Kiểm tra chi nhánh tồn tại
    const branchRes = await db.query('SELECT ma_chi_nhanh FROM public.chinhanh WHERE ma_chi_nhanh = $1 LIMIT 1', [
      branchId,
    ]);
    if (branchRes.rows.length === 0) {
      const err = new Error('Chi nhánh không tồn tại');
      err.code = 2003;
      err.statusCode = 400;
      throw err;
    }

    const salt = await bcrypt.genSalt(10);
    const hashedPassword = await bcrypt.hash(password, salt);

    const client = await db.pool.connect();
    try {
      await client.query('BEGIN');

      // 1. Thêm vào bảng nguoi (gioi_tinh CHECK IN ('Nam', 'Nu'))
      const nguoiQuery = `
        INSERT INTO public.nguoi (ho_ten, so_dien_thoai, gioi_tinh)
        VALUES ($1, $2, $3)
        RETURNING ma_nguoi
      `;
      const nguoiRes = await client.query(nguoiQuery, [fullName, phone, genderInfo.dbValue]);
      const ma_nguoi = nguoiRes.rows[0].ma_nguoi;

      // 2. Thêm vào bảng taikhoan
      const tkQuery = `
        INSERT INTO public.taikhoan (ma_nguoi, ma_vai_tro, ten_dang_nhap, mat_khau_ma_hoa, trang_thai_hoat_dong)
        VALUES ($1, $2, $3, $4, TRUE)
        RETURNING ma_tai_khoan
      `;
      const tkRes = await client.query(tkQuery, [ma_nguoi, roleId, phone, hashedPassword]);
      const ma_tai_khoan = tkRes.rows[0].ma_tai_khoan;

      // 3. Thêm vào bảng nhanvien
      const nvQuery = `
        INSERT INTO public.nhanvien (ma_nhan_vien, ma_chi_nhanh)
        VALUES ($1, $2)
      `;
      await client.query(nvQuery, [ma_nguoi, branchId]);

      await client.query('COMMIT');

      return {
        id: Number(ma_tai_khoan),
        full_name: fullName,
        role_id: Number(roleId),
        branch_id: Number(branchId),
        department_id: departmentId ? Number(departmentId) : null,
      };
    } catch (err) {
      await client.query('ROLLBACK');
      throw err;
    } finally {
      client.release();
    }
  }

  /**
   * Lấy thông tin cá nhân đầy đủ (Main DB + Sub DB PatientExtraProfile)
   */
  async getProfile(ma_tai_khoan) {
    const queryText = `
      SELECT tk.ma_tai_khoan, tk.ma_nguoi, tk.ma_vai_tro, tk.ten_dang_nhap, tk.trang_thai_hoat_dong,
             vt.ten_vai_tro, vt.ten_hien_thi,
             ng.ho_ten, ng.ngay_sinh, ng.gioi_tinh, ng.so_dien_thoai,
             ng.dia_chi_tinh_tp, ng.dia_chi_xa_phuong, ng.dia_chi_so_nha_thon_pho,
             bn.ma_benh_nhan, bn.ma_his, bn.nghe_nghiep, bn.dan_toc, bn.bhyt_so_the,
             bn.bhyt_gia_tri_den, bn.nguoi_nha_ho_ten_dia_chi, bn.nguoi_nha_so_dien_thoai
      FROM public.taikhoan tk
      LEFT JOIN public.vaitro vt ON tk.ma_vai_tro = vt.ma_vai_tro
      LEFT JOIN public.nguoi ng ON tk.ma_nguoi = ng.ma_nguoi
      LEFT JOIN public.benhnhan bn ON bn.ma_benh_nhan = ng.ma_nguoi
      WHERE tk.ma_tai_khoan = $1
      LIMIT 1
    `;
    const result = await db.query(queryText, [ma_tai_khoan]);
    const row = result.rows[0];
    if (!row) {
      throw createAppError('Tài khoản không tồn tại', 3007, 404);
    }

    let extra = null;
    try {
      extra = await prisma.patientExtraProfile.findUnique({
        where: { maNguoi: BigInt(row.ma_nguoi) },
      });
    } catch {}

    const birthYear =
      extra?.yearOfBirth ||
      (row.ngay_sinh ? new Date(row.ngay_sinh).getFullYear() : null);

    let firstVisitIso = extra?.firstVisit ? extra.firstVisit.toISOString() : null;
    if (!firstVisitIso && row.ma_benh_nhan) {
      try {
        const fvRes = await db.query(
          'SELECT MIN(thoi_diem_kham_lan_dau) AS fv FROM public.hosobenhan WHERE ma_benh_nhan = $1',
          [row.ma_benh_nhan]
        );
        if (fvRes.rows[0]?.fv) {
          firstVisitIso = new Date(fvRes.rows[0].fv).toISOString();
        }
      } catch {}
    }

    return {
      user_id: Number(row.ma_tai_khoan),
      full_name: row.ho_ten || '',
      phone: row.so_dien_thoai || row.ten_dang_nhap,
      role_id: Number(row.ma_vai_tro),
      gender: extra?.genderRaw || row.gioi_tinh || null,
      year_of_birth: birthYear,
      career: row.nghe_nghiep || null,
      ethnic: row.dan_toc || null,
      hamlet_address: row.dia_chi_so_nha_thon_pho || null,
      commune_address: row.dia_chi_xa_phuong || null,
      city_address: row.dia_chi_tinh_tp || null,
      work_place: extra?.workPlace || null,
      health_insurance_number: row.bhyt_so_the || null,
      health_insurance_validate:
        extra?.healthInsuranceValidate ||
        (row.bhyt_gia_tri_den ? new Date(row.bhyt_gia_tri_den).toISOString().slice(0, 10) : null),
      next_of_kin_name: row.nguoi_nha_ho_ten_dia_chi || null,
      next_of_kin_phone: row.nguoi_nha_so_dien_thoai || null,
      first_visit: firstVisitIso,
    };
  }

  /**
   * Cập nhật thông tin hồ sơ cá nhân (PUT /api/v1/profile)
   */
  async updateProfile(ma_tai_khoan, data = {}) {
    const accRes = await db.query(
      `SELECT tk.ma_tai_khoan, tk.ma_nguoi, tk.ten_dang_nhap, ng.so_dien_thoai, bn.ma_benh_nhan
       FROM public.taikhoan tk
       JOIN public.nguoi ng ON tk.ma_nguoi = ng.ma_nguoi
       LEFT JOIN public.benhnhan bn ON bn.ma_benh_nhan = ng.ma_nguoi
       WHERE tk.ma_tai_khoan = $1
       LIMIT 1`,
      [ma_tai_khoan]
    );
    const acc = accRes.rows[0];
    if (!acc) {
      throw createAppError('Tài khoản không tồn tại', 3007, 404);
    }

    const fullName = data.full_name !== undefined ? data.full_name : data.ho_ten;
    const phone = data.phone !== undefined ? data.phone : data.so_dien_thoai;
    const genderInput = data.gender !== undefined ? data.gender : data.gioi_tinh;
    const genderInfo = genderInput !== undefined ? normalizeDbGender(genderInput) : { provided: false };

    let yearOfBirth;
    if (data.year_of_birth !== undefined) {
      if (data.year_of_birth === null || data.year_of_birth === '') {
        yearOfBirth = null;
      } else {
        const yob = parseInt(data.year_of_birth, 10);
        const currentYear = new Date().getFullYear();
        if (Number.isNaN(yob) || yob < 1900 || yob > currentYear) {
          throw createAppError(`Năm sinh không hợp lệ (1900-${currentYear})`, 2003, 400);
        }
        yearOfBirth = yob;
      }
    }

    const ngaySinhInput = data.ngay_sinh !== undefined ? data.ngay_sinh : data.date_of_birth;
    const ngaySinh =
      ngaySinhInput !== undefined
        ? ngaySinhInput
        : yearOfBirth
        ? `${yearOfBirth}-01-01`
        : undefined;

    if (phone !== undefined && phone !== null && String(phone).trim() !== '') {
      const cleanPhone = String(phone).trim();
      if (!isValidVNPhone(cleanPhone)) {
        throw createAppError('Số điện thoại không đúng chuẩn VN (03/05/07/08/09)', 2004, 400);
      }
      const dupRes = await db.query(
        `SELECT tk.ma_tai_khoan FROM public.taikhoan tk
         LEFT JOIN public.nguoi ng ON tk.ma_nguoi = ng.ma_nguoi
         WHERE (tk.ten_dang_nhap = $1 OR ng.so_dien_thoai = $1) AND tk.ma_tai_khoan <> $2
         LIMIT 1`,
        [cleanPhone, ma_tai_khoan]
      );
      if (dupRes.rows.length > 0) {
        throw createAppError('Số điện thoại đã được sử dụng bởi tài khoản khác', 3006, 400);
      }
    }

    const nextOfKinPhone =
      data.next_of_kin_phone !== undefined ? data.next_of_kin_phone : data.nguoi_nha_so_dien_thoai;
    if (nextOfKinPhone !== undefined && nextOfKinPhone !== null && String(nextOfKinPhone).trim() !== '') {
      if (!isValid10DigitPhone(String(nextOfKinPhone))) {
        throw createAppError('Số điện thoại người thân phải đúng 10 chữ số', 2004, 400);
      }
    }

    const careerInput = data.career !== undefined ? data.career : data.nghe_nghiep;
    const career = careerInput !== undefined ? normalizeCareer(careerInput) : undefined;
    const ethnicity =
      data.ethnicity !== undefined
        ? data.ethnicity
        : data.ethnic !== undefined
        ? data.ethnic
        : data.dan_toc;
    const bhyt =
      data.health_insurance_number !== undefined ? data.health_insurance_number : data.bhyt_so_the;
    const nextOfKinName =
      data.nguoi_nha_ho_ten_dia_chi !== undefined
        ? data.nguoi_nha_ho_ten_dia_chi
        : data.next_of_kin_name !== undefined
        ? data.next_of_kin_name
        : data.nguoi_nha_ho_ten;
    const bhytValidate =
      data.bhyt_gia_tri_den !== undefined ? data.bhyt_gia_tri_den : data.health_insurance_validate;

    const tinhTp =
      data.tinh_tp !== undefined
        ? data.tinh_tp
        : data.city_address !== undefined
        ? data.city_address
        : data.dia_chi_tinh_tp !== undefined
        ? data.dia_chi_tinh_tp
        : data.address;
    const xaPhuong =
      data.xa_phuong !== undefined
        ? data.xa_phuong
        : data.commune_address !== undefined
        ? data.commune_address
        : data.dia_chi_xa_phuong;
    const soNha =
      data.so_nha_thon_pho !== undefined
        ? data.so_nha_thon_pho
        : data.hamlet_address !== undefined
        ? data.hamlet_address
        : data.dia_chi_so_nha_thon_pho;

    const client = await db.pool.connect();
    try {
      await client.query('BEGIN');

      const nguoiSets = [];
      const nguoiVals = [];
      let pIdx = 1;
      const pushNguoi = (col, val) => {
        if (val !== undefined) {
          nguoiSets.push(`${col} = $${pIdx++}`);
          nguoiVals.push(val);
        }
      };

      pushNguoi('ho_ten', fullName !== undefined ? String(fullName).trim() : undefined);
      if (phone !== undefined && phone !== null && String(phone).trim() !== '') {
        pushNguoi('so_dien_thoai', String(phone).trim());
      }
      if (genderInfo.provided) pushNguoi('gioi_tinh', genderInfo.dbValue);
      pushNguoi('ngay_sinh', ngaySinh);
      pushNguoi('dia_chi_tinh_tp', tinhTp);
      pushNguoi('dia_chi_xa_phuong', xaPhuong);
      pushNguoi('dia_chi_so_nha_thon_pho', soNha);

      if (nguoiSets.length > 0) {
        nguoiVals.push(acc.ma_nguoi);
        await client.query(
          `UPDATE public.nguoi SET ${nguoiSets.join(', ')} WHERE ma_nguoi = $${pIdx}`,
          nguoiVals
        );
      }

      if (
        phone !== undefined &&
        phone !== null &&
        String(phone).trim() !== '' &&
        acc.ten_dang_nhap === acc.so_dien_thoai
      ) {
        await client.query(
          `UPDATE public.taikhoan SET ten_dang_nhap = $1, thoi_diem_cap_nhat = CURRENT_TIMESTAMP WHERE ma_tai_khoan = $2`,
          [String(phone).trim(), ma_tai_khoan]
        );
      }

      if (acc.ma_benh_nhan) {
        const bnSets = [];
        const bnVals = [];
        let bIdx = 1;
        const pushBn = (col, val) => {
          if (val !== undefined) {
            bnSets.push(`${col} = $${bIdx++}`);
            bnVals.push(val);
          }
        };
        pushBn('nghe_nghiep', career);
        pushBn('dan_toc', ethnicity);
        pushBn('bhyt_so_the', bhyt);
        pushBn('bhyt_gia_tri_den', bhytValidate && /^\d{4}-\d{2}-\d{2}/.test(String(bhytValidate)) ? String(bhytValidate).slice(0, 10) : undefined);
        pushBn('nguoi_nha_ho_ten_dia_chi', nextOfKinName);
        pushBn(
          'nguoi_nha_so_dien_thoai',
          nextOfKinPhone !== undefined && nextOfKinPhone !== null && String(nextOfKinPhone).trim() === ''
            ? null
            : nextOfKinPhone
        );

        if (bnSets.length > 0) {
          bnVals.push(acc.ma_benh_nhan);
          await client.query(
            `UPDATE public.benhnhan SET ${bnSets.join(', ')} WHERE ma_benh_nhan = $${bIdx}`,
            bnVals
          );
        }
      }

      await client.query('COMMIT');
    } catch (err) {
      await client.query('ROLLBACK');
      throw err;
    } finally {
      client.release();
    }

    // Cập nhật thông tin mở rộng trên Sub DB
    const extraUpdate = {};
    if (genderInfo.provided) extraUpdate.genderRaw = genderInfo.rawValue || null;
    if (yearOfBirth !== undefined) extraUpdate.yearOfBirth = yearOfBirth;
    if (data.work_place !== undefined) extraUpdate.workPlace = data.work_place;
    if (data.first_visit !== undefined) {
      extraUpdate.firstVisit = data.first_visit ? new Date(data.first_visit) : null;
    }
    if (data.health_insurance_validate !== undefined) {
      extraUpdate.healthInsuranceValidate = data.health_insurance_validate;
    }
    if (data.medical_history !== undefined) extraUpdate.medicalHistory = data.medical_history;
    if (data.allergy_history !== undefined) extraUpdate.allergyHistory = data.allergy_history;

    if (Object.keys(extraUpdate).length > 0) {
      try {
        await prisma.patientExtraProfile.upsert({
          where: { maNguoi: BigInt(acc.ma_nguoi) },
          create: { maNguoi: BigInt(acc.ma_nguoi), ...extraUpdate },
          update: extraUpdate,
        });
      } catch (subErr) {
        console.warn('[UpdateProfile Warning] Lỗi cập nhật Sub DB:', subErr.message);
      }
    }

    return this.getProfile(ma_tai_khoan);
  }
}

module.exports = new AuthService();
