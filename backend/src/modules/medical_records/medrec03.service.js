const db = require('../../config/db');
const prisma = require('../../config/prisma');
const {
  createBusinessError,
  findPatientIdInMainDb,
  upsertMedicalRecordAnswers,
} = require('./medical_records.helper');

class Medrec03Service {
  /**
   * Kiểm tra và lấy thông tin Template từ Sub DB Supabase
   */
  async resolveTemplate(templateIdInput) {
    if (templateIdInput === undefined || templateIdInput === null) {
      throw createBusinessError('Template not found', 4101, 404);
    }

    const raw = String(templateIdInput).trim();
    if (!raw) {
      throw createBusinessError('Template not found', 4101, 404);
    }

    let template = await prisma.template.findFirst({
      where: {
        codeTemplate: raw,
        isActive: true,
      },
    });

    if (!template && /^\d+$/.test(raw)) {
      template = await prisma.template.findFirst({
        where: {
          id: parseInt(raw, 10),
          isActive: true,
        },
      });
    }

    if (!template) {
      throw createBusinessError('Template not found', 4101, 404);
    }

    return template;
  }

  /**
   * Xác định ma_benh_nhan hợp lệ trong bảng public.benhnhan (Main DB)
   * - Nếu là Bệnh nhân: tự lấy theo JWT user
   * - Nếu là Bác sĩ / Admin: bắt buộc truyền patient_id (hỗ trợ cả ma_benh_nhan hoặc ma_tai_khoan)
   */
  async resolvePatientId(bodyPatientId, user) {
    const role = (user?.vai_tro || '').toLowerCase().trim();
    const isPatient = role === 'benh_nhan' || role === 'patient';

    if (isPatient) {
      const maNguoi = parseInt(user.ma_nguoi, 10);
      if (!maNguoi) {
        throw createBusinessError('Patient not found', 4002, 404);
      }
      const res = await db.query(
        'SELECT ma_benh_nhan FROM public.benhnhan WHERE ma_benh_nhan = $1 LIMIT 1',
        [maNguoi]
      );
      if (res.rows.length === 0) {
        throw createBusinessError('Patient not found', 4002, 404);
      }
      return Number(res.rows[0].ma_benh_nhan);
    }

    if (bodyPatientId === undefined || bodyPatientId === null || String(bodyPatientId).trim() === '') {
      throw createBusinessError('Missing required parameter: patient_id', 2001, 400);
    }

    const parsedId = parseInt(bodyPatientId, 10);
    if (!parsedId || parsedId <= 0) {
      throw createBusinessError('Invalid parameter value: patient_id', 2003, 400);
    }

    return findPatientIdInMainDb(parsedId);
  }

  /**
   * Khởi tạo hồ sơ trong Main DB (hosobenhan + bảng subtype CAP/MAN)
   */
  async createMainMedicalRecord(maBenhNhan, loaiBenhAn) {
    const client = await db.pool.connect();
    try {
      await client.query('BEGIN');

      const insertHsQuery = `
        INSERT INTO public.hosobenhan (
          ma_benh_nhan, loai_benh_an, trang_thai, thoi_diem_kham_lan_dau
        )
        VALUES ($1, $2, 'pending', CURRENT_TIMESTAMP)
        RETURNING ma_ho_so, ma_benh_nhan, loai_benh_an, trang_thai, thoi_diem_kham_lan_dau
      `;
      const hsRes = await client.query(insertHsQuery, [maBenhNhan, loaiBenhAn]);
      const record = hsRes.rows[0];

      // Ràng buộc DEFERRABLE INITIALLY DEFERRED yêu cầu phải tạo bản ghi subtype tương ứng trước COMMIT
      const subtypeTable = loaiBenhAn === 'CAP' ? 'public.benhanmaydaycap' : 'public.benhanmaydayman';
      await client.query(`INSERT INTO ${subtypeTable} (ma_ho_so) VALUES ($1)`, [record.ma_ho_so]);

      await client.query('COMMIT');
      return record;
    } catch (err) {
      await client.query('ROLLBACK');
      throw err;
    } finally {
      client.release();
    }
  }

  /**
   * Hoàn tác bản ghi Main DB nếu ghi Sub DB gặp sự cố
   */
  async rollbackMainMedicalRecord(maHoSo, loaiBenhAn) {
    const client = await db.pool.connect();
    try {
      await client.query('BEGIN');
      const subtypeTable = loaiBenhAn === 'CAP' ? 'public.benhanmaydaycap' : 'public.benhanmaydayman';
      await client.query(`DELETE FROM ${subtypeTable} WHERE ma_ho_so = $1`, [maHoSo]);
      await client.query('DELETE FROM public.hosobenhan WHERE ma_ho_so = $1', [maHoSo]);
      await client.query('COMMIT');
    } catch (cleanupErr) {
      await client.query('ROLLBACK');
    } finally {
      client.release();
    }
  }

  /**
   * Lưu metadata & câu trả lời ban đầu vào Sub DB Supabase
   */
  async saveSubDbMetadataAndAnswers(maHoSo, maBenhNhan, template, createdBy, answers) {
    const recordSubtype = template.codeTemplate.replace(/^TMPL_/, '');

    await prisma.$executeRawUnsafe(
      `
      INSERT INTO public.medical_record_meta (
        ma_ho_so, ma_benh_nhan, template_id, record_subtype,
        assigned_doctor_id, created_by, updated_at
      )
      VALUES ($1, $2, $3, $4, NULL, $5, NOW())
      `,
      BigInt(maHoSo),
      BigInt(maBenhNhan),
      template.id,
      recordSubtype,
      createdBy ? BigInt(createdBy) : null
    );

    await upsertMedicalRecordAnswers(maHoSo, answers, createdBy);
  }

  /**
   * medrec03: Khởi tạo một hồ sơ bệnh án mới
   * Căn cứ: Slide 5 (trang 19-22) & Sheet POST apiv1medical_records
   */
  async createMedicalRecord(body, user) {
    const { patient_id, template_id, answers } = body || {};

    // 1. Validate template trước (nếu không tồn tại -> 4101 | Template not found)
    const template = await this.resolveTemplate(template_id);

    // 2. Xác định bệnh nhân & người tạo
    const maBenhNhan = await this.resolvePatientId(patient_id, user);
    const createdBy = user?.ma_tai_khoan ? Number(user.ma_tai_khoan) : Number(user?.ma_nguoi || maBenhNhan);

    // 3. Phân loại hồ sơ CAP / MAN theo code_template
    const loaiBenhAn = template.codeTemplate.toUpperCase().includes('ACUTE') ? 'CAP' : 'MAN';

    // 4. Tạo bản ghi trong Main DB
    const mainRecord = await this.createMainMedicalRecord(maBenhNhan, loaiBenhAn);

    // 5. Ghi metadata & answers vào Sub DB Supabase (rollback Main DB nếu lỗi)
    try {
      await this.saveSubDbMetadataAndAnswers(
        mainRecord.ma_ho_so,
        maBenhNhan,
        template,
        createdBy,
        answers
      );
    } catch (subErr) {
      await this.rollbackMainMedicalRecord(mainRecord.ma_ho_so, loaiBenhAn);
      throw subErr;
    }

    return {
      medical_record_id: Number(mainRecord.ma_ho_so),
      patient_id: Number(maBenhNhan),
      assigned_doctor_id: null,
      created_by: createdBy,
      template_id: template.codeTemplate,
      status: mainRecord.trang_thai,
      instructions: null,
      created_at: mainRecord.thoi_diem_kham_lan_dau
        ? new Date(mainRecord.thoi_diem_kham_lan_dau).toISOString()
        : new Date().toISOString(),
    };
  }
}

module.exports = new Medrec03Service();

