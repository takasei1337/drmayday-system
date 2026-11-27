const db = require('../../config/db');
const prisma = require('../../config/prisma');
const {
  createBusinessError,
  parsePositiveRecordId,
  assertRecordOwnership,
} = require('./medical_records.helper');

class Medrec08Service {
  /**
   * medrec08: Truy xuất toàn bộ câu trả lời chi tiết trong biểu mẫu khám của bệnh án
   * Căn cứ: Slide 5 (trang 44-46) & Sheet GET apimedical_recordsidanswers
   */
  async getMedicalRecordAnswers(idParam, user) {
    const recordId = parsePositiveRecordId(idParam);

    // 1. Kiểm tra bệnh án tồn tại trong Main DB
    const mainRes = await db.query(
      'SELECT ma_ho_so, ma_benh_nhan FROM public.hosobenhan WHERE ma_ho_so = $1 LIMIT 1',
      [recordId]
    );

    if (mainRes.rows.length === 0) {
      throw createBusinessError('Medical record not found', 4001, 404);
    }

    const row = mainRes.rows[0];
    assertRecordOwnership(row.ma_benh_nhan, user, 3106, "Cannot access another user's data");

    // 2. Truy xuất từ bảng medical_record_answers trên Sub DB Supabase
    const answerRows = await prisma.$queryRawUnsafe(
      `
      SELECT
        a.id,
        a.ma_ho_so,
        a.question_id,
        a.question_code,
        a.question_option_id,
        a.answer_value,
        a.answer_json,
        a.answered_by,
        a.created_at,
        a.updated_at,
        tq.question_text
      FROM public.medical_record_answers a
      LEFT JOIN public.template_questions tq ON a.question_id = tq.id
      WHERE a.ma_ho_so = $1
      ORDER BY a.id ASC
      `,
      BigInt(recordId)
    );

    return answerRows.map((ans) => ({
      id: Number(ans.id),
      medical_record_id: Number(ans.ma_ho_so),
      question_id: ans.question_code || String(ans.question_id),
      question_text: ans.question_text || null,
      question_option_id:
        ans.question_option_id !== null && ans.question_option_id !== undefined
          ? Number(ans.question_option_id)
          : null,
      answer_text: ans.answer_value !== null && ans.answer_value !== undefined ? ans.answer_value : null,
      answer_value: ans.answer_json !== null && ans.answer_json !== undefined ? ans.answer_json : null,
      answered_by:
        ans.answered_by !== null && ans.answered_by !== undefined ? Number(ans.answered_by) : null,
      created_at: ans.created_at ? new Date(ans.created_at).toISOString() : null,
      updated_at: ans.updated_at ? new Date(ans.updated_at).toISOString() : null,
    }));
  }
}

module.exports = new Medrec08Service();

