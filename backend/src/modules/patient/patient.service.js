const db = require('../../config/db');

/**
 * THÀNH VIÊN 2: Phụ trách Slide 5
 * Các bảng: benhnhan, hosobenhan, phienkham, benhanmaydaycap, benhanmaydayman, tiensubanthan, sanglocbaodongdo
 */
class PatientService {
  // Lấy danh sách bệnh nhân
  async getBenhNhanList(limit = 50, offset = 0) {
    const query = `
      SELECT bn.ma_benh_nhan, bn.ma_dinh_danh_y_te, bn.nghe_nghiep, bn.nhom_mau,
             ng.ho_va_ten, ng.ngay_sinh, ng.gioi_tinh, ng.so_dien_thoai, ng.dia_chi_hien_tai
      FROM public.benhnhan bn
      JOIN public.nguoi ng ON bn.ma_nguoi = ng.ma_nguoi
      ORDER BY bn.ma_benh_nhan DESC
      LIMIT $1 OFFSET $2
    `;
    const result = await db.query(query, [limit, offset]);
    return result.rows;
  }

  // Lấy chi tiết hồ sơ bệnh án của 1 bệnh nhân
  async getHoSoBenhAnByPatientId(ma_benh_nhan) {
    const query = `
      SELECT hs.*, pk.ten_phong_kham
      FROM public.hosobenhan hs
      LEFT JOIN public.phongkham pk ON hs.ma_phong_kham = pk.ma_phong_kham
      WHERE hs.ma_benh_nhan = $1
      ORDER BY hs.ngay_tao_ho_so DESC
    `;
    const result = await db.query(query, [ma_benh_nhan]);
    return result.rows;
  }

  // Tạo hồ sơ bệnh án mới
  async createHoSoBenhAn(data) {
    const { ma_benh_nhan, ma_nhan_vien_tiep_nhan, ma_phong_kham, loai_benh_an, ly_do_den_kham } = data;
    const query = `
      INSERT INTO public.hosobenhan (ma_benh_nhan, ma_nhan_vien_tiep_nhan, ma_phong_kham, loai_benh_an, ly_do_den_kham)
      VALUES ($1, $2, $3, $4, $5)
      RETURNING *
    `;
    const result = await db.query(query, [ma_benh_nhan, ma_nhan_vien_tiep_nhan, ma_phong_kham, loai_benh_an, ly_do_den_kham]);
    return result.rows[0];
  }

  // Lấy danh sách phiên khám của một hồ sơ
  async getPhienKhamList(ma_ho_so) {
    const query = `
      SELECT * FROM public.phienkham
      WHERE ma_ho_so = $1
      ORDER BY thoi_diem_bat_dau_kham DESC
    `;
    const result = await db.query(query, [ma_ho_so]);
    return result.rows;
  }
}

module.exports = new PatientService();
