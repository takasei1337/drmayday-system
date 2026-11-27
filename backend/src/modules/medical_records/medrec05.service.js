const db = require('../../config/db');
const {
  createBusinessError,
  parsePositiveRecordId,
  assertRecordOwnership,
  resolveFallbackTemplate,
  fetchMetaMapByRecordIds,
} = require('./medical_records.helper');

class Medrec05Service {
  /**
   * medrec05: Xem chi tiết tổng quan của 1 hồ sơ bệnh án cụ thể
   * Căn cứ: Slide 5 (trang 27-29) & Sheet GET apimedical_recordsid
   */
  async getMedicalRecordById(idParam, user) {
    const recordId = parsePositiveRecordId(idParam);

    const mainRes = await db.query(
      `
      SELECT
        ma_ho_so,
        ma_benh_nhan,
        loai_benh_an,
        trang_thai,
        thoi_diem_kham_lan_dau,
        ngay_bat_dau_dieu_tri_ngoai_tru,
        ngay_ket_thuc_dieu_tri_ngoai_tru,
        chan_doan_ban_dau_phong_kham
      FROM public.hosobenhan
      WHERE ma_ho_so = $1
      LIMIT 1
      `,
      [recordId]
    );

    if (mainRes.rows.length === 0) {
      throw createBusinessError('Medical record not found', 4001, 404);
    }

    const row = mainRes.rows[0];

    // Bệnh nhân chỉ được xem hồ sơ của chính mình; nhân viên y tế / bác sĩ / admin được xem toàn bộ
    assertRecordOwnership(row.ma_benh_nhan, user);

    const metaMap = await fetchMetaMapByRecordIds([row.ma_ho_so]);
    const meta = metaMap[String(row.ma_ho_so)];

    const rawCreated =
      row.thoi_diem_kham_lan_dau ||
      row.ngay_bat_dau_dieu_tri_ngoai_tru ||
      (meta && meta.updated_at) ||
      null;

    const rawCompleted =
      (meta && meta.completed_at) || row.ngay_ket_thuc_dieu_tri_ngoai_tru || null;

    const rawUpdated = (meta && meta.updated_at) || rawCreated || null;

    return {
      medical_record_id: Number(row.ma_ho_so),
      patient_id: Number(row.ma_benh_nhan),
      assigned_doctor_id:
        meta && meta.assigned_doctor_id !== null && meta.assigned_doctor_id !== undefined
          ? Number(meta.assigned_doctor_id)
          : null,
      created_by:
        meta && meta.created_by !== null && meta.created_by !== undefined
          ? Number(meta.created_by)
          : null,
      template_id: (meta && meta.code_template) || resolveFallbackTemplate(row.loai_benh_an),
      status: row.trang_thai,
      instructions:
        (meta && (meta.doctor_conclusion || meta.doctor_notes)) ||
        row.chan_doan_ban_dau_phong_kham ||
        null,
      completed_at: rawCompleted ? new Date(rawCompleted).toISOString() : null,
      created_at: rawCreated ? new Date(rawCreated).toISOString() : null,
      updated_at: rawUpdated ? new Date(rawUpdated).toISOString() : null,
    };
  }
}

module.exports = new Medrec05Service();

