const db = require('../../config/db');
const prisma = require('../../config/prisma');
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');

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

/**
 * Kiểm tra định dạng số điện thoại Việt Nam (03/05/07/08/09...)
 */
function isValidVNPhone(phone) {
  if (!phone || typeof phone !== 'string') return false;
  return /^(0[3|5|7|8|9])[0-9]{8}$/.test(phone.trim());
}

class AuthService {
  /**
   * 1.1 Đăng ký tài khoản (Sheet 1.1 signup)
   */
  async signup(data) {
    const fullName = (data.full_name || data.ho_ten || '').trim();
    const phone = (data.phone || data.so_dien_thoai || '').trim();
    const password = data.password || data.mat_khau;
    const gender = data.gender || data.gioi_tinh || 'other';

    if (!fullName || !phone || !password) {
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
      const err = new Error('Số điện thoại hoặc email đã tồn tại');
      err.code = 3006;
      err.statusCode = 400;
      throw err;
    }

    const salt = await bcrypt.genSalt(10);
    const hashedPassword = await bcrypt.hash(password, salt);

    const client = await db.pool.connect();
    try {
      await client.query('BEGIN');

      // 1. Thêm vào bảng nguoi
      const nguoiQuery = `
        INSERT INTO public.nguoi (ho_ten, so_dien_thoai, gioi_tinh, ngay_sinh, dia_chi_tinh_tp)
        VALUES ($1, $2, $3, $4, $5)
        RETURNING ma_nguoi
      `;
      const nguoiRes = await client.query(nguoiQuery, [
        fullName,
        phone,
        gender,
        data.ngay_sinh || null,
        data.dia_chi_tinh_tp || null,
      ]);
      const ma_nguoi = nguoiRes.rows[0].ma_nguoi;

      // 2. Lấy role BENH_NHAN
      const vtRes = await client.query(
        "SELECT ma_vai_tro FROM public.vaitro WHERE ten_vai_tro = 'BENH_NHAN' OR LOWER(ten_vai_tro) = 'patient' LIMIT 1"
      );
      const roleId = vtRes.rows[0] ? vtRes.rows[0].ma_vai_tro : 3;

      // 3. Thêm vào bảng taikhoan
      const tkQuery = `
        INSERT INTO public.taikhoan (ma_nguoi, ma_vai_tro, ten_dang_nhap, mat_khau_ma_hoa, trang_thai_hoat_dong)
        VALUES ($1, $2, $3, $4, TRUE)
        RETURNING ma_tai_khoan, thoi_diem_tao
      `;
      const tkRes = await client.query(tkQuery, [ma_nguoi, roleId, phone, hashedPassword]);
      const ma_tai_khoan = tkRes.rows[0].ma_tai_khoan;
      const thoi_diem_tao = tkRes.rows[0].thoi_diem_tao;

      // 4. Thêm vào bảng benhnhan
      const bnQuery = `
        INSERT INTO public.benhnhan (ma_nguoi)
        VALUES ($1)
        RETURNING ma_benh_nhan
      `;
      const bnRes = await client.query(bnQuery, [ma_nguoi]);
      const ma_benh_nhan = bnRes.rows[0].ma_benh_nhan;

      await client.query('COMMIT');

      return {
        id: Number(ma_tai_khoan),
        full_name: fullName,
        phone,
        gender,
        role_id: Number(roleId),
        status: 1,
        created_at: thoi_diem_tao ? thoi_diem_tao.toISOString() : new Date().toISOString(),
      };
    } catch (err) {
      await client.query('ROLLBACK');
      throw err;
    } finally {
      client.release();
    }
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
             ng.ho_ten, ng.so_dien_thoai, ng.gioi_tinh
      FROM public.taikhoan tk
      LEFT JOIN public.vaitro vt ON tk.ma_vai_tro = vt.ma_vai_tro
      LEFT JOIN public.nguoi ng ON tk.ma_nguoi = ng.ma_nguoi
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

    // Ký JWT Token
    const payload = {
      ma_tai_khoan: user.ma_tai_khoan,
      ma_nguoi: user.ma_nguoi,
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
      user_id: Number(user.ma_tai_khoan),
      display_name: formatDisplayName(user.ho_ten),
      full_name: user.ho_ten,
      phone: user.so_dien_thoai || user.ten_dang_nhap,
      role_id: Number(user.ma_vai_tro),
    };

    return {
      access_token: token,
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
      const err = new Error('Tài khoản không tồn tại');
      err.code = 3007;
      err.statusCode = 404;
      throw err;
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
    const gender = data.gender || data.gioi_tinh || 'other';
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

      // 1. Thêm vào bảng nguoi
      const nguoiQuery = `
        INSERT INTO public.nguoi (ho_ten, so_dien_thoai, gioi_tinh)
        VALUES ($1, $2, $3)
        RETURNING ma_nguoi
      `;
      const nguoiRes = await client.query(nguoiQuery, [fullName, phone, gender]);
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
   * Lấy thông tin cá nhân
   */
  async getProfile(ma_tai_khoan) {
    const queryText = `
      SELECT tk.ma_tai_khoan, tk.ten_dang_nhap, tk.trang_thai_hoat_dong,
             vt.ten_vai_tro, vt.ten_hien_thi,
             ng.ho_ten, ng.ngay_sinh, ng.gioi_tinh, ng.so_dien_thoai,
             ng.dia_chi_tinh_tp, ng.dia_chi_xa_phuong, ng.dia_chi_so_nha_thon_pho
      FROM public.taikhoan tk
      LEFT JOIN public.vaitro vt ON tk.ma_vai_tro = vt.ma_vai_tro
      LEFT JOIN public.nguoi ng ON tk.ma_nguoi = ng.ma_nguoi
      WHERE tk.ma_tai_khoan = $1
    `;
    const result = await db.query(queryText, [ma_tai_khoan]);
    return result.rows[0];
  }
}

module.exports = new AuthService();
