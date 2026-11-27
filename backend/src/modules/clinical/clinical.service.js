const db = require('../../config/db');

/**
 * THÀNH VIÊN 3: Phụ trách Slide 6 & 7
 * Các bảng: thuoc, donthuoc, chitietdonthuoc, chidanngungthuoc, ketquacanlamsang, chukytheodoiuas7, nhatkyuashangngay, nhatkyaashangngay, danhgiamucdohoatdongbenh
 */
class ClinicalService {
  // Lấy danh mục thuốc
  async getThuocList() {
    const query = 'SELECT * FROM public.thuoc ORDER BY ten_thuoc ASC';
    const result = await db.query(query);
    return result.rows;
  }

  // Lấy đơn thuốc theo phiên khám (qua ma_ho_so của phienkham)
  async getDonThuocByPhienKham(ma_phien_kham) {
    const query = `
      SELECT dt.*, pk.ma_phien_kham,
             ct.ma_chi_tiet_don_thuoc, ct.ma_thuoc, ct.ten_thuoc_bo_sung,
             ct.lieu_dung, ct.thoi_gian_dung, ct.ma_ke_hoach_dieu_tri,
             th.ten_thuoc, th.hoat_chat, th.nhom_dieu_tri
      FROM public.phienkham pk
      JOIN public.donthuoc dt ON pk.ma_ho_so = dt.ma_ho_so
      LEFT JOIN public.chitietdonthuoc ct ON dt.ma_don_thuoc = ct.ma_don_thuoc
      LEFT JOIN public.thuoc th ON ct.ma_thuoc = th.ma_thuoc
      WHERE pk.ma_phien_kham = $1
      ORDER BY dt.ma_don_thuoc DESC, ct.ma_chi_tiet_don_thuoc ASC
    `;
    const result = await db.query(query, [ma_phien_kham]);
    return result.rows;
  }

  // Lấy chu kỳ theo dõi UAS7 của bệnh nhân
  async getChuKyUAS7(ma_benh_nhan) {
    const query = `
      SELECT * FROM public.v_chukytheodoiuas7
      WHERE ma_benh_nhan = $1
      ORDER BY ngay_bat_dau DESC
    `;
    const result = await db.query(query, [ma_benh_nhan]);
    return result.rows;
  }

  // Ghi nhật ký UAS7 hàng ngày (khớp đúng schema nhatkyuashangngay)
  async logUAS7Daily(data) {
    const maChuKy = parseInt(data.ma_chu_ky, 10);
    const ngayChamDiem = String(data.ngay_cham_diem || data.ngay_ghi_nhan || data.score_date || '').slice(0, 10);

    const ckRes = await db.query(
      `SELECT ma_chu_ky, ma_benh_nhan, ngay_bat_dau,
              ($2::DATE - ngay_bat_dau)::INT + 1 AS day_idx
       FROM public.chukytheodoiuas7
       WHERE ma_chu_ky = $1 LIMIT 1`,
      [maChuKy, ngayChamDiem]
    );
    const ck = ckRes.rows[0];
    if (!ck) {
      const err = new Error(`Không tìm thấy chu kỳ UAS7 #${maChuKy}`);
      err.code = 3007;
      err.statusCode = 404;
      throw err;
    }

    const hss = data.diem_san_phu_hss !== undefined
      ? parseInt(data.diem_san_phu_hss, 10)
      : Math.min(3, Math.max(0, Number(data.diem_san_sang || 0) + Number(data.diem_san_toi || 0)));
    const iss = data.diem_ngua_iss !== undefined
      ? parseInt(data.diem_ngua_iss, 10)
      : Math.min(3, Math.max(0, Number(data.diem_ngua_sang || 0) + Number(data.diem_ngua_toi || 0)));

    const query = `
      INSERT INTO public.nhatkyuashangngay (
        ma_chu_ky, ma_ho_so_man, ma_benh_nhan, ngay_cham_diem,
        ngay_thu_may_trong_chu_ky, diem_san_phu_hss, diem_ngua_iss,
        trang_thai_dung_thuoc, trang_thai_ngay
      )
      VALUES ($1, $2, $3, $4::DATE, $5, $6, $7, $8, 'HOP_LE')
      ON CONFLICT (ma_benh_nhan, ngay_cham_diem)
      DO UPDATE SET
        diem_san_phu_hss = EXCLUDED.diem_san_phu_hss,
        diem_ngua_iss = EXCLUDED.diem_ngua_iss,
        trang_thai_dung_thuoc = COALESCE(EXCLUDED.trang_thai_dung_thuoc, public.nhatkyuashangngay.trang_thai_dung_thuoc)
      RETURNING *
    `;
    const result = await db.query(query, [
      maChuKy,
      data.ma_ho_so_man || null,
      ck.ma_benh_nhan,
      ngayChamDiem,
      Math.min(7, Math.max(1, Number(ck.day_idx) || 1)),
      hss,
      iss,
      data.trang_thai_dung_thuoc || null,
    ]);
    return result.rows[0];
  }
}

module.exports = new ClinicalService();
