const db = require('../../config/db');
const prisma = require('../../config/prisma');
const {
  VALID_RECORD_STATUSES,
  createBusinessError,
  parsePositiveRecordId,
  resolveFallbackTemplate,
  fetchMetaMapByRecordIds,
  extractInstructions,
} = require('./medical_records.helper');

class Medrec11Service {
  /**
   * medrec11: Bác sĩ phụ trách "Chốt bệnh án" (cập nhật instructions, status = completed, completed_at)
   * Căn cứ: Slide 5 (trang 40-42) & Sheet PUT apimedical_recordsid
   */
  async completeMedicalRecord(idParam, body, user) {
    const recordId = parsePositiveRecordId(idParam);
    const doctorId = Number(user?.ma_tai_khoan || user?.ma_nguoi);
    const role = (user?.vai_tro || '').toLowerCase().trim();

    if (!doctorId) {
      throw createBusinessError('User not authenticated', 3003, 401);
    }

    const rawStatus = body?.status !== undefined && body?.status !== null ? String(body.status).trim() : '';
    const targetStatus = rawStatus ? rawStatus.toLowerCase() : 'completed';

    if (!VALID_RECORD_STATUSES.includes(targetStatus)) {
      throw createBusinessError('Invalid medical record status', 4009, 400);
    }

    const hasInstructions = body?.instructions !== undefined && body?.instructions !== null;
    const instructionsText = hasInstructions ? String(body.instructions) : null;

    const mainRes = await db.query(
      `
      SELECT
        ma_ho_so,
        ma_benh_nhan,
        loai_benh_an,
        trang_thai,
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
    const metaMap = await fetchMetaMapByRecordIds([row.ma_ho_so]);
    const meta = metaMap[String(row.ma_ho_so)];

    const assignedDoctorId =
      meta && meta.assigned_doctor_id !== null && meta.assigned_doctor_id !== undefined
        ? Number(meta.assigned_doctor_id)
        : null;

    // Test Case 2: Một bác sĩ khác (không phải assigned_doctor_id) gọi API -> 3105
    if (role !== 'admin' && assignedDoctorId !== doctorId) {
      throw createBusinessError('Doctor not assigned to this record', 3105, 403);
    }

    // Hồ sơ đã hoàn tất trước đó -> 4003
    if (row.trang_thai === 'completed') {
      throw createBusinessError('Medical record already completed', 4003, 400);
    }

    const oldStatus = row.trang_thai;
    const isCompleted = targetStatus === 'completed';

    await db.query(
      `UPDATE public.hosobenhan SET trang_thai = $1 WHERE ma_ho_so = $2`,
      [targetStatus, recordId]
    );

    let updatedMeta = null;
    try {
      if (meta) {
        const metaRes = await prisma.$queryRawUnsafe(
          `
          UPDATE public.medical_record_meta
          SET doctor_conclusion = CASE WHEN $1::boolean THEN $2 ELSE doctor_conclusion END,
              completed_at = CASE WHEN $3::boolean THEN NOW() ELSE completed_at END,
              completed_by = CASE WHEN $3::boolean THEN $4 ELSE completed_by END,
              locked_at = CASE WHEN $3::boolean THEN NOW() ELSE locked_at END,
              updated_at = NOW()
          WHERE ma_ho_so = $5
          RETURNING ma_ho_so, assigned_doctor_id, created_by, doctor_conclusion, completed_at, updated_at
          `,
          hasInstructions,
          instructionsText,
          isCompleted,
          BigInt(doctorId),
          BigInt(recordId)
        );
        updatedMeta = metaRes[0] || null;
      } else {
        const fallbackCode = resolveFallbackTemplate(row.loai_benh_an);
        const tmpl = await prisma.template.findFirst({
          where: { codeTemplate: fallbackCode },
          select: { id: true },
        });
        const recordSubtype = fallbackCode.replace(/^TMPL_/, '');

        const metaRes = await prisma.$queryRawUnsafe(
          `
          INSERT INTO public.medical_record_meta (
            ma_ho_so, ma_benh_nhan, template_id, record_subtype,
            assigned_doctor_id, doctor_conclusion,
            completed_at, completed_by, locked_at, updated_at
          )
          VALUES (
            $1, $2, $3, $4,
            $5, $6,
            CASE WHEN $7::boolean THEN NOW() ELSE NULL END,
            CASE WHEN $7::boolean THEN $5 ELSE NULL END,
            CASE WHEN $7::boolean THEN NOW() ELSE NULL END,
            NOW()
          )
          RETURNING ma_ho_so, assigned_doctor_id, created_by, doctor_conclusion, completed_at, updated_at
          `,
          BigInt(recordId),
          BigInt(row.ma_benh_nhan),
          tmpl ? tmpl.id : null,
          recordSubtype,
          BigInt(doctorId),
          instructionsText,
          isCompleted
        );
        updatedMeta = metaRes[0] || null;
      }
    } catch (subErr) {
      await db.query(
        `UPDATE public.hosobenhan SET trang_thai = $1 WHERE ma_ho_so = $2`,
        [oldStatus, recordId]
      );
      throw subErr;
    }

    return {
      medical_record_id: Number(row.ma_ho_so),
      patient_id: Number(row.ma_benh_nhan),
      assigned_doctor_id:
        updatedMeta && updatedMeta.assigned_doctor_id !== null && updatedMeta.assigned_doctor_id !== undefined
          ? Number(updatedMeta.assigned_doctor_id)
          : assignedDoctorId,
      created_by:
        updatedMeta && updatedMeta.created_by !== null && updatedMeta.created_by !== undefined
          ? Number(updatedMeta.created_by)
          : null,
      template_id: (meta && meta.code_template) || resolveFallbackTemplate(row.loai_benh_an),
      status: targetStatus,
      instructions:
        updatedMeta && updatedMeta.doctor_conclusion !== undefined
          ? updatedMeta.doctor_conclusion
          : extractInstructions(row, meta),
      completed_at:
        updatedMeta && updatedMeta.completed_at
          ? new Date(updatedMeta.completed_at).toISOString()
          : null,
      updated_at:
        updatedMeta && updatedMeta.updated_at
          ? new Date(updatedMeta.updated_at).toISOString()
          : new Date().toISOString(),
    };
  }
}

module.exports = new Medrec11Service();

