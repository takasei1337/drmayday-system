const db = require('../../config/db');
const prisma = require('../../config/prisma');
const { createBusinessError, parsePositiveRecordId } = require('./medical_records.helper');

class Medrec14Service {
  /**
   * medrec14: Xóa toàn bộ hồ sơ bệnh án (Dành riêng cho Admin)
   * Xóa hồ sơ + subtype trên Main DB, dọn sạch answers + metadata trên Sub DB, giữ nguyên file đính kèm
   * Căn cứ: Slide 5 (trang 50-52) & Sheet DELETE apimedical_recordsid
   */
  async deleteMedicalRecord(idParam) {
    const recordId = parsePositiveRecordId(idParam);

    const client = await db.pool.connect();
    try {
      await client.query('BEGIN');

      const findRes = await client.query(
        'SELECT ma_ho_so, loai_benh_an FROM public.hosobenhan WHERE ma_ho_so = $1 LIMIT 1',
        [recordId]
      );

      if (findRes.rows.length === 0) {
        await client.query('ROLLBACK');
        throw createBusinessError('Medical record not found', 4001, 404);
      }

      const { loai_benh_an } = findRes.rows[0];
      const subtypeTable =
        loai_benh_an === 'CAP' ? 'public.benhanmaydaycap' : 'public.benhanmaydayman';

      await client.query(`DELETE FROM ${subtypeTable} WHERE ma_ho_so = $1`, [recordId]);
      await client.query('DELETE FROM public.hosobenhan WHERE ma_ho_so = $1', [recordId]);

      await client.query('COMMIT');
    } catch (err) {
      try {
        await client.query('ROLLBACK');
      } catch (rollbackErr) {
        // Bỏ qua nếu transaction đã kết thúc
      }
      if (err.code === '23503') {
        throw createBusinessError(
          'Không thể xóa bệnh án vì đã phát sinh phiên khám, đơn thuốc hoặc dữ liệu ràng buộc liên quan',
          4004,
          409
        );
      }
      throw err;
    } finally {
      client.release();
    }

    // Dọn sạch câu trả lời và metadata trên Sub DB Supabase (giữ nguyên tệp đính kèm trên Storage)
    await prisma.$executeRawUnsafe(
      'DELETE FROM public.answer_images WHERE ma_ho_so = $1',
      BigInt(recordId)
    );
    await prisma.$executeRawUnsafe(
      'DELETE FROM public.medical_record_answers WHERE ma_ho_so = $1',
      BigInt(recordId)
    );
    await prisma.$executeRawUnsafe(
      'DELETE FROM public.medical_record_meta WHERE ma_ho_so = $1',
      BigInt(recordId)
    );

    return {};
  }
}

module.exports = new Medrec14Service();

