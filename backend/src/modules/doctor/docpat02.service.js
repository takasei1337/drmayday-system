const db = require('../../config/db');
const bcrypt = require('bcryptjs');

/**
 * Helper kiểm tra định dạng số điện thoại Việt Nam (10 chữ số: 03/05/07/08/09...)
 */
function isValidVNPhone(phone) {
  if (!phone || typeof phone !== 'string') return false;
  return /^(0[3|5|7|8|9])[0-9]{8}$/.test(phone.trim());
}

/**
 * Chuẩn hóa giới tính theo ràng buộc CSDL ('Nam', 'Nu')
 */
function normalizeGender(gender) {
  if (!gender || typeof gender !== 'string') return null;
  const g = gender.trim().toLowerCase();
  if (g === 'nam' || g === 'male' || g === 'm') return 'Nam';
  if (g === 'nu' || g === 'nữ' || g === 'female' || g === 'f') return 'Nu';
  return null;
}

/**
 * Chuẩn hóa nghề nghiệp theo CHECK constraint của bảng benhnhan:
 * ('Cong nhan', 'Nong dan', 'Hoc sinh - Sinh vien', 'Can bo cong chuc', 'Khac')
 */
function normalizeCareer(career) {
  if (!career || typeof career !== 'string') return null;
  const valid = ['Cong nhan', 'Nong dan', 'Hoc sinh - Sinh vien', 'Can bo cong chuc', 'Khac'];
  const matched = valid.find(v => v.toLowerCase() === career.trim().toLowerCase());
  return matched || 'Khac';
}

class Docpat02Service {
  /**
   * docpat02: Bác sĩ / Lễ tân tạo mới hồ sơ bệnh nhân
   * Căn cứ: Slide 5 (trang 10 & 11) & Sheet POST apidoctorpatientscreate
   */
  async createPatient(data) {
    const fullName = (data.full_name || data.ho_ten || '').trim();
    const phone = (data.phone || data.so_dien_thoai || '').trim();
    const password = data.password || data.mat_khau;
    const gender = normalizeGender(data.gender || data.gioi_tinh);
    const yearOfBirth = parseInt(data.year_of_birth || data.nam_sinh, 10) || null;
    const career = normalizeCareer(data.career || data.nghe_nghiep);
    const ethnic = (data.ethnic || data.dan_toc || '').trim() || null;
    const hamlet = (data.hamlet_address || data.dia_chi_so_nha_thon_pho || '').trim() || null;
    const commune = (data.commune_address || data.dia_chi_xa_phuong || '').trim() || null;
    const city = (data.city_address || data.dia_chi_tinh_tp || '').trim() || null;
    const bhytNumber = (data.health_insurance_number || data.bhyt_so_the || '').trim() || null;
    const bhytValidate = data.health_insurance_validate || data.bhyt_gia_tri_den || null;
    const nextOfKinName = (data.next_of_kin_name || data.nguoi_nha_ho_ten || '').trim() || null;
    const nextOfKinPhone = (data.next_of_kin_phone || data.nguoi_nha_sdt || '').trim() || null;

    // 1. Kiểm tra trường bắt buộc (Code 2001)
    if (!fullName || !phone || !password) {
      const err = new Error('Thiếu trường thông tin bắt buộc (full_name, phone, password)');
      err.code = 2001;
      err.statusCode = 400;
      throw err;
    }

    // 2. Kiểm tra định dạng số điện thoại chuẩn VN (Code 2004)
    if (!isValidVNPhone(phone)) {
      const err = new Error('Số điện thoại không đúng định dạng VN (10 chữ số: 03/05/07/08/09)');
      err.code = 2004;
      err.statusCode = 400;
      throw err;
    }

    // 3. Kiểm tra độ dài mật khẩu tối thiểu 6 ký tự (Code 2003)
    if (password.length < 6) {
      const err = new Error('Mật khẩu phải có tối thiểu 6 ký tự');
      err.code = 2003;
      err.statusCode = 400;
      throw err;
    }

    // 4. Kiểm tra SĐT đã tồn tại hay chưa (Code 3006: User phone already exists)
    const checkQuery = `
      SELECT tk.ma_tai_khoan 
      FROM public.taikhoan tk
      LEFT JOIN public.nguoi ng ON tk.ma_nguoi = ng.ma_nguoi
      WHERE tk.ten_dang_nhap = $1 OR ng.so_dien_thoai = $1
      LIMIT 1
    `;
    const checkRes = await db.query(checkQuery, [phone]);
    if (checkRes.rows.length > 0) {
      const err = new Error('User phone already exists (Số điện thoại đã tồn tại trong hệ thống)');
      err.code = 3006;
      err.statusCode = 400;
      throw err;
    }

    // 5. Chuẩn bị ngày sinh từ năm sinh
    let dob = null;
    if (yearOfBirth && yearOfBirth > 1900 && yearOfBirth <= new Date().getFullYear()) {
      dob = `${yearOfBirth}-01-01`;
    }

    // Băm mật khẩu
    const salt = await bcrypt.genSalt(10);
    const hashedPassword = await bcrypt.hash(password, salt);

    // Bắt đầu Transaction CSDL
    const client = await db.pool.connect();
    try {
      await client.query('BEGIN');

      // Bước 1: Thêm vào bảng nguoi
      const nguoiQuery = `
        INSERT INTO public.nguoi (
          ho_ten, so_dien_thoai, gioi_tinh, ngay_sinh, 
          dia_chi_tinh_tp, dia_chi_xa_phuong, dia_chi_so_nha_thon_pho
        )
        VALUES ($1, $2, $3, $4, $5, $6, $7)
        RETURNING ma_nguoi, thoi_diem_tao
      `;
      const nguoiRes = await client.query(nguoiQuery, [
        fullName,
        phone,
        gender,
        dob,
        city,
        commune,
        hamlet,
      ]);
      const ma_nguoi = nguoiRes.rows[0].ma_nguoi;
      const thoi_diem_tao = nguoiRes.rows[0].thoi_diem_tao;

      // Bước 2: Lấy mã vai trò Bệnh nhân ('benh_nhan' trong public.vaitro)
      const roleRes = await client.query(
        "SELECT ma_vai_tro FROM public.vaitro WHERE LOWER(ten_vai_tro) IN ('benh_nhan', 'patient') ORDER BY CASE WHEN LOWER(ten_vai_tro) = 'benh_nhan' THEN 0 ELSE 1 END LIMIT 1"
      );
      if (roleRes.rows.length === 0) {
        const err = new Error('Không tìm thấy vai trò benh_nhan trong hệ thống');
        err.code = 9902;
        err.statusCode = 500;
        throw err;
      }
      const roleId = roleRes.rows[0].ma_vai_tro;

      // Bước 3: Tạo tài khoản đăng nhập trong taikhoan
      const tkQuery = `
        INSERT INTO public.taikhoan (
          ma_nguoi, ma_vai_tro, ten_dang_nhap, mat_khau_ma_hoa, trang_thai_hoat_dong
        )
        VALUES ($1, $2, $3, $4, TRUE)
        RETURNING ma_tai_khoan
      `;
      await client.query(tkQuery, [ma_nguoi, roleId, phone, hashedPassword]);

      // Bước 4: Tạo hồ sơ bệnh nhân trong benhnhan (ma_benh_nhan = ma_nguoi)
      const validNextOfKinPhone = nextOfKinPhone && /^[0-9]{10}$/.test(nextOfKinPhone) ? nextOfKinPhone : null;
      const validBhyt = bhytNumber && bhytNumber.trim().length > 0 ? bhytNumber.trim() : null;

      const bnQuery = `
        INSERT INTO public.benhnhan (
          ma_benh_nhan, nghe_nghiep, dan_toc, bhyt_so_the, bhyt_gia_tri_den,
          nguoi_nha_ho_ten_dia_chi, nguoi_nha_so_dien_thoai
        )
        VALUES ($1, $2, $3, $4, $5, $6, $7)
        RETURNING ma_benh_nhan
      `;
      await client.query(bnQuery, [
        ma_nguoi,
        career,
        ethnic,
        validBhyt,
        bhytValidate,
        nextOfKinName,
        validNextOfKinPhone,
      ]);

      await client.query('COMMIT');

      return {
        user_id: Number(ma_nguoi),
        full_name: fullName,
        phone,
        role_id: Number(roleId),
        gender: gender || null,
        year_of_birth: yearOfBirth,
        career: career || null,
        ethnic: ethnic || null,
        hamlet_address: hamlet,
        commune_address: commune,
        city_address: city,
        work_place: data.work_place || null,
        health_insurance_number: validBhyt,
        health_insurance_validate: bhytValidate,
        next_of_kin_name: nextOfKinName,
        next_of_kin_phone: validNextOfKinPhone,
        created_at: thoi_diem_tao ? thoi_diem_tao.toISOString() : new Date().toISOString(),
      };
    } catch (err) {
      await client.query('ROLLBACK');
      throw err;
    } finally {
      client.release();
    }
  }
}

module.exports = new Docpat02Service();

