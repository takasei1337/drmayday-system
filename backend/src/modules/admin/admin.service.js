const db = require('../../config/db');

/**
 * THÀNH VIÊN 1: Phụ trách Slide 3 & 4
 * Các bảng: chinhanh, phongkham, nguoi, nhanvien, taikhoan, vaitro, quyenhan, vaitroquyenhan
 */
class AdminService {
  // Lấy danh sách chi nhánh
  async getChiNhanhList() {
    const query = 'SELECT * FROM public.chinhanh ORDER BY ma_chi_nhanh ASC';
    const result = await db.query(query);
    return result.rows;
  }

  // Thêm chi nhánh mới
  async createChiNhanh(data) {
    const { ten_chi_nhanh, dia_chi, so_dien_thoai } = data;
    const query = `
      INSERT INTO public.chinhanh (ten_chi_nhanh, dia_chi, so_dien_thoai)
      VALUES ($1, $2, $3)
      RETURNING *
    `;
    const result = await db.query(query, [ten_chi_nhanh, dia_chi, so_dien_thoai]);
    return result.rows[0];
  }

  // Lấy danh sách phòng khám thuộc chi nhánh
  async getPhongKhamList(ma_chi_nhanh = null) {
    let query = 'SELECT * FROM public.phongkham';
    const params = [];
    if (ma_chi_nhanh) {
      query += ' WHERE ma_chi_nhanh = $1';
      params.push(ma_chi_nhanh);
    }
    query += ' ORDER BY ma_phong_kham ASC';
    const result = await db.query(query, params);
    return result.rows;
  }

  // Lấy danh sách nhân viên / bác sĩ
  async getNhanVienList() {
    const query = `
      SELECT nv.ma_nhan_vien, nv.ma_dinh_danh_y_te, nv.chuyen_khoa, nv.hoc_ham_hoc_vi,
             ng.ho_va_ten, ng.email, ng.so_dien_thoai, ng.gioi_tinh
      FROM public.nhanvien nv
      JOIN public.nguoi ng ON nv.ma_nguoi = ng.ma_nguoi
      ORDER BY nv.ma_nhan_vien ASC
    `;
    const result = await db.query(query);
    return result.rows;
  }
}

module.exports = new AdminService();
