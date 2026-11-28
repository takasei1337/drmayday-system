const db = require('../../config/db');
const prisma = require('../../config/prisma');
const {
  createBusinessError,
  parsePositiveRecordId,
  resolveFallbackTemplate,
  fetchMetaMapByRecordIds,
} = require('./medical_records.helper');

class Medrec07Service {
  /**
   * medrec07: Bác sĩ tiếp nhận hồ sơ bệnh án ("nhận ca" khám)
   * Căn cứ: Slide 5 (trang 37-39) & Sheet POST apimedical_recordsidaccept
   */
  async acceptMedicalRecord(idParam, user) {
    const recordId = parsePositiveRecordId(idParam);
    const doctorId = Number(user?.ma_tai_khoan || user?.ma_nguoi || user?.user_id || user?.id);

    if (!doctorId) {
      throw createBusinessError('User not authenticated', 3003, 401);
    }

    const mainRes = await db.query(
      `
      SELECT ma_ho_so, ma_benh_nhan, loai_benh_an, trang_thai
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

    // Test Case 2: Bệnh án đã được bác sĩ khác nhận (status = in_progress) -> 4005
    if (row.trang_thai === 'in_progress') {
      throw createBusinessError('Already accepted by another doctor', 4005, 400);
    }

    // Test Case 3: Bệnh án không ở trạng thái pending (draft, completed, cancelled) -> 4004
    if (row.trang_thai !== 'pending') {
      throw createBusinessError('Medical record not in pending status', 4004, 400);
    }

    if (meta && meta.assigned_doctor_id !== null && meta.assigned_doctor_id !== undefined) {
      throw createBusinessError('Already accepted by another doctor', 4005, 400);
    }

    // Cập nhật có điều kiện trên Main DB để chống race condition
    const updateMain = await db.query(
      `
      UPDATE public.hosobenhan
      SET trang_thai = 'in_progress'
      WHERE ma_ho_so = $1 AND trang_thai = 'pending'
      RETURNING ma_ho_so, trang_thai
      `,
      [recordId]
    );

    if (updateMain.rows.length === 0) {
      throw createBusinessError('Already accepted by another doctor', 4005, 400);
    }

    try {
      if (meta) {
        await prisma.$executeRawUnsafe(
          `
          UPDATE public.medical_record_meta
          SET assigned_doctor_id = $1,
              accepted_at = NOW(),
              accepted_by = $1,
              updated_at = NOW()
          WHERE ma_ho_so = $2
          `,
          BigInt(doctorId),
          BigInt(recordId)
        );
      } else {
        const fallbackCode = resolveFallbackTemplate(row.loai_benh_an);
        const tmpl = await prisma.template.findFirst({
          where: { codeTemplate: fallbackCode },
          select: { id: true, codeTemplate: true },
        });
        const recordSubtype = fallbackCode.replace(/^TMPL_/, '');

        await prisma.$executeRawUnsafe(
          `
          INSERT INTO public.medical_record_meta (
            ma_ho_so, ma_benh_nhan, template_id, record_subtype,
            assigned_doctor_id, accepted_at, accepted_by, updated_at
          )
          VALUES ($1, $2, $3, $4, $5, NOW(), $5, NOW())
          `,
          BigInt(recordId),
          BigInt(row.ma_benh_nhan),
          tmpl ? tmpl.id : null,
          recordSubtype,
          BigInt(doctorId)
        );
      }
    } catch (subErr) {
      // Hoàn tác Main DB nếu cập nhật Sub DB thất bại
      await db.query(
        `UPDATE public.hosobenhan SET trang_thai = 'pending' WHERE ma_ho_so = $1`,
        [recordId]
      );
      throw subErr;
    }

    return {
      medical_record_id: Number(row.ma_ho_so),
      assigned_doctor_id: doctorId,
      status: 'in_progress',
    };
  }
}

module.exports = new Medrec07Service();

