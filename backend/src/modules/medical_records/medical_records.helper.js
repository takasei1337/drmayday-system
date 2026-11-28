const db = require('../../config/db');
const prisma = require('../../config/prisma');

const VALID_RECORD_STATUSES = ['draft', 'pending', 'in_progress', 'completed', 'cancelled'];

/**
 * Tạo đối tượng lỗi nghiệp vụ có mã code chuẩn theo bảng 3. response code
 */
function createBusinessError(message, code, statusCode = 400) {
  const err = new Error(message);
  err.code = code;
  err.statusCode = statusCode;
  return err;
}

/**
 * Parse và kiểm tra ID hồ sơ bệnh án hợp lệ.
 * Trả lỗi 2003 (1004 - Parameter value is invalid) nếu không phải số nguyên dương hoặc vượt quá giới hạn INT4.
 */
function parsePositiveRecordId(idParam) {
  const rawId = idParam !== undefined && idParam !== null ? String(idParam).trim() : '';
  if (!/^\d+$/.test(rawId)) {
    throw createBusinessError('Invalid parameter value: id', 2003, 400);
  }
  try {
    const bigVal = BigInt(rawId);
    if (bigVal <= 0n || bigVal > 2147483647n) {
      throw createBusinessError('Invalid parameter value: id', 2003, 400);
    }
    return Number(bigVal);
  } catch (err) {
    if (err.code) throw err;
    throw createBusinessError('Invalid parameter value: id', 2003, 400);
  }
}

/**
 * Kiểm tra quyền sở hữu hồ sơ khi người dùng hiện tại có vai trò Bệnh nhân
 */
function assertRecordOwnership(
  maBenhNhan,
  user,
  errorCode = 3102,
  errorMessage = 'Quyền truy cập bị từ chối. Bạn không sở hữu bệnh án này.'
) {
  const role = (user?.vai_tro || '').toLowerCase().trim();
  if ((role === 'benh_nhan' || role === 'patient') && Number(maBenhNhan) !== Number(user?.ma_nguoi)) {
    throw createBusinessError(errorMessage, errorCode, 403);
  }
}

/**
 * Tìm ma_benh_nhan trong Main DB theo ma_benh_nhan hoặc ma_tai_khoan
 */
async function findPatientIdInMainDb(parsedId) {
  const res = await db.query(
    `
    SELECT bn.ma_benh_nhan
    FROM public.benhnhan bn
    LEFT JOIN public.taikhoan tk ON bn.ma_benh_nhan = tk.ma_nguoi
    WHERE bn.ma_benh_nhan = $1 OR tk.ma_tai_khoan = $1
    ORDER BY CASE WHEN bn.ma_benh_nhan = $1 THEN 0 ELSE 1 END
    LIMIT 1
    `,
    [parsedId]
  );

  if (res.rows.length === 0) {
    throw createBusinessError('Patient not found', 4002, 404);
  }
  return Number(res.rows[0].ma_benh_nhan);
}

/**
 * Trích xuất thời điểm tạo hồ sơ theo thứ tự ưu tiên từ Main DB & Sub DB
 */
function extractCreatedAt(row, meta) {
  const raw =
    row.thoi_diem_kham_lan_dau ||
    row.ngay_bat_dau_dieu_tri_ngoai_tru ||
    (meta && meta.updated_at) ||
    null;
  return raw ? new Date(raw).toISOString() : null;
}

/**
 * Trích xuất chỉ dẫn / kết luận của bác sĩ từ Sub DB hoặc Main DB
 */
function extractInstructions(row, meta) {
  return (
    (meta && (meta.doctor_conclusion || meta.doctor_notes)) ||
    row.chan_doan_ban_dau_phong_kham ||
    null
  );
}

/**
 * Suy ra mã code_template mặc định từ loai_benh_an khi hồ sơ cũ chưa có metadata trên Sub DB
 */
function resolveFallbackTemplate(loaiBenhAn) {
  return loaiBenhAn === 'CAP' ? 'TMPL_URTICARIA_ACUTE' : 'TMPL_URTICARIA_CHRONIC_INIT';
}

/**
 * Truy vấn metadata từ Sub DB Supabase (medical_record_meta JOIN templates) theo danh sách ma_ho_so
 */
async function fetchMetaMapByRecordIds(maHoSoList) {
  if (!Array.isArray(maHoSoList) || maHoSoList.length === 0) {
    return {};
  }

  const ids = maHoSoList.map((id) => BigInt(id));
  const metaRows = await prisma.$queryRawUnsafe(
    `
    SELECT
      m.ma_ho_so,
      m.assigned_doctor_id,
      m.created_by,
      m.doctor_conclusion,
      m.doctor_notes,
      m.completed_at,
      m.updated_at,
      t.code_template
    FROM public.medical_record_meta m
    LEFT JOIN public.templates t ON m.template_id = t.id
    WHERE m.ma_ho_so = ANY($1::bigint[])
    `,
    ids
  );

  const metaMap = {};
  for (const m of metaRows) {
    metaMap[String(m.ma_ho_so)] = m;
  }
  return metaMap;
}

/**
 * Chuyển mã câu hỏi dạng chuỗi sang số nguyên dương 31-bit khi cần lưu cột integer question_id
 */
function hashQuestionCode(code) {
  let hash = 0;
  for (let i = 0; i < code.length; i++) {
    hash = (hash * 31 + code.charCodeAt(i)) & 0x7fffffff;
  }
  return hash || 1;
}

/**
 * Upsert danh sách câu trả lời vào bảng public.medical_record_answers theo UNIQUE(ma_ho_so, question_id)
 */
async function upsertMedicalRecordAnswers(maHoSo, answers, answeredBy) {
  if (!Array.isArray(answers) || answers.length === 0) {
    return 0;
  }

  let upsertedCount = 0;
  for (const item of answers) {
    if (!item || item.question_id === undefined || item.question_id === null) {
      continue;
    }
    const rawQId = String(item.question_id).trim();
    if (!rawQId) continue;

    const isNumericId = /^\d+$/.test(rawQId);
    const questionIdInt = isNumericId ? parseInt(rawQId, 10) : hashQuestionCode(rawQId);
    const questionCode = isNumericId ? null : rawQId;
    const optionId =
      item.question_option_id !== undefined && item.question_option_id !== null
        ? parseInt(item.question_option_id, 10) || null
        : null;
    const answerValue =
      item.answer_text !== undefined && item.answer_text !== null ? String(item.answer_text) : null;
    const answerJson =
      item.answer_value !== undefined && item.answer_value !== null
        ? JSON.stringify(item.answer_value)
        : null;

    await prisma.$executeRawUnsafe(
      `
      INSERT INTO public.medical_record_answers (
        ma_ho_so, question_id, answer_value, answer_json,
        answered_by, updated_at, created_at, question_code, question_option_id
      )
      VALUES ($1, $2, $3, $4::jsonb, $5, NOW(), NOW(), $6, $7)
      ON CONFLICT (ma_ho_so, question_id)
      DO UPDATE SET
        answer_value = EXCLUDED.answer_value,
        answer_json = EXCLUDED.answer_json,
        answered_by = EXCLUDED.answered_by,
        question_code = EXCLUDED.question_code,
        question_option_id = EXCLUDED.question_option_id,
        updated_at = NOW()
      `,
      BigInt(maHoSo),
      questionIdInt,
      answerValue,
      answerJson,
      answeredBy ? BigInt(answeredBy) : null,
      questionCode,
      optionId
    );
    upsertedCount++;
  }

  return upsertedCount;
}

module.exports = {
  VALID_RECORD_STATUSES,
  createBusinessError,
  parsePositiveRecordId,
  assertRecordOwnership,
  findPatientIdInMainDb,
  extractCreatedAt,
  extractInstructions,
  resolveFallbackTemplate,
  fetchMetaMapByRecordIds,
  upsertMedicalRecordAnswers,
};
