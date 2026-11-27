'use strict';

const db = require('../../config/db');
const prisma = require('../../config/prisma');
const { createBusinessError } = require('../medical_records/medical_records.helper');

/**
 * Chuẩn hóa giá trị DATE từ pg driver (Date object hoặc string) về "YYYY-MM-DD".
 * @param {Date|string} rawDate
 * @returns {string}
 */
function formatDateOnly(rawDate) {
  if (!rawDate) return '';
  if (rawDate instanceof Date) {
    const y = rawDate.getFullYear();
    const m = String(rawDate.getMonth() + 1).padStart(2, '0');
    const d = String(rawDate.getDate()).padStart(2, '0');
    return `${y}-${m}-${d}`;
  }
  return String(rawDate).slice(0, 10);
}

class Uas704Service {
  /**
   * uas704: Truy xuất toàn bộ lịch sử điểm UAS7 của 1 bệnh nhân cụ thể.
   * Sắp xếp theo score_date giảm dần (mới nhất trước).
   *
   * @param {string} patientIdParam - req.params.patient_id
   * @param {object} user - req.user từ JWT
   * @returns {Promise<Array<object>>}
   */
  async getPatientUas7History(patientIdParam, user) {
    const rawId =
      patientIdParam !== undefined && patientIdParam !== null ? String(patientIdParam).trim() : '';
    if (!/^\d+$/.test(rawId) || Number.parseInt(rawId, 10) <= 0) {
      throw createBusinessError('Invalid parameter value: patient_id', 2003, 400);
    }

    const targetId = Number.parseInt(rawId, 10);
    const role = (user?.vai_tro || '').toLowerCase().trim();
    const isPatient = role === 'benh_nhan' || role === 'patient';

    let maBenhNhan = targetId;
    if (isPatient) {
      const isSelf =
        targetId === Number(user?.ma_nguoi) || targetId === Number(user?.ma_tai_khoan);
      if (!isSelf) {
        throw createBusinessError("Cannot access another user's data", 3106, 403);
      }
      maBenhNhan = Number(user?.ma_nguoi);
    }

    // Kiểm tra bệnh nhân tồn tại trong Main DB
    const patientCheck = await db.query(
      'SELECT ma_benh_nhan FROM public.benhnhan WHERE ma_benh_nhan = $1 LIMIT 1',
      [maBenhNhan]
    );
    if (patientCheck.rows.length === 0) {
      throw createBusinessError('User not found', 3007, 404);
    }

    // Truy vấn lịch sử điểm từ Main DB (sắp xếp score_date giảm dần)
    const [mainRes, subRows] = await Promise.all([
      db.query(
        `SELECT
           ma_nhat_ky_uas,
           ma_benh_nhan,
           ma_ho_so_man,
           ngay_cham_diem,
           diem_san_phu_hss,
           diem_ngua_iss,
           diem_uas_ngay
         FROM public.nhatkyuashangngay
         WHERE ma_benh_nhan = $1
         ORDER BY ngay_cham_diem DESC, ma_nhat_ky_uas DESC`,
        [maBenhNhan]
      ),
      prisma.$queryRawUnsafe(
        `SELECT score_date, ma_ho_so_man, notes
         FROM public.uas7_notes
         WHERE ma_benh_nhan = $1::bigint
         ORDER BY id DESC`,
        maBenhNhan
      ),
    ]);

    // Map metadata (note, medical_record_id) từ Sub DB theo score_date
    const subMap = new Map();
    for (const row of subRows || []) {
      const key = String(row.score_date || '').slice(0, 10);
      if (key && !subMap.has(key)) {
        subMap.set(key, row);
      }
    }

    return mainRes.rows.map((row) => {
      const scoreDate = formatDateOnly(row.ngay_cham_diem);
      const sub = subMap.get(scoreDate);
      const medicalRecordId =
        sub?.ma_ho_so_man !== undefined && sub?.ma_ho_so_man !== null
          ? String(sub.ma_ho_so_man)
          : row.ma_ho_so_man !== null && row.ma_ho_so_man !== undefined
            ? String(row.ma_ho_so_man)
            : '';

      const iss7 = Number(row.diem_ngua_iss || 0);
      const hss7 = Number(row.diem_san_phu_hss || 0);
      const dailyScore =
        row.diem_uas_ngay !== null && row.diem_uas_ngay !== undefined
          ? Number(row.diem_uas_ngay)
          : iss7 + hss7;

      return {
        patient_id: String(row.ma_benh_nhan),
        medical_record_id: medicalRecordId,
        score_date: scoreDate,
        iss7: String(iss7),
        hss7: String(hss7),
        daily_score: String(dailyScore),
        note: sub?.notes !== undefined && sub?.notes !== null ? String(sub.notes) : '',
      };
    });
  }
}

module.exports = new Uas704Service();

