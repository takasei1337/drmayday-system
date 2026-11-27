const db = require('../../config/db');
const prisma = require('../../config/prisma');
const {
  createBusinessError,
  parsePositiveRecordId,
  assertRecordOwnership,
  upsertMedicalRecordAnswers,
} = require('./medical_records.helper');

const STAFF_ROLES = ['admin', 'bac_si', 'dieu_duong', 'le_tan'];

class Medrec10Service {
  /**
   * medrec10: Bệnh nhân (trước khi khám) hoặc Bác sĩ (đang khám) cập nhật lại câu trả lời
   * Đảm bảo UNIQUE(medical_record_id, question_id) bằng Upsert
   * Căn cứ: Slide 5 (trang 47-49) & Sheet PUT apimedical_recordsidanswers
   */
  async updateMedicalRecordAnswers(idParam, body, user) {
    const recordId = parsePositiveRecordId(idParam);
    const actorId = Number(user?.ma_tai_khoan || user?.ma_nguoi);
    const role = (user?.vai_tro || '').toLowerCase().trim();

    if (!actorId) {
      throw createBusinessError('User not authenticated', 3003, 401);
    }

    // 1. Kiểm tra bệnh án tồn tại trong Main DB
    const mainRes = await db.query(
      'SELECT ma_ho_so, ma_benh_nhan, trang_thai FROM public.hosobenhan WHERE ma_ho_so = $1 LIMIT 1',
      [recordId]
    );

    if (mainRes.rows.length === 0) {
      throw createBusinessError('Medical record not found', 4001, 404);
    }

    const row = mainRes.rows[0];

    // 2. Test Case 2: Bệnh án đã đóng (completed) -> 4003
    if (row.trang_thai === 'completed') {
      throw createBusinessError('Medical record already completed', 4003, 400);
    }

    if (row.trang_thai === 'cancelled') {
      throw createBusinessError('Invalid medical record status', 4009, 400);
    }

    // 3. Phân quyền: Bệnh nhân chỉ sửa hồ sơ của mình khi chưa vào khám (draft/pending)
    const isPatient = role === 'benh_nhan' || role === 'patient';
    if (isPatient) {
      assertRecordOwnership(row.ma_benh_nhan, user, 3106, "Cannot access another user's data");
      if (row.trang_thai === 'in_progress') {
        throw createBusinessError('Permission denied', 3101, 403);
      }
    } else if (!STAFF_ROLES.includes(role)) {
      throw createBusinessError('Permission denied', 3101, 403);
    }

    // 4. Validate danh sách answers
    const { answers } = body || {};
    if (!Array.isArray(answers) || answers.length === 0) {
      throw createBusinessError('Answers list cannot be empty', 4007, 400);
    }

    const upsertedCount = await upsertMedicalRecordAnswers(recordId, answers, actorId);
    if (upsertedCount === 0) {
      throw createBusinessError('Answers list cannot be empty', 4007, 400);
    }

    await prisma.$executeRawUnsafe(
      'UPDATE public.medical_record_meta SET updated_at = NOW() WHERE ma_ho_so = $1',
      BigInt(recordId)
    );

    return {
      count: upsertedCount,
    };
  }
}

module.exports = new Medrec10Service();

