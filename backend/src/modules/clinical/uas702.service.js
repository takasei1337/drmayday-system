'use strict';

const db = require('../../config/db');
const prisma = require('../../config/prisma');
const { createBusinessError } = require('../medical_records/medical_records.helper');

/**
 * Parse và validate điểm số UAS7 (ISS7 hoặc HSS7) trong khoảng 0..3.
 * @param {string|number} rawValue
 * @param {number} errorCode - Mã lỗi (5003 cho ISS7, 5004 cho HSS7)
 * @param {string} errorMessage
 * @returns {number}
 */
function parseUas7ComponentScore(rawValue, errorCode, errorMessage) {
  if (rawValue === undefined || rawValue === null || String(rawValue).trim() === '') {
    throw createBusinessError(errorMessage, errorCode, 400);
  }
  const strVal = String(rawValue).trim();
  if (!/^-?\d+$/.test(strVal)) {
    throw createBusinessError(errorMessage, errorCode, 400);
  }
  const num = Number.parseInt(strVal, 10);
  if (!Number.isInteger(num) || num < 0 || num > 3) {
    throw createBusinessError(errorMessage, errorCode, 400);
  }
  return num;
}

/**
 * Validate định dạng ngày YYYY-MM-DD và tính hợp lệ trên lịch.
 * @param {string} rawDate
 * @returns {string}
 */
function validateScoreDate(rawDate) {
  if (rawDate === undefined || rawDate === null || String(rawDate).trim() === '') {
    throw createBusinessError('Score date is required', 5005, 400);
  }
  const dateStr = String(rawDate).trim();
  if (!/^\d{4}-\d{2}-\d{2}$/.test(dateStr)) {
    throw createBusinessError('Invalid score_date format (expected YYYY-MM-DD)', 2003, 400);
  }
  const [y, m, d] = dateStr.split('-').map(Number);
  const dt = new Date(Date.UTC(y, m - 1, d));
  if (
    Number.isNaN(dt.getTime()) ||
    dt.getUTCFullYear() !== y ||
    dt.getUTCMonth() !== m - 1 ||
    dt.getUTCDate() !== d
  ) {
    throw createBusinessError('Invalid score_date calendar date', 2003, 400);
  }
  return dateStr;
}

class Uas702Service {
  /**
   * uas702: Bệnh nhân ghi nhận điểm số UAS7 hằng ngày (ISS7 + HSS7).
   * Lưu vào Main DB (public.nhatkyuashangngay) & Sub DB (public.uas7_notes).
   *
   * @param {object} body
   * @param {object} user - req.user từ JWT
   */
  async createUas7Score(body, user) {
    const patientId = Number.parseInt(user.ma_nguoi, 10);
    if (!Number.isInteger(patientId) || patientId <= 0) {
      throw createBusinessError('Patient account is invalid', 3101, 403);
    }

    const { medical_record_id, score_date, iss7, hss7, note } = body || {};

    // 1. Validate medical_record_id
    if (
      medical_record_id === undefined ||
      medical_record_id === null ||
      String(medical_record_id).trim() === ''
    ) {
      throw createBusinessError('Missing required parameter: medical_record_id', 2001, 400);
    }
    const medicalRecordId = Number.parseInt(String(medical_record_id).trim(), 10);
    if (!Number.isInteger(medicalRecordId) || medicalRecordId <= 0) {
      throw createBusinessError('Invalid medical_record_id', 2003, 400);
    }

    // 2. Validate score_date, iss7, hss7
    const scoreDate = validateScoreDate(score_date);
    const iss7Int = parseUas7ComponentScore(iss7, 5003, 'Invalid ISS7 value');
    const hss7Int = parseUas7ComponentScore(hss7, 5004, 'Invalid HSS7 value');
    const dailyScore = iss7Int + hss7Int;
    const noteText = note !== undefined && note !== null ? String(note) : null;

    // 3. Kiểm tra bệnh án tồn tại và thuộc bệnh nhân
    const recordRes = await db.query(
      'SELECT ma_ho_so, ma_benh_nhan, trang_thai FROM public.hosobenhan WHERE ma_ho_so = $1',
      [medicalRecordId]
    );
    if (recordRes.rows.length === 0) {
      throw createBusinessError('Medical record not found', 4001, 404);
    }
    const record = recordRes.rows[0];
    if (String(record.ma_benh_nhan) !== String(patientId)) {
      throw createBusinessError('Cannot submit score for another patient record', 3106, 403);
    }

    // 4. Thực thi transaction trên Main DB + ghi Sub DB
    const client = await db.pool.connect();
    try {
      await client.query('BEGIN');

      // Kiểm tra UNIQUE(ma_benh_nhan, ngay_cham_diem)
      const dupCheck = await client.query(
        `SELECT ma_nhat_ky_uas FROM public.nhatkyuashangngay
         WHERE ma_benh_nhan = $1 AND ngay_cham_diem = $2::date
         LIMIT 1`,
        [patientId, scoreDate]
      );
      if (dupCheck.rows.length > 0) {
        throw createBusinessError('Score for date already submitted', 5002, 409);
      }

      // Kiểm tra xem hồ sơ có bản ghi ở benhanmaydayman không để tránh lỗi FK
      const chronicCheck = await client.query(
        'SELECT 1 FROM public.benhanmaydayman WHERE ma_ho_so = $1 LIMIT 1',
        [medicalRecordId]
      );
      const maHoSoMan = chronicCheck.rows.length > 0 ? medicalRecordId : null;

      // INSERT vào Main DB (diem_uas_ngay là GENERATED ALWAYS AS diem_san_phu_hss + diem_ngua_iss)
      const insertMain = await client.query(
        `INSERT INTO public.nhatkyuashangngay (
           ma_benh_nhan,
           ma_ho_so_man,
           ngay_cham_diem,
           diem_san_phu_hss,
           diem_ngua_iss,
           trang_thai_ngay
         )
         VALUES ($1, $2, $3::date, $4, $5, 'HOP_LE')
         RETURNING ma_nhat_ky_uas, ma_benh_nhan, ngay_cham_diem,
                   diem_san_phu_hss, diem_ngua_iss, diem_uas_ngay, thoi_diem_cap_nhat`,
        [patientId, maHoSoMan, scoreDate, hss7Int, iss7Int]
      );

      const mainRow = insertMain.rows[0];
      const updatedAtIso = new Date(mainRow.thoi_diem_cap_nhat).toISOString();

      // INSERT vào Sub DB (uas7_notes) để lưu note & medical_record_id
      const subRows = await prisma.$queryRawUnsafe(
        `INSERT INTO public.uas7_notes (
           ma_benh_nhan, ma_ho_so_man, score_date, wheal_score, itch_score, uas_daily, notes
         )
         VALUES ($1::bigint, $2::bigint, $3, $4::int, $5::int, $6::int, $7)
         RETURNING created_at`,
        patientId,
        medicalRecordId,
        scoreDate,
        hss7Int,
        iss7Int,
        dailyScore,
        noteText
      );

      await client.query('COMMIT');

      const createdAtIso =
        subRows && subRows[0] && subRows[0].created_at
          ? new Date(subRows[0].created_at).toISOString()
          : updatedAtIso;

      return {
        patient_id: String(patientId),
        medical_record_id: String(medicalRecordId),
        score_date: scoreDate,
        iss7: String(iss7Int),
        hss7: String(hss7Int),
        daily_score: String(mainRow.diem_uas_ngay ?? dailyScore),
        note: noteText !== null ? noteText : '',
        created_at: createdAtIso,
        updated_at: updatedAtIso,
      };
    } catch (err) {
      await client.query('ROLLBACK').catch(() => {});
      if (err.code === '23505') {
        throw createBusinessError('Score for date already submitted', 5002, 409);
      }
      throw err;
    } finally {
      client.release();
    }
  }
}

module.exports = new Uas702Service();

