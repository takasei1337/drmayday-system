const db = require('../../config/db');
const {
  VALID_RECORD_STATUSES,
  createBusinessError,
  resolveFallbackTemplate,
  fetchMetaMapByRecordIds,
} = require('./medical_records.helper');

class Medrec04Service {
  /**
   * medrec04: Bác sĩ / Admin / Lễ tân lấy danh sách toàn bộ hồ sơ bệnh án để điều phối
   * Căn cứ: Slide 5 (trang 24-26) & Sheet GET apimedical_recordsall
   */
  async getAllMedicalRecords(queryParams) {
    const { status, patient_id } = queryParams || {};
    const page = Math.max(1, parseInt(queryParams?.page, 10) || 1);
    const limit = Math.max(1, parseInt(queryParams?.limit, 10) || 20);
    const offset = (page - 1) * limit;

    const conditions = [];
    const values = [];
    let paramIndex = 1;

    if (status !== undefined && String(status).trim() !== '') {
      const normalizedStatus = String(status).trim().toLowerCase();
      if (!VALID_RECORD_STATUSES.includes(normalizedStatus)) {
        throw createBusinessError('Invalid medical record status', 4009, 400);
      }
      conditions.push(`trang_thai = $${paramIndex}`);
      values.push(normalizedStatus);
      paramIndex++;
    }

    if (patient_id !== undefined && String(patient_id).trim() !== '') {
      const parsedPatientId = parseInt(patient_id, 10);
      if (!parsedPatientId || parsedPatientId <= 0) {
        throw createBusinessError('Invalid parameter value: patient_id', 2003, 400);
      }
      conditions.push(`ma_benh_nhan = $${paramIndex}`);
      values.push(parsedPatientId);
      paramIndex++;
    }

    const whereClause = conditions.length > 0 ? `WHERE ${conditions.join(' AND ')}` : '';

    const mainQuery = `
      SELECT
        ma_ho_so,
        ma_benh_nhan,
        loai_benh_an,
        trang_thai,
        thoi_diem_kham_lan_dau,
        ngay_bat_dau_dieu_tri_ngoai_tru
      FROM public.hosobenhan
      ${whereClause}
      ORDER BY ma_ho_so DESC
      LIMIT $${paramIndex} OFFSET $${paramIndex + 1}
    `;
    values.push(limit, offset);

    const mainRes = await db.query(mainQuery, values);
    const rows = mainRes.rows;

    if (rows.length === 0) {
      return [];
    }

    // Truy vấn metadata bổ sung từ Sub DB Supabase (assigned_doctor_id & code_template)
    const metaMap = await fetchMetaMapByRecordIds(rows.map((r) => r.ma_ho_so));

    return rows.map((row) => {
      const meta = metaMap[String(row.ma_ho_so)];
      const fallbackTemplate = resolveFallbackTemplate(row.loai_benh_an);
      const rawCreated =
        row.thoi_diem_kham_lan_dau ||
        row.ngay_bat_dau_dieu_tri_ngoai_tru ||
        (meta && meta.updated_at) ||
        null;

      return {
        medical_record_id: Number(row.ma_ho_so),
        patient_id: Number(row.ma_benh_nhan),
        assigned_doctor_id:
          meta && meta.assigned_doctor_id !== null && meta.assigned_doctor_id !== undefined
            ? Number(meta.assigned_doctor_id)
            : null,
        template_id: (meta && meta.code_template) || fallbackTemplate,
        status: row.trang_thai,
        created_at: rawCreated ? new Date(rawCreated).toISOString() : null,
      };
    });
  }
}

module.exports = new Medrec04Service();

