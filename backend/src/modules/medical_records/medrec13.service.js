const db = require('../../config/db');
const {
  createBusinessError,
  findPatientIdInMainDb,
  fetchMetaMapByRecordIds,
  extractCreatedAt,
  extractInstructions,
} = require('./medical_records.helper');

class Medrec13Service {
  /**
   * medrec13: Truy xuất toàn bộ lịch sử các hồ sơ bệnh án của 1 bệnh nhân cụ thể
   * Căn cứ: Slide 5 (trang 33-35) & Sheet GET apimedical_recordspatientsi
   */
  async getPatientMedicalHistory(idParam, user) {
    const rawId = idParam !== undefined && idParam !== null ? String(idParam).trim() : '';
    if (!/^\d+$/.test(rawId) || parseInt(rawId, 10) <= 0) {
      throw createBusinessError('Invalid parameter value: patient_id', 2003, 400);
    }

    const targetId = parseInt(rawId, 10);
    const role = (user?.vai_tro || '').toLowerCase().trim();
    const isPatient = role === 'benh_nhan' || role === 'patient';

    // RBAC Test Case 2: Bệnh nhân A cố tình truyền ID của Bệnh nhân B -> 3106
    let maBenhNhan;
    if (isPatient) {
      const isSelf =
        targetId === Number(user?.ma_nguoi) || targetId === Number(user?.ma_tai_khoan);
      if (!isSelf) {
        throw createBusinessError("Cannot access another user's data", 3106, 403);
      }
      maBenhNhan = await findPatientIdInMainDb(Number(user?.ma_nguoi));
    } else {
      maBenhNhan = await findPatientIdInMainDb(targetId);
    }

    // Query Main DB theo patient_id, sắp xếp mới nhất giảm dần theo created_at & ma_ho_so
    const mainRes = await db.query(
      `
      SELECT
        ma_ho_so,
        ma_benh_nhan,
        trang_thai,
        thoi_diem_kham_lan_dau,
        ngay_bat_dau_dieu_tri_ngoai_tru,
        chan_doan_ban_dau_phong_kham
      FROM public.hosobenhan
      WHERE ma_benh_nhan = $1
      ORDER BY COALESCE(thoi_diem_kham_lan_dau, ngay_bat_dau_dieu_tri_ngoai_tru::timestamptz) DESC NULLS LAST, ma_ho_so DESC
      `,
      [maBenhNhan]
    );

    const rows = mainRes.rows;
    if (rows.length === 0) {
      return [];
    }

    const metaMap = await fetchMetaMapByRecordIds(rows.map((r) => r.ma_ho_so));

    return rows.map((row) => {
      const meta = metaMap[String(row.ma_ho_so)];
      return {
        medical_record_id: Number(row.ma_ho_so),
        status: row.trang_thai,
        instructions: extractInstructions(row, meta),
        created_at: extractCreatedAt(row, meta),
      };
    });
  }
}

module.exports = new Medrec13Service();
