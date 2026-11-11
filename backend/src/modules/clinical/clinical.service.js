const db = require('../../config/db');

/**
 * THÀNH VIÊN 3: Phụ trách Slide 6 & 7
 * Các bảng: thuoc, donthuoc, chitietdonthuoc, chidanngungthuoc, ketquacanlamsang, chukytheodoiuas7, nhatkyuashangngay, nhatkyaashangngay, danhgiamucdohoatdongbenh
 */
class ClinicalService {
  // Lấy danh mục thuốc
  async getThuocList() {
    const query = 'SELECT * FROM public.thuoc ORDER BY ten_biet_duoc ASC';
    const result = await db.query(query);
    return result.rows;
  }

  // Lấy đơn thuốc theo phiên khám
  async getDonThuocByPhienKham(ma_phien_kham) {
    const query = `
      SELECT dt.*, ct.ma_chi_tiet, ct.lieu_dung, ct.duong_dung, ct.so_luong, ct.so_ngay_dung,
             th.ten_biet_duoc, th.hoat_chat, th.ham_luong, th.don_vi_tinh
      FROM public.donthuoc dt
      LEFT JOIN public.chitietdonthuoc ct ON dt.ma_don_thuoc = ct.ma_don_thuoc
      LEFT JOIN public.thuoc th ON ct.ma_thuoc = th.ma_thuoc
      WHERE dt.ma_phien_kham = $1
    `;
    const result = await db.query(query, [ma_phien_kham]);
    return result.rows;
  }

  // Lấy chu kỳ theo dõi UAS7 của bệnh nhân
  async getChuKyUAS7(ma_benh_nhan) {
    const query = `
      SELECT * FROM public.chukytheodoiuas7
      WHERE ma_benh_nhan = $1
      ORDER BY ngay_bat_dau DESC
    `;
    const result = await db.query(query, [ma_benh_nhan]);
    return result.rows;
  }

  // Ghi nhật ký UAS7 hàng ngày (cho Bệnh nhân)
  async logUAS7Daily(data) {
    const {
      ma_chu_ky,
      ngay_ghi_nhan,
      diem_ngua_sang,
      diem_san_sang,
      diem_ngua_toi,
      diem_san_toi,
      anh_huong_giac_ngu,
      anh_huong_sinh_hoat,
    } = data;

    // Tính tổng điểm UAS trong ngày = (ngứa sáng + sẩn sáng + ngứa tối + sẩn tối)
    const tong_diem_ngay = (Number(diem_ngua_sang) || 0) + (Number(diem_san_sang) || 0) +
                           (Number(diem_ngua_toi) || 0) + (Number(diem_san_toi) || 0);

    const query = `
      INSERT INTO public.nhatkyuashangngay (
        ma_chu_ky, ngay_ghi_nhan, diem_ngua_sang, diem_san_sang,
        diem_ngua_toi, diem_san_toi, tong_diem_ngay, anh_huong_giac_ngu, anh_huong_sinh_hoat
      )
      VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9)
      RETURNING *
    `;
    const result = await db.query(query, [
      ma_chu_ky, ngay_ghi_nhan, diem_ngua_sang, diem_san_sang,
      diem_ngua_toi, diem_san_toi, tong_diem_ngay, anh_huong_giac_ngu, anh_huong_sinh_hoat
    ]);
    return result.rows[0];
  }
}

module.exports = new ClinicalService();
