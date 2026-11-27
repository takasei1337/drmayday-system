'use strict';

const db = require('../../config/db');

class Uas701Service {
  /**
   * uas701: Kiểm tra điều kiện chấm điểm UAS7 cho bệnh nhân.
   * Logic: Tìm bệnh án đang 'in_progress' thuộc bệnh nhân (ma_benh_nhan = req.user.ma_nguoi).
   * Lưu ý: Toàn bộ giá trị trả về phải là kiểu string.
   *
   * @param {object} user - req.user từ JWT middleware ({ ma_tai_khoan, ma_nguoi, vai_tro })
   * @returns {{ eligible: string, medical_record_id?: string }}
   */
  async checkEligibility(user) {
    const maBenhNhan = user.ma_nguoi;

    // Tìm bệnh án đang 'in_progress' của bệnh nhân (lấy mới nhất)
    const result = await db.query(
      `SELECT ma_ho_so
       FROM public.hosobenhan
       WHERE ma_benh_nhan = $1
         AND trang_thai = 'in_progress'
       ORDER BY ma_ho_so DESC
       LIMIT 1`,
      [maBenhNhan]
    );

    if (result.rows.length === 0) {
      // Không có bệnh án active
      return { eligible: 'false' };
    }

    const maHoSo = result.rows[0].ma_ho_so;
    return {
      eligible: 'true',
      medical_record_id: String(maHoSo),
    };
  }
}

module.exports = new Uas701Service();

