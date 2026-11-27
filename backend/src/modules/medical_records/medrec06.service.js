const db = require('../../config/db');
const {
  createBusinessError,
  parsePositiveRecordId,
  assertRecordOwnership,
  fetchMetaMapByRecordIds,
} = require('./medical_records.helper');

class Medrec06Service {
  /**
   * medrec06: Lấy bản tóm tắt nhanh (Summary) của 1 hồ sơ bệnh án để hiển thị dạng thẻ/header
   * Căn cứ: Slide 5 (trang 30-32) & Sheet GET apimedical_recordsidsummary
   */
  async getMedicalRecordSummary(idParam, user) {
    const recordId = parsePositiveRecordId(idParam);

    const res = await db.query(
      `
      SELECT
        hs.ma_ho_so,
        hs.ma_benh_nhan,
        hs.trang_thai,
        hs.thoi_diem_kham_lan_dau,
        hs.ngay_bat_dau_dieu_tri_ngoai_tru,
        ng.ho_ten AS patient_name
      FROM public.hosobenhan hs
      JOIN public.nguoi ng ON hs.ma_benh_nhan = ng.ma_nguoi
      WHERE hs.ma_ho_so = $1
      LIMIT 1
      `,
      [recordId]
    );

    if (res.rows.length === 0) {
      throw createBusinessError('Medical record not found', 4001, 404);
    }

    const row = res.rows[0];
    assertRecordOwnership(row.ma_benh_nhan, user);

    let rawCreated = row.thoi_diem_kham_lan_dau || row.ngay_bat_dau_dieu_tri_ngoai_tru || null;
    if (!rawCreated) {
      const metaMap = await fetchMetaMapByRecordIds([row.ma_ho_so]);
      const meta = metaMap[String(row.ma_ho_so)];
      if (meta && meta.updated_at) {
        rawCreated = meta.updated_at;
      }
    }

    return {
      medical_record_id: Number(row.ma_ho_so),
      status: row.trang_thai,
      patient_name: row.patient_name,
      created_at: rawCreated ? new Date(rawCreated).toISOString() : null,
    };
  }
}

module.exports = new Medrec06Service();

