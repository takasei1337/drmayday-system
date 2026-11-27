const crypto = require('crypto');
const path = require('path');
const db = require('../../config/db');
const prisma = require('../../config/prisma');
const { supabase, bucketName, isConfigured } = require('../../config/supabase');
const patientService = require('./patient.service');
const templateSeed = require('./templateSeed.service');
const {
  createAppError,
  isStaffRole,
  resolvePatientIdForUser,
} = require('./patient.helpers');

/**
 * Service hợp nhất toàn bộ quy trình Bệnh nhân (Slides 1, 2, 5, 6, 7, 8, 9, 11):
 * - Sàng lọc báo động đỏ (sanglocbaodongdo)
 * - Hồ sơ bệnh án động + Q&A + Vòng đời (hosobenhan + Sub DB)
 * - Cận lâm sàng & Đơn thuốc (ketquacanlamsang, donthuoc, chitietdonthuoc)
 * - Theo dõi UAS7 & AAS (chukytheodoiuas7, nhatkyuashangngay, nhatkyaashangngay + Sub DB)
 * - Đợt & Vị trí tổn thương + Ảnh + Upload Supabase Storage mayday-attachments
 */
class PatientFlowService {
  // ============================================================================
  // 1. SÀNG LỌC BÁO ĐỘNG ĐỎ (Red Flag Screening)
  // ============================================================================
  async submitRedFlagScreening(user, data = {}) {
    let maBenhNhan = data.ma_benh_nhan || data.patient_id || null;
    if (!isStaffRole(user)) {
      maBenhNhan = await resolvePatientIdForUser(db, user);
    } else if (maBenhNhan) {
      maBenhNhan = parseInt(maBenhNhan, 10);
    }

    const khoTho = Boolean(
      data.co_kho_tho_kho_khe_nghen_hong ?? data.difficulty_breathing ?? data.shortness_of_breath ?? false
    );
    const chongMat = Boolean(
      data.co_chong_mat_tuc_nguc_sap_ngat ?? data.dizziness_fainting ?? data.chest_tightness ?? false
    );
    const sungMoi = Boolean(
      data.co_sung_moi_luoi_co_hong ?? data.swelling_lips_tongue_throat ?? data.angioedema_airway ?? false
    );
    const dauBung = Boolean(
      data.co_dau_bung_non_lien_tuc ?? data.severe_abdominal_pain_vomiting ?? false
    );

    const hasRisk = khoTho || chongMat || sungMoi || dauBung;

    // Tuân thủ ck_sanglocbaodongdo_xac_nhan & ck_sanglocbaodongdo_goi_cap_cuu
    const wantCall = hasRisk
      ? Boolean(data.xac_nhan_muon_goi_cap_cuu ?? data.confirm_emergency_call ?? data.called_emergency ?? false)
      : null;
    const pressedCallBtn = hasRisk && wantCall === true && Boolean(data.da_nhan_nut_goi_cap_cuu ?? data.pressed_call_button ?? false);
    const emergencyPhone = pressedCallBtn
      ? String(data.so_dien_thoai_cap_cuu || data.emergency_phone || '115').trim()
      : null;
    const pressedAt = pressedCallBtn ? new Date() : null;

    const query = `
      INSERT INTO public.sanglocbaodongdo (
        ma_benh_nhan,
        phien_ban_bo_cau_hoi,
        co_kho_tho_kho_khe_nghen_hong,
        co_chong_mat_tuc_nguc_sap_ngat,
        co_sung_moi_luoi_co_hong,
        co_dau_bung_non_lien_tuc,
        xac_nhan_muon_goi_cap_cuu,
        da_nhan_nut_goi_cap_cuu,
        so_dien_thoai_cap_cuu,
        thoi_diem_nhan_nut_goi
      )
      VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10)
      RETURNING *
    `;
    const res = await db.query(query, [
      maBenhNhan,
      String(data.phien_ban_bo_cau_hoi || 'APP_GD1_V1'),
      khoTho,
      chongMat,
      sungMoi,
      dauBung,
      wantCall,
      pressedCallBtn,
      emergencyPhone,
      pressedAt,
    ]);

    const row = res.rows[0];
    return {
      ...row,
      ma_luot_sang_loc: Number(row.ma_luot_sang_loc),
      ma_benh_nhan: row.ma_benh_nhan ? Number(row.ma_benh_nhan) : null,
      id: Number(row.ma_luot_sang_loc),
      has_red_flag: row.co_nguy_co_phan_ve,
      recommendation: row.co_nguy_co_phan_ve
        ? 'CẢNH BÁO ĐỎ: Có dấu hiệu nghi ngờ phản vệ/phù thanh quản. Cần gọi cấp cứu 115 hoặc tới cơ sở y tế gần nhất ngay!'
        : 'An toàn: Không ghi nhận dấu hiệu báo động đỏ. Có thể tiếp tục phân loại & lập hồ sơ bệnh án.',
    };
  }

  async getRedFlagScreenings(user, queryParams = {}) {
    let targetPatientId = queryParams.patient_id || queryParams.ma_benh_nhan || null;
    if (!isStaffRole(user)) {
      targetPatientId = await resolvePatientIdForUser(db, user);
    }

    const params = [];
    let where = '';
    if (targetPatientId) {
      params.push(parseInt(targetPatientId, 10));
      where = 'WHERE s.ma_benh_nhan = $1';
    }

    const res = await db.query(
      `SELECT s.*, ng.ho_ten AS ten_benh_nhan
       FROM public.sanglocbaodongdo s
       LEFT JOIN public.nguoi ng ON s.ma_benh_nhan = ng.ma_nguoi
       ${where}
       ORDER BY s.ma_luot_sang_loc DESC
       LIMIT 100`,
      params
    );
    return res.rows.map((r) => ({
      ...r,
      ma_luot_sang_loc: Number(r.ma_luot_sang_loc),
      ma_benh_nhan: r.ma_benh_nhan ? Number(r.ma_benh_nhan) : null,
    }));
  }

  async getRedFlagScreeningById(user, screeningId) {
    const id = parseInt(screeningId, 10);
    const res = await db.query(
      'SELECT * FROM public.sanglocbaodongdo WHERE ma_luot_sang_loc = $1 LIMIT 1',
      [id]
    );
    const row = res.rows[0];
    if (!row) throw createAppError(`Không tìm thấy lượt sàng lọc #${id}`, 9992, 404);
    if (!isStaffRole(user) && row.ma_benh_nhan) {
      await patientService.assertPatientAccess(user, row.ma_benh_nhan);
    }
    return {
      ...row,
      ma_luot_sang_loc: Number(row.ma_luot_sang_loc),
      ma_benh_nhan: row.ma_benh_nhan ? Number(row.ma_benh_nhan) : null,
    };
  }

  // ============================================================================
  // 2. HỒ SƠ BỆNH ÁN MỞ RỘNG (medrec01 -> medrec14)
  // ============================================================================
  getClassifyQuestions() {
    return [
      {
        question_id: 'Q_DURATION_WEEKS',
        question_text: 'Triệu chứng mày đay kéo dài bao lâu?',
        type_question: 'radio',
        options: [
          { id: 1, option_text: 'Dưới 6 tuần (Mày đay cấp tính)', option_value: 'LT_6_WEEKS' },
          { id: 2, option_text: 'Từ 6 tuần trở lên (Mày đay mạn tính)', option_value: 'GE_6_WEEKS' },
          { id: 3, option_text: 'Tái khám theo hẹn', option_value: 'FOLLOWUP' },
        ],
      },
    ];
  }

  async classifyMedicalRecord(data = {}) {
    let isFollowup = Boolean(data.is_followup || data.tai_kham || data.has_previous_record);
    let weeks =
      data.duration_weeks !== undefined
        ? Number(data.duration_weeks)
        : data.thoi_gian_khoi_phat_tuan !== undefined
        ? Number(data.thoi_gian_khoi_phat_tuan)
        : data.duration_days !== undefined
        ? Number(data.duration_days) / 7
        : 0;

    if (Array.isArray(data.answers)) {
      for (const ans of data.answers) {
        const val = String(ans.option_value || ans.answer_value || ans.value || '').toUpperCase();
        if (val === 'GE_6_WEEKS' || val === 'CHRONIC' || val === 'MAN') weeks = 6;
        else if (val === 'LT_6_WEEKS' || val === 'ACUTE' || val === 'CAP') weeks = 2;
        else if (val === 'FOLLOWUP' || val === 'TAI_KHAM') isFollowup = true;
      }
    }

    let code = 'TMPL_URTICARIA_ACUTE';
    let label = 'Mẫu bệnh án Mày đay Cấp tính';

    if (isFollowup) {
      code = 'TMPL_URTICARIA_FOLLOWUP';
      label = 'Mẫu phiếu Tái khám Mày đay';
    } else if (weeks >= 6) {
      code = 'TMPL_URTICARIA_CHRONIC_INIT';
      label = 'Mẫu bệnh án Mày đay Mạn tính - Khám lần đầu';
    }

    const template = await templateSeed.getTemplateByIdOrCode(code);
    return {
      template_id: template?.codeTemplate || code,
      template_name: template?.title || label,
    };
  }

  async _resolveTemplateCode(row, meta) {
    if (meta?.templateId) {
      const t = await prisma.template.findUnique({ where: { id: meta.templateId }, select: { codeTemplate: true } }).catch(() => null);
      if (t?.codeTemplate) return t.codeTemplate;
    }
    return row.loai_benh_an === 'CAP' ? 'TMPL_URTICARIA_ACUTE' : 'TMPL_URTICARIA_CHRONIC_INIT';
  }

  async _getRecordOrThrow(recordId, user = null) {
    const rid = parseInt(recordId, 10);
    if (Number.isNaN(rid) || rid <= 0) {
      throw createAppError('Mã hồ sơ bệnh án không hợp lệ', 1004, 400);
    }
    const res = await db.query(
      `SELECT hs.*, ng.ho_ten, ng.so_dien_thoai, ng.gioi_tinh, ng.ngay_sinh
       FROM public.hosobenhan hs
       LEFT JOIN public.nguoi ng ON hs.ma_benh_nhan = ng.ma_nguoi
       WHERE hs.ma_ho_so = $1
       LIMIT 1`,
      [rid]
    );
    const row = res.rows[0];
    if (!row) {
      throw createAppError(`Không tìm thấy hồ sơ bệnh án #${rid}`, 9992, 404);
    }
    if (user && !isStaffRole(user)) {
      await patientService.assertPatientAccess(user, row.ma_benh_nhan);
    }
    return row;
  }

  async createMedicalRecord(user, data = {}) {
    let pid = data.ma_benh_nhan || data.patient_id;
    if (!isStaffRole(user)) {
      pid = await resolvePatientIdForUser(db, user);
    }
    if (!pid) {
      throw createAppError('Không xác định được mã bệnh nhân cho hồ sơ mới', 1002, 400);
    }
    await patientService.assertPatientAccess(user, pid);

    const payload = { ...data, ma_benh_nhan: pid };
    if (payload.template_id) {
      const tmpl = await templateSeed.getTemplateByIdOrCode(payload.template_id);
      if (tmpl) {
        payload.template_id = tmpl.id;
        if (!payload.loai_benh_an) {
          payload.loai_benh_an = tmpl.codeTemplate.includes('ACUTE') ? 'CAP' : 'MAN';
        }
        if (!payload.record_subtype) {
          payload.record_subtype = tmpl.codeTemplate.replace(/^TMPL_/, '');
        }
      }
    } else if (!payload.loai_benh_an && (payload.duration_weeks !== undefined || payload.type || payload.record_subtype)) {
      const classified = await this.classifyMedicalRecord(payload);
      const tmpl = await templateSeed.getTemplateByIdOrCode(classified.template_id);
      payload.loai_benh_an = classified.template_id.includes('ACUTE') ? 'CAP' : 'MAN';
      payload.record_subtype = classified.template_id.replace(/^TMPL_/, '');
      payload.template_id = tmpl?.id || (payload.loai_benh_an === 'CAP' ? 1 : 2);
    }

    const created = await patientService.createHoSoBenhAn(payload, user);
    const rid = Number(created.ma_ho_so);

    await prisma.medicalRecordMeta.upsert({
      where: { maHoSo: BigInt(rid) },
      create: {
        maHoSo: BigInt(rid),
        maBenhNhan: BigInt(pid),
        templateId: typeof payload.template_id === 'number' ? payload.template_id : null,
        recordSubtype: payload.record_subtype || null,
        createdBy: user?.ma_tai_khoan ? BigInt(user.ma_tai_khoan) : null,
      },
      update: {
        templateId: typeof payload.template_id === 'number' ? payload.template_id : undefined,
        createdBy: user?.ma_tai_khoan ? BigInt(user.ma_tai_khoan) : undefined,
      },
    }).catch(() => null);

    if (Array.isArray(data.answers) && data.answers.length > 0) {
      await this.upsertRecordAnswers(user, rid, data.answers, false);
    }

    const row = await this._getRecordOrThrow(rid, user);
    const meta = await prisma.medicalRecordMeta.findUnique({ where: { maHoSo: BigInt(rid) } }).catch(() => null);
    const templateCode = await this._resolveTemplateCode(row, meta);
    const createdAt = row.thoi_diem_kham_lan_dau ? new Date(row.thoi_diem_kham_lan_dau).toISOString() : new Date().toISOString();

    return {
      medical_record_id: rid,
      patient_id: Number(row.ma_benh_nhan),
      assigned_doctor_id: meta?.assignedDoctorId ? Number(meta.assignedDoctorId) : null,
      created_by: meta?.createdBy ? Number(meta.createdBy) : user?.ma_tai_khoan ? Number(user.ma_tai_khoan) : Number(row.ma_benh_nhan),
      template_id: templateCode,
      status: row.trang_thai,
      instructions: meta?.doctorConclusion || null,
      created_at: createdAt,
    };
  }

  async listMedicalRecords(user, queryParams = {}) {
    const conditions = [];
    const params = [];

    if (!isStaffRole(user)) {
      const myPid = await resolvePatientIdForUser(db, user);
      if (!myPid) return [];
      params.push(myPid);
      conditions.push(`hs.ma_benh_nhan = $${params.length}`);
    } else if (queryParams.patient_id || queryParams.ma_benh_nhan) {
      params.push(parseInt(queryParams.patient_id || queryParams.ma_benh_nhan, 10));
      conditions.push(`hs.ma_benh_nhan = $${params.length}`);
    }

    if (queryParams.status || queryParams.trang_thai) {
      params.push(String(queryParams.status || queryParams.trang_thai).trim());
      conditions.push(`hs.trang_thai = $${params.length}`);
    }
    if (queryParams.loai_benh_an || queryParams.type) {
      params.push(String(queryParams.loai_benh_an || queryParams.type).trim().toUpperCase());
      conditions.push(`hs.loai_benh_an = $${params.length}`);
    }

    const whereSql = conditions.length > 0 ? `WHERE ${conditions.join(' AND ')}` : '';
    const page = Math.max(1, parseInt(queryParams.page || 1, 10) || 1);
    const limit = Math.min(Math.max(parseInt(queryParams.limit, 10) || 50, 1), 200);
    const offset = (page - 1) * limit;
    params.push(limit, offset);

    const res = await db.query(
      `SELECT hs.*
       FROM public.hosobenhan hs
       ${whereSql}
       ORDER BY hs.ma_ho_so DESC
       LIMIT $${params.length - 1} OFFSET $${params.length}`,
      params
    );

    const ids = res.rows.map((r) => BigInt(r.ma_ho_so));
    let metaMap = new Map();
    if (ids.length > 0) {
      try {
        const metas = await prisma.medicalRecordMeta.findMany({
          where: { maHoSo: { in: ids } },
        });
        metaMap = new Map(metas.map((m) => [Number(m.maHoSo), m]));
      } catch {}
    }

    const templates = await prisma.template.findMany({ select: { id: true, codeTemplate: true } }).catch(() => []);
    const tmplMap = new Map(templates.map((t) => [t.id, t.codeTemplate]));

    return res.rows.map((r) => {
      const m = metaMap.get(Number(r.ma_ho_so));
      const tCode = (m?.templateId && tmplMap.get(m.templateId)) || (r.loai_benh_an === 'CAP' ? 'TMPL_URTICARIA_ACUTE' : 'TMPL_URTICARIA_CHRONIC_INIT');
      return {
        medical_record_id: Number(r.ma_ho_so),
        patient_id: Number(r.ma_benh_nhan),
        assigned_doctor_id: m?.assignedDoctorId ? Number(m.assignedDoctorId) : null,
        template_id: tCode,
        status: r.trang_thai,
        created_at: r.thoi_diem_kham_lan_dau ? new Date(r.thoi_diem_kham_lan_dau).toISOString() : null,
      };
    });
  }

  async getMedicalRecordDetail(user, recordId) {
    const row = await this._getRecordOrThrow(recordId, user);
    const rid = Number(row.ma_ho_so);
    const meta = await prisma.medicalRecordMeta.findUnique({ where: { maHoSo: BigInt(rid) } }).catch(() => null);
    const templateCode = await this._resolveTemplateCode(row, meta);
    const createdAt = row.thoi_diem_kham_lan_dau ? new Date(row.thoi_diem_kham_lan_dau).toISOString() : new Date().toISOString();

    return {
      medical_record_id: rid,
      patient_id: Number(row.ma_benh_nhan),
      assigned_doctor_id: meta?.assignedDoctorId ? Number(meta.assignedDoctorId) : null,
      created_by: meta?.createdBy ? Number(meta.createdBy) : Number(row.ma_benh_nhan),
      template_id: templateCode,
      status: row.trang_thai,
      instructions: meta?.doctorConclusion || row.chan_doan_ban_dau_phong_kham || null,
      completed_at: meta?.completedAt ? meta.completedAt.toISOString() : null,
      created_at: createdAt,
      updated_at: meta?.updatedAt ? meta.updatedAt.toISOString() : createdAt,
    };
  }

  async _ensureRecordEditable(recordRow, user) {
    if (recordRow.trang_thai === 'completed' || recordRow.trang_thai === 'cancelled') {
      throw createAppError('Hồ sơ bệnh án đã hoàn tất/đóng khóa, không thể chỉnh sửa', 4003, 400);
    }
    const meta = await prisma.medicalRecordMeta
      .findUnique({ where: { maHoSo: BigInt(recordRow.ma_ho_so) } })
      .catch(() => null);
    if (meta?.lockedAt && !isStaffRole(user)) {
      throw createAppError('Hồ sơ bệnh án đã khóa sau khi gửi cho bác sĩ', 1010, 400);
    }
    return meta;
  }

  async updateMedicalRecord(user, recordId, data = {}) {
    const row = await this._getRecordOrThrow(recordId, user);
    await this._ensureRecordEditable(row, user);
    const rid = Number(row.ma_ho_so);

    const sets = [];
    const vals = [];
    let idx = 1;
    const pushField = (col, val) => {
      if (val !== undefined) {
        sets.push(`${col} = $${idx++}`);
        vals.push(val);
      }
    };
    pushField('chan_doan_tuyen_truoc', data.chan_doan_tuyen_truoc);
    pushField('chan_doan_ban_dau_phong_kham', data.chan_doan_ban_dau_phong_kham);
    if (data.thoi_gian_khoi_phat_tuan !== undefined) {
      pushField('thoi_gian_khoi_phat_tuan', data.thoi_gian_khoi_phat_tuan === null ? null : Number(data.thoi_gian_khoi_phat_tuan));
    }
    if (data.tien_su_gia_dinh !== undefined && ['Co', 'Khong', 'Khong ro', null].includes(data.tien_su_gia_dinh)) {
      pushField('tien_su_gia_dinh', data.tien_su_gia_dinh);
    }
    pushField('tien_su_gia_dinh_ghi_ro', data.tien_su_gia_dinh_ghi_ro);
    if (data.da_dieu_tri_truoc_kham !== undefined) {
      pushField('da_dieu_tri_truoc_kham', Boolean(data.da_dieu_tri_truoc_kham));
    }
    const targetStatus = data.status !== undefined ? data.status : data.trang_thai;
    if (isStaffRole(user) && ['draft', 'pending', 'in_progress', 'completed', 'cancelled'].includes(targetStatus)) {
      pushField('trang_thai', targetStatus);
    }

    if (sets.length > 0) {
      vals.push(rid);
      await db.query(`UPDATE public.hosobenhan SET ${sets.join(', ')} WHERE ma_ho_so = $${idx}`, vals);
    }

    const metaData = {};
    if (data.ly_do_den_kham !== undefined) metaData.lyDoDenKham = data.ly_do_den_kham;
    if (data.trieu_chung_chinh !== undefined) metaData.trieuChungChinh = data.trieu_chung_chinh;
    if (data.thoi_gian_khoi_phat !== undefined) metaData.thoiGianKhoiPhat = data.thoi_gian_khoi_phat;
    if (isStaffRole(user)) {
      const instructionsVal = data.instructions !== undefined ? data.instructions : data.doctor_conclusion;
      if (instructionsVal !== undefined) metaData.doctorConclusion = instructionsVal;
      if (data.doctor_notes !== undefined) metaData.doctorNotes = data.doctor_notes;
      if (targetStatus === 'completed') {
        metaData.completedAt = new Date();
        metaData.completedBy = user?.ma_tai_khoan ? BigInt(user.ma_tai_khoan) : null;
        metaData.lockedAt = new Date();
      }
    }

    if (Object.keys(metaData).length > 0) {
      await prisma.medicalRecordMeta.upsert({
        where: { maHoSo: BigInt(rid) },
        create: {
          maHoSo: BigInt(rid),
          maBenhNhan: BigInt(row.ma_benh_nhan),
          ...metaData,
        },
        update: metaData,
      });
    }

    if (data.answers) {
      await this.upsertRecordAnswers(user, rid, data.answers, false);
    }

    const updatedDetail = await this.getMedicalRecordDetail(user, rid);
    return {
      medical_record_id: updatedDetail.medical_record_id,
      patient_id: updatedDetail.patient_id,
      assigned_doctor_id: updatedDetail.assigned_doctor_id,
      created_by: updatedDetail.created_by,
      template_id: updatedDetail.template_id,
      status: updatedDetail.status,
      instructions: updatedDetail.instructions,
      completed_at: updatedDetail.completed_at,
      updated_at: updatedDetail.updated_at,
    };
  }

  async updateMedicalRecordStatus(user, recordId, data = {}) {
    const row = await this._getRecordOrThrow(recordId, user);
    const rid = Number(row.ma_ho_so);
    const newStatus = String(data.status || data.trang_thai || '').trim();
    if (!['draft', 'pending', 'in_progress', 'completed', 'cancelled'].includes(newStatus)) {
      throw createAppError('Trạng thái bệnh án không hợp lệ', 1004, 400);
    }
    if (!isStaffRole(user) && newStatus !== 'cancelled' && newStatus !== 'pending') {
      throw createAppError('Không có quyền chuyển sang trạng thái này', 1009, 403);
    }
    await db.query('UPDATE public.hosobenhan SET trang_thai = $1 WHERE ma_ho_so = $2', [newStatus, rid]);
    return {
      id: rid,
      status: newStatus,
    };
  }

  async _resolveNumericQuestionId(rawQuestionId) {
    if (typeof rawQuestionId === 'number' && !Number.isNaN(rawQuestionId) && rawQuestionId > 0) {
      return rawQuestionId;
    }
    const rawStr = String(rawQuestionId || '').trim();
    if (/^\d+$/.test(rawStr)) return parseInt(rawStr, 10);
    if (!rawStr) return null;

    const byCode = await prisma.templateQuestion.findFirst({
      where: { questionCode: rawStr },
      select: { id: true },
    });
    if (byCode) return byCode.id;

    // Hash string question_id thành số nguyên dương ổn định để lưu Sub DB (Prisma Int)
    let hash = 0;
    for (let i = 0; i < rawStr.length; i += 1) {
      hash = (hash * 31 + rawStr.charCodeAt(i)) % 2000000000;
    }
    return Math.abs(hash) + 10000;
  }

  async getRecordAnswers(user, recordId) {
    const row = await this._getRecordOrThrow(recordId, user);
    const rid = Number(row.ma_ho_so);
    const answers = await prisma.medicalRecordAnswer.findMany({
      where: { maHoSo: BigInt(rid) },
      orderBy: { questionId: 'asc' },
    });
    return answers.map((a) => ({
      id: a.id,
      medical_record_id: Number(a.maHoSo),
      question_id: a.questionCode || String(a.questionId),
      question_option_id: a.questionOptionId ?? null,
      answer_text: a.answerValue ?? null,
      answer_value: a.answerJson ?? null,
      answered_by: a.answeredBy ? Number(a.answeredBy) : null,
      created_at: a.createdAt ? a.createdAt.toISOString() : (a.updatedAt ? a.updatedAt.toISOString() : null),
      updated_at: a.updatedAt ? a.updatedAt.toISOString() : null,
    }));
  }

  async upsertRecordAnswers(user, recordId, rawAnswers, checkLock = true) {
    const row = await this._getRecordOrThrow(recordId, user);
    if (checkLock) {
      await this._ensureRecordEditable(row, user);
    }
    const rid = Number(row.ma_ho_so);

    let list = [];
    if (Array.isArray(rawAnswers)) {
      list = rawAnswers;
    } else if (rawAnswers && Array.isArray(rawAnswers.answers)) {
      list = rawAnswers.answers;
    } else if (rawAnswers && typeof rawAnswers === 'object') {
      list = Object.entries(rawAnswers).map(([k, v]) => ({
        question_id: k,
        answer_value: v,
      }));
    }

    if (list.length === 0) {
      throw createAppError('Danh sách câu trả lời rỗng', 1002, 400);
    }

    let count = 0;
    for (const item of list) {
      const rawQid = item.question_id || item.questionId;
      const qid = await this._resolveNumericQuestionId(rawQid);
      if (!qid || qid <= 0) continue;

      const questionCode = rawQid !== undefined && rawQid !== null ? String(rawQid) : String(qid);
      const rawOptionId = item.question_option_id ?? item.option_id;
      const questionOptionId =
        rawOptionId !== undefined && rawOptionId !== null && !Number.isNaN(parseInt(rawOptionId, 10))
          ? parseInt(rawOptionId, 10)
          : null;

      const answerTextRaw =
        item.answer_text !== undefined
          ? item.answer_text
          : item.option_value !== undefined
          ? item.option_value
          : item.answer_value !== undefined && typeof item.answer_value !== 'object'
          ? item.answer_value
          : item.value !== undefined && typeof item.value !== 'object'
          ? item.value
          : item.answer;
      const answerValue =
        answerTextRaw !== undefined && answerTextRaw !== null ? String(answerTextRaw) : null;

      const answerJson =
        item.answer_value !== undefined && typeof item.answer_value === 'object'
          ? item.answer_value
          : item.answer_json !== undefined
          ? item.answer_json
          : item.option_value !== undefined
          ? { value: item.option_value }
          : undefined;

      await prisma.medicalRecordAnswer.upsert({
        where: { maHoSo_questionId: { maHoSo: BigInt(rid), questionId: qid } },
        create: {
          maHoSo: BigInt(rid),
          questionId: qid,
          questionCode,
          questionOptionId,
          answerValue,
          answerJson,
          answeredBy: user?.ma_tai_khoan ? BigInt(user.ma_tai_khoan) : null,
        },
        update: {
          questionCode,
          questionOptionId,
          answerValue,
          answerJson,
          answeredBy: user?.ma_tai_khoan ? BigInt(user.ma_tai_khoan) : null,
        },
      });
      count += 1;
    }

    return { count };
  }

  async getMedicalRecordSummary(user, recordId) {
    const row = await this._getRecordOrThrow(recordId, user);
    return {
      medical_record_id: Number(row.ma_ho_so),
      status: row.trang_thai,
      patient_name: row.ho_ten || '',
      created_at: row.thoi_diem_kham_lan_dau ? new Date(row.thoi_diem_kham_lan_dau).toISOString() : null,
    };
  }

  async getPatientMedicalHistory(user, patientId) {
    const pid = await patientService.assertPatientAccess(user, patientId);
    const res = await db.query(
      `SELECT hs.ma_ho_so, hs.trang_thai, hs.chan_doan_ban_dau_phong_kham, hs.thoi_diem_kham_lan_dau
       FROM public.hosobenhan hs
       WHERE hs.ma_benh_nhan = $1
       ORDER BY hs.ma_ho_so DESC`,
      [pid]
    );
    const ids = res.rows.map((r) => BigInt(r.ma_ho_so));
    const metas = ids.length
      ? await prisma.medicalRecordMeta.findMany({ where: { maHoSo: { in: ids } } }).catch(() => [])
      : [];
    const metaMap = new Map(metas.map((m) => [Number(m.maHoSo), m]));

    return res.rows.map((r) => {
      const m = metaMap.get(Number(r.ma_ho_so));
      return {
        medical_record_id: Number(r.ma_ho_so),
        status: r.trang_thai,
        instructions: m?.doctorConclusion || r.chan_doan_ban_dau_phong_kham || null,
        created_at: r.thoi_diem_kham_lan_dau ? new Date(r.thoi_diem_kham_lan_dau).toISOString() : null,
      };
    });
  }

  async getMedicalRecordHistory(user, recordId) {
    const row = await this._getRecordOrThrow(recordId, user);
    const rid = Number(row.ma_ho_so);
    const [sessions, meta] = await Promise.all([
      patientService.getPhienKhamList(rid),
      prisma.medicalRecordMeta.findUnique({ where: { maHoSo: BigInt(rid) } }).catch(() => null),
    ]);

    const timeline = [];
    if (row.thoi_diem_kham_lan_dau) {
      timeline.push({ event: 'CREATED', timestamp: row.thoi_diem_kham_lan_dau, detail: `Tạo hồ sơ ${row.loai_benh_an}` });
    }
    if (meta?.closedAt) {
      timeline.push({ event: 'CLOSED_BY_PATIENT', timestamp: meta.closedAt, detail: 'Bệnh nhân gửi/đóng hồ sơ chờ khám' });
    }
    if (meta?.acceptedAt) {
      timeline.push({ event: 'ACCEPTED_BY_DOCTOR', timestamp: meta.acceptedAt, detail: 'Bác sĩ tiếp nhận hồ sơ' });
    }
    for (const s of sessions) {
      timeline.push({
        event: `SESSION_${s.lan_kham_thu}`,
        timestamp: s.ngay_kham,
        detail: s.tom_tat_buoi_kham || `Phiên khám lần ${s.lan_kham_thu}`,
      });
    }
    if (meta?.completedAt) {
      timeline.push({ event: 'COMPLETED', timestamp: meta.completedAt, detail: meta.doctorConclusion || 'Hoàn tất hồ sơ' });
    }

    return {
      ma_ho_so: rid,
      trang_thai: row.trang_thai,
      timeline,
      sessions,
    };
  }

  async closeMedicalRecord(user, recordId) {
    const row = await this._getRecordOrThrow(recordId, user);
    if (row.trang_thai === 'completed') {
      throw createAppError('Hồ sơ đã hoàn tất trước đó', 1010, 400);
    }
    const rid = Number(row.ma_ho_so);
    await db.query(`UPDATE public.hosobenhan SET trang_thai = 'pending' WHERE ma_ho_so = $1`, [rid]);

    const now = new Date();
    await prisma.medicalRecordMeta.upsert({
      where: { maHoSo: BigInt(rid) },
      create: {
        maHoSo: BigInt(rid),
        maBenhNhan: BigInt(row.ma_benh_nhan),
        closedAt: now,
        closedBy: user?.ma_tai_khoan ? BigInt(user.ma_tai_khoan) : null,
        lockedAt: now,
      },
      update: {
        closedAt: now,
        closedBy: user?.ma_tai_khoan ? BigInt(user.ma_tai_khoan) : null,
        lockedAt: now,
      },
    });
    return this.getMedicalRecordDetail(user, rid);
  }

  async acceptMedicalRecord(user, recordId, data = {}) {
    const row = await this._getRecordOrThrow(recordId, user);
    if (row.trang_thai === 'completed') {
      throw createAppError('Hồ sơ đã hoàn tất, không thể tiếp nhận lại', 4003, 400);
    }
    const rid = Number(row.ma_ho_so);
    await db.query(`UPDATE public.hosobenhan SET trang_thai = 'in_progress' WHERE ma_ho_so = $1`, [rid]);

    const existingSessions = await patientService.getPhienKhamList(rid);
    if (existingSessions.length === 0) {
      await patientService.createPhienKham(rid, data, user);
    }

    const doctorId = user?.ma_nguoi ? Number(user.ma_nguoi) : Number(user.ma_tai_khoan);
    await prisma.medicalRecordMeta.upsert({
      where: { maHoSo: BigInt(rid) },
      create: {
        maHoSo: BigInt(rid),
        maBenhNhan: BigInt(row.ma_benh_nhan),
        acceptedAt: new Date(),
        acceptedBy: user?.ma_tai_khoan ? BigInt(user.ma_tai_khoan) : null,
        assignedDoctorId: doctorId ? BigInt(doctorId) : null,
      },
      update: {
        acceptedAt: new Date(),
        acceptedBy: user?.ma_tai_khoan ? BigInt(user.ma_tai_khoan) : null,
        assignedDoctorId: doctorId ? BigInt(doctorId) : null,
      },
    });

    return {
      medical_record_id: rid,
      assigned_doctor_id: doctorId,
      status: 'in_progress',
    };
  }

  async completeMedicalRecord(user, recordId, data = {}) {
    const row = await this._getRecordOrThrow(recordId, user);
    const rid = Number(row.ma_ho_so);
    await db.query(
      `UPDATE public.hosobenhan
       SET trang_thai = 'completed',
           chan_doan_ban_dau_phong_kham = COALESCE($1, chan_doan_ban_dau_phong_kham),
           ngay_ket_thuc_dieu_tri_ngoai_tru = COALESCE($2, CURRENT_DATE)
       WHERE ma_ho_so = $3`,
      [data.chan_doan_ban_dau_phong_kham || data.doctor_conclusion || null, data.ngay_ket_thuc_dieu_tri_ngoai_tru || null, rid]
    );

    const now = new Date();
    await prisma.medicalRecordMeta.upsert({
      where: { maHoSo: BigInt(rid) },
      create: {
        maHoSo: BigInt(rid),
        maBenhNhan: BigInt(row.ma_benh_nhan),
        doctorConclusion: data.doctor_conclusion || data.conclusion || null,
        doctorNotes: data.doctor_notes || data.notes || null,
        completedAt: now,
        completedBy: user?.ma_tai_khoan ? BigInt(user.ma_tai_khoan) : null,
        lockedAt: now,
      },
      update: {
        doctorConclusion: data.doctor_conclusion || data.conclusion || undefined,
        doctorNotes: data.doctor_notes || data.notes || undefined,
        completedAt: now,
        completedBy: user?.ma_tai_khoan ? BigInt(user.ma_tai_khoan) : null,
        lockedAt: now,
      },
    });

    return this.getMedicalRecordDetail(user, rid);
  }

  async deleteMedicalRecord(user, recordId) {
    const row = await this._getRecordOrThrow(recordId, user);
    const rid = Number(row.ma_ho_so);
    if (row.trang_thai === 'completed' && String(user?.vai_tro || '').toLowerCase() !== 'admin') {
      throw createAppError('Chỉ Admin mới có quyền xóa hồ sơ đã hoàn tất', 1009, 403);
    }

    const client = await db.pool.connect();
    try {
      await client.query('BEGIN');
      await client.query('SET CONSTRAINTS ALL DEFERRED');

      const sessionIdsRes = await client.query('SELECT ma_phien_kham FROM public.phienkham WHERE ma_ho_so = $1', [rid]);
      const sessionIds = sessionIdsRes.rows.map((r) => r.ma_phien_kham);

      const dotIdsRes = await client.query('SELECT ma_dot_ton_thuong_da FROM public.dottonthuongda WHERE ma_ho_so_man = $1', [rid]);
      const dotIds = dotIdsRes.rows.map((r) => r.ma_dot_ton_thuong_da);

      const tepIdsRes = await client.query('SELECT ma_tep_dinh_kem FROM public.tepdinhkem WHERE ma_ho_so = $1', [rid]);
      const tepIds = tepIdsRes.rows.map((r) => r.ma_tep_dinh_kem);

      if (dotIds.length > 0 || tepIds.length > 0) {
        await client.query(
          `DELETE FROM public.anhchuptonthuong
           WHERE ($1::bigint[] IS NOT NULL AND ma_dot_ton_thuong_da = ANY($1))
              OR ($2::bigint[] IS NOT NULL AND ma_tep_dinh_kem = ANY($2))`,
          [dotIds.length ? dotIds : null, tepIds.length ? tepIds : null]
        );
      }
      if (dotIds.length > 0) {
        await client.query('DELETE FROM public.vitritonthuong WHERE ma_dot_ton_thuong_da = ANY($1)', [dotIds]);
        await client.query('DELETE FROM public.dottonthuongda WHERE ma_dot_ton_thuong_da = ANY($1)', [dotIds]);
      }
      if (tepIds.length > 0) {
        await client.query('DELETE FROM public.tepdinhkem WHERE ma_tep_dinh_kem = ANY($1)', [tepIds]);
      }

      const dtRes = await client.query('SELECT ma_don_thuoc FROM public.donthuoc WHERE ma_ho_so = $1', [rid]);
      const dtIds = dtRes.rows.map((r) => r.ma_don_thuoc);
      if (dtIds.length > 0) {
        await client.query('DELETE FROM public.chidanngungthuoc WHERE ma_don_thuoc = ANY($1)', [dtIds]);
        await client.query('DELETE FROM public.chitietdonthuoc WHERE ma_don_thuoc = ANY($1)', [dtIds]);
        await client.query('DELETE FROM public.donthuoc WHERE ma_don_thuoc = ANY($1)', [dtIds]);
      }

      await client.query('DELETE FROM public.nhatkyuashangngay WHERE ma_ho_so_man = $1', [rid]);
      await client.query('DELETE FROM public.nhatkyaashangngay WHERE ma_ho_so_man = $1', [rid]);

      if (sessionIds.length > 0) {
        await client.query('DELETE FROM public.ketquacanlamsang WHERE ma_phien_kham = ANY($1)', [sessionIds]);
        await client.query('DELETE FROM public.ketquaproms WHERE ma_phien_kham_man = ANY($1)', [sessionIds]);
        await client.query('DELETE FROM public.phienkhamcap WHERE ma_phien_kham = ANY($1)', [sessionIds]);
        await client.query('DELETE FROM public.phienkhamman WHERE ma_phien_kham = ANY($1)', [sessionIds]);
        await client.query('DELETE FROM public.phienkham WHERE ma_phien_kham = ANY($1)', [sessionIds]);
      }

      await client.query('DELETE FROM public.tiensubanthan WHERE ma_ho_so = $1', [rid]);
      await client.query('DELETE FROM public.hoancanhkhoiphatdiung WHERE ma_ho_so = $1', [rid]);
      await client.query('DELETE FROM public.tinhtrangnhiemtrung WHERE ma_ho_so = $1', [rid]);
      await client.query('DELETE FROM public.benhsucacdotbenhtruoc WHERE ma_ho_so = $1', [rid]);

      await client.query('DELETE FROM public.benhanmaydaycap WHERE ma_ho_so = $1', [rid]);
      await client.query('DELETE FROM public.benhanmaydayman WHERE ma_ho_so = $1', [rid]);
      await client.query('DELETE FROM public.hosobenhan WHERE ma_ho_so = $1', [rid]);

      await client.query('COMMIT');
    } catch (err) {
      await client.query('ROLLBACK');
      throw err;
    } finally {
      client.release();
    }

    await Promise.allSettled([
      prisma.medicalRecordMeta.deleteMany({ where: { maHoSo: BigInt(rid) } }),
      prisma.medicalRecordAnswer.deleteMany({ where: { maHoSo: BigInt(rid) } }),
      prisma.answerImage.deleteMany({ where: { maHoSo: BigInt(rid) } }),
      prisma.lesionEpisodeMeta.deleteMany({ where: { maHoSo: BigInt(rid) } }),
      prisma.anhTonThuongMoRong.deleteMany({ where: { maHoSo: BigInt(rid) } }),
      prisma.labRequest.deleteMany({ where: { maHoSo: BigInt(rid) } }),
    ]);

    return {};
  }

  // ============================================================================
  // 3. CẬN LÂM SÀNG & ĐƠN THUỐC (medrec12, medrec13)
  // ============================================================================
  async createLabResult(user, data = {}) {
    const rid = parseInt(data.ma_ho_so || data.medical_record_id, 10);
    let sessionId = data.ma_phien_kham || data.session_id;
    let loaiBenhAn;

    if (sessionId) {
      const pkRes = await db.query(
        'SELECT ma_phien_kham, ma_ho_so, loai_benh_an FROM public.phienkham WHERE ma_phien_kham = $1 LIMIT 1',
        [sessionId]
      );
      if (!pkRes.rows[0]) throw createAppError(`Không tìm thấy phiên khám #${sessionId}`, 9992, 404);
      loaiBenhAn = pkRes.rows[0].loai_benh_an;
    } else {
      const hs = await this._getRecordOrThrow(rid, user);
      loaiBenhAn = hs.loai_benh_an;
      const sessions = await patientService.getPhienKhamList(hs.ma_ho_so);
      if (sessions.length > 0) {
        sessionId = sessions[0].ma_phien_kham;
      } else {
        const createdSession = await patientService.createPhienKham(hs.ma_ho_so, {}, user);
        sessionId = createdSession.ma_phien_kham;
      }
    }

    const client = await db.pool.connect();
    let kqRow;
    try {
      await client.query('BEGIN');

      const res = await client.query(
        `INSERT INTO public.ketquacanlamsang (
          ma_phien_kham, loai_ket_qua_can_lam_sang, wbc, crp, ige_toan_phan,
          can_lam_sang_khac_ghi_chu, xet_nghiem_khac, thoi_diem_thuc_hien
        ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8)
        RETURNING *`,
        [
          sessionId,
          loaiBenhAn,
          data.wbc ?? null,
          data.crp ?? null,
          data.ige_toan_phan ?? data.ige_total ?? null,
          data.can_lam_sang_khac_ghi_ro || data.notes || null,
          data.xet_nghiem_khac || null,
          data.thoi_diem_thuc_hien || new Date(),
        ]
      );
      kqRow = res.rows[0];

      // Subtype DEFERRABLE FK bắt buộc insert ketquacanlamsangcap / ketquacanlamsangman
      if (loaiBenhAn === 'CAP') {
        await client.query(
          `INSERT INTO public.ketquacanlamsangcap (ma_ket_qua_can_lam_sang, lym, neu, plt, tryptase_cap, tryptase_nen)
           VALUES ($1, $2, $3, $4, $5, $6)`,
          [
            kqRow.ma_ket_qua_can_lam_sang,
            data.lym ?? null,
            data.neu ?? null,
            data.plt ?? null,
            data.tryptase_cap ?? null,
            data.tryptase_nen ?? null,
          ]
        );
      } else {
        await client.query(
          `INSERT INTO public.ketquacanlamsangman (ma_ket_qua_can_lam_sang, eo, ba_bach_cau, anti_tpo, tsh, ft4, ft3)
           VALUES ($1, $2, $3, $4, $5, $6, $7)`,
          [
            kqRow.ma_ket_qua_can_lam_sang,
            data.eo ?? null,
            data.ba_bach_cau ?? null,
            data.anti_tpo ?? null,
            data.tsh ?? null,
            data.ft4 ?? null,
            data.ft3 ?? null,
          ]
        );
      }

      await client.query('COMMIT');
    } catch (err) {
      await client.query('ROLLBACK');
      throw err;
    } finally {
      client.release();
    }

    return {
      ...kqRow,
      ma_ket_qua_can_lam_sang: Number(kqRow.ma_ket_qua_can_lam_sang),
      ma_phien_kham: Number(kqRow.ma_phien_kham),
    };
  }

  async createLabRequest(user, data = {}) {
    const rid = parseInt(data.medical_record_id || data.ma_ho_so, 10);
    const hs = await this._getRecordOrThrow(rid, user);
    const items = Array.isArray(data.items) ? data.items : [];
    if (items.length === 0) {
      throw createAppError('Phải chọn ít nhất 1 xét nghiệm', 1002, 400);
    }
    for (const it of items) {
      if (!it.test_name && !it.ten_xet_nghiem) {
        throw createAppError('Tên xét nghiệm không được để rỗng', 1002, 400);
      }
    }

    const reqBy = user?.ma_nguoi ? Number(user.ma_nguoi) : Number(user.ma_tai_khoan);
    const created = await prisma.labRequest.create({
      data: {
        maHoSo: BigInt(hs.ma_ho_so),
        requestedBy: BigInt(reqBy),
        status: 'pending',
        note: data.note || null,
        items: {
          create: items.map((it) => ({
            testName: String(it.test_name || it.ten_xet_nghiem).trim(),
            description: it.description || null,
          })),
        },
      },
      include: { items: { orderBy: { id: 'asc' } } },
    });

    return {
      id: String(created.id),
      medical_record_id: String(created.maHoSo),
      requested_by: String(created.requestedBy),
      status: created.status,
      note: created.note,
      items: created.items.map((it) => ({
        id: String(it.id),
        test_name: it.testName,
        description: it.description,
      })),
      created_at: created.createdAt.toISOString(),
    };
  }

  async getLabResultsByRecord(user, recordId) {
    const hs = await this._getRecordOrThrow(recordId, user);
    const rid = Number(hs.ma_ho_so);

    const subRequests = await prisma.labRequest.findMany({
      where: { maHoSo: BigInt(rid) },
      include: { items: { orderBy: { id: 'asc' } } },
      orderBy: { id: 'desc' },
    }).catch(() => []);

    const mappedSub = subRequests.map((lr) => ({
      id: String(lr.id),
      requested_by: String(lr.requestedBy),
      status: lr.status,
      note: lr.note,
      items: lr.items.map((it) => ({
        id: String(it.id),
        test_name: it.testName,
        result_id: it.resultId ? String(it.resultId) : null,
        result_value: it.resultValue,
        concluded_by: it.concludedBy ? String(it.concludedBy) : null,
        result_note: it.resultNote,
      })),
      created_at: lr.createdAt.toISOString(),
    }));

    const res = await db.query(
      `SELECT k.*, pk.ma_ho_so, pk.ngay_kham, pk.ma_bac_si
       FROM public.ketquacanlamsang k
       JOIN public.phienkham pk ON k.ma_phien_kham = pk.ma_phien_kham
       WHERE pk.ma_ho_so = $1
       ORDER BY k.ma_ket_qua_can_lam_sang DESC`,
      [rid]
    );

    const mappedMain = res.rows.map((r) => ({
      id: String(r.ma_ket_qua_can_lam_sang),
      requested_by: r.ma_bac_si ? String(r.ma_bac_si) : null,
      status: 'completed',
      note: null,
      items: [
        {
          id: String(r.ma_ket_qua_can_lam_sang),
          test_name: 'Cận lâm sàng tổng hợp',
          result_id: String(r.ma_ket_qua_can_lam_sang),
          result_value: JSON.stringify({
            wbc: r.wbc ?? null,
            crp: r.crp ?? null,
            ige_toan_phan: r.ige_toan_phan ?? null,
            ket_qua_test_lay_da: r.ket_qua_test_lay_da ?? null,
          }),
          concluded_by: r.ma_bac_si ? String(r.ma_bac_si) : null,
          result_note: r.ket_luan_can_lam_sang ?? null,
        },
      ],
      created_at: r.ngay_kham ? new Date(r.ngay_kham).toISOString() : new Date().toISOString(),
    }));

    return [...mappedSub, ...mappedMain];
  }

  async createPrescription(user, data = {}) {
    const rid = parseInt(data.ma_ho_so || data.medical_record_id, 10);
    const hs = await this._getRecordOrThrow(rid, user);
    const items = Array.isArray(data.items) ? data.items : Array.isArray(data.medicines) ? data.medicines : [];
    if (items.length === 0) {
      throw createAppError('Đơn thuốc phải có ít nhất 1 thuốc', 1002, 400);
    }

    // Live DB public.donthuoc yêu cầu ma_phien_kham NOT NULL
    let sessionId = data.ma_phien_kham || data.session_id || null;
    if (!sessionId) {
      const sessions = await patientService.getPhienKhamList(hs.ma_ho_so);
      if (sessions.length > 0) {
        sessionId = sessions[0].ma_phien_kham;
      } else {
        const createdSession = await patientService.createPhienKham(hs.ma_ho_so, {}, user);
        sessionId = createdSession.ma_phien_kham;
      }
    }

    const client = await db.pool.connect();
    let donRow;
    const savedItems = [];
    try {
      await client.query('BEGIN');
      const dtRes = await client.query(
        `INSERT INTO public.donthuoc (
          ma_ho_so, ma_phien_kham, ngay_ke_don, trang_thai_don, ghi_chu_dieu_tri, ngung_thuoc_lan_sau, thuoc_can_ngung_truoc_tai_kham
        ) VALUES ($1, $2, COALESCE($3::DATE, CURRENT_DATE), $4, $5, $6, $7)
        RETURNING *`,
        [
          hs.ma_ho_so,
          sessionId,
          data.ngay_ke_don || null,
          ['DANG_DIEU_TRI', 'HOAN_THANH', 'HUY'].includes(data.trang_thai_don) ? data.trang_thai_don : 'DANG_DIEU_TRI',
          data.note || data.ghi_chu_dieu_tri || data.notes || null,
          Boolean(data.ngung_thuoc_lan_sau ?? false),
          data.thuoc_can_ngung_truoc_tai_kham || null,
        ]
      );
      donRow = dtRes.rows[0];

      for (const it of items) {
        const medName = it.medicine_name || it.ten_thuoc_bo_sung || it.ten_thuoc || null;
        if (!medName) throw createAppError('Tên thuốc không được để rỗng', 1002, 400);
        let maThuoc = it.ma_thuoc || null;
        if (maThuoc) {
          const tCheck = await client.query('SELECT ma_thuoc FROM public.thuoc WHERE ma_thuoc = $1 LIMIT 1', [maThuoc]);
          if (tCheck.rows.length === 0) maThuoc = null;
        }
        const ctRes = await client.query(
          `INSERT INTO public.chitietdonthuoc (
            ma_don_thuoc, ma_thuoc, ten_thuoc_bo_sung, lieu_dung, thoi_gian_dung, ma_ke_hoach_dieu_tri
          ) VALUES ($1, $2, $3, $4, $5, $6)
          RETURNING *`,
          [
            donRow.ma_don_thuoc,
            maThuoc,
            medName,
            it.dosage || it.lieu_dung || '1 viên/ngày',
            it.duration || it.thoi_gian_dung || '7 ngày',
            it.ma_ke_hoach_dieu_tri || null,
          ]
        );
        savedItems.push({
          row: ctRes.rows[0],
          medicine_name: medName,
          dosage: it.dosage ?? it.lieu_dung ?? null,
          frequency: it.frequency ?? null,
          duration: it.duration ?? it.thoi_gian_dung ?? null,
          instruction: it.instruction ?? null,
        });
      }

      await client.query('COMMIT');
    } catch (err) {
      await client.query('ROLLBACK');
      throw err;
    } finally {
      client.release();
    }

    const createdBy = user?.ma_nguoi ? String(user.ma_nguoi) : String(user.ma_tai_khoan);
    return {
      prescription_id: String(donRow.ma_don_thuoc),
      medical_record_id: String(donRow.ma_ho_so),
      created_by: createdBy,
      note: donRow.ghi_chu_dieu_tri ?? null,
      items: savedItems.map((s) => ({
        prescription_item_id: String(s.row.ma_chi_tiet_don_thuoc),
        medicine_name: s.medicine_name,
        dosage: s.dosage,
        frequency: s.frequency,
        duration: s.duration,
        instruction: s.instruction,
      })),
      created_at: donRow.ngay_ke_don ? new Date(donRow.ngay_ke_don).toISOString() : new Date().toISOString(),
    };
  }

  async getPrescriptionsByRecord(user, recordId) {
    const hs = await this._getRecordOrThrow(recordId, user);
    const dtRes = await db.query(
      `SELECT * FROM public.donthuoc WHERE ma_ho_so = $1 ORDER BY ma_don_thuoc DESC`,
      [hs.ma_ho_so]
    );
    if (dtRes.rows.length === 0) return [];

    const dtIds = dtRes.rows.map((d) => d.ma_don_thuoc);
    const ctRes = await db.query(
      `SELECT ct.*, th.ten_thuoc, th.hoat_chat, th.nhom_dieu_tri
       FROM public.chitietdonthuoc ct
       LEFT JOIN public.thuoc th ON ct.ma_thuoc = th.ma_thuoc
       WHERE ct.ma_don_thuoc = ANY($1)
       ORDER BY ct.ma_chi_tiet_don_thuoc ASC`,
      [dtIds]
    );

    const itemsByDon = new Map();
    for (const c of ctRes.rows) {
      const key = Number(c.ma_don_thuoc);
      if (!itemsByDon.has(key)) itemsByDon.set(key, []);
      itemsByDon.get(key).push({
        ...c,
        ma_chi_tiet_don_thuoc: Number(c.ma_chi_tiet_don_thuoc),
        ma_don_thuoc: key,
      });
    }

    return dtRes.rows.map((d) => ({
      ...d,
      ma_don_thuoc: Number(d.ma_don_thuoc),
      ma_ho_so: Number(d.ma_ho_so),
      items: itemsByDon.get(Number(d.ma_don_thuoc)) || [],
    }));
  }

  // ============================================================================
  // 4. CHẤM ĐIỂM UAS7 & AAS HÀNG NGÀY (Slide 7)
  // ============================================================================
  async _resolveOrCreateUasCycle(client, maBenhNhan, scoreDateStr) {
    // Tìm chu kỳ 7 ngày chứa scoreDateStr (ngay_bat_dau <= scoreDateStr <= ngay_ket_thuc)
    const existingCycle = await client.query(
      `SELECT ma_chu_ky, ngay_bat_dau, ngay_ket_thuc,
              ($2::DATE - ngay_bat_dau)::INT + 1 AS day_index
       FROM public.chukytheodoiuas7
       WHERE ma_benh_nhan = $1
         AND $2::DATE BETWEEN ngay_bat_dau AND ngay_ket_thuc
       ORDER BY ngay_bat_dau DESC
       LIMIT 1`,
      [maBenhNhan, scoreDateStr]
    );
    if (existingCycle.rows[0]) {
      return existingCycle.rows[0];
    }

    // Tạo chu kỳ mới 7 ngày bắt đầu từ scoreDateStr (ck_chukyuas7_ngay: ngay_ket_thuc = ngay_bat_dau + 6)
    const createdCycle = await client.query(
      `INSERT INTO public.chukytheodoiuas7 (ma_benh_nhan, ngay_bat_dau, ngay_ket_thuc, trang_thai_chu_ky)
       VALUES ($1, $2::DATE, ($2::DATE + 6), 'DANG_THEO_DOI')
       RETURNING ma_chu_ky, ngay_bat_dau, ngay_ket_thuc, 1 AS day_index`,
      [maBenhNhan, scoreDateStr]
    );
    return createdCycle.rows[0];
  }

  async checkUas7Eligibility(user, queryParams = {}) {
    let maBenhNhan = queryParams.patient_id || queryParams.ma_benh_nhan;
    if (!isStaffRole(user) || !maBenhNhan) {
      maBenhNhan = await resolvePatientIdForUser(db, user);
    }
    if (!maBenhNhan) {
      return { eligible: 'false', medical_record_id: null };
    }
    maBenhNhan = await patientService.assertPatientAccess(user, maBenhNhan);
    const manRes = await db.query(
      `SELECT ma_ho_so, trang_thai FROM public.hosobenhan
       WHERE ma_benh_nhan = $1 AND loai_benh_an = 'MAN'
       ORDER BY ma_ho_so DESC LIMIT 1`,
      [maBenhNhan]
    );
    const isEligible = manRes.rows.length > 0;
    return {
      eligible: isEligible ? 'true' : 'false',
      medical_record_id: manRes.rows[0] ? String(manRes.rows[0].ma_ho_so) : null,
    };
  }

  async logUas7Score(user, data = {}) {
    let maBenhNhan = data.ma_benh_nhan || data.patient_id;
    if (!isStaffRole(user) || !maBenhNhan) {
      maBenhNhan = await resolvePatientIdForUser(db, user);
    }
    if (!maBenhNhan) {
      throw createAppError('Không xác định được mã bệnh nhân để chấm điểm UAS7', 1002, 400);
    }
    maBenhNhan = await patientService.assertPatientAccess(user, maBenhNhan);

    const whealScore = parseInt(data.wheal_score ?? data.hss7 ?? data.hss7_score ?? data.diem_san_phu_hss, 10);
    const itchScore = parseInt(data.itch_score ?? data.iss7 ?? data.iss7_score ?? data.diem_ngua_iss, 10);
    if (
      Number.isNaN(whealScore) || whealScore < 0 || whealScore > 3 ||
      Number.isNaN(itchScore) || itchScore < 0 || itchScore > 3
    ) {
      throw createAppError('Điểm sẩn phù (wheal_score/hss7) và điểm ngứa (itch_score/iss7) phải là số nguyên 0..3', 1004, 400);
    }

    const scoreDate = String(data.score_date || data.ngay_cham_diem || new Date().toISOString().slice(0, 10)).slice(0, 10);
    if (!/^\d{4}-\d{2}-\d{2}$/.test(scoreDate)) {
      throw createAppError('score_date phải có định dạng YYYY-MM-DD', 1004, 400);
    }

    let maHoSoMan = data.ma_ho_so_man || data.medical_record_id || null;
    if (maHoSoMan) {
      const hsCheck = await db.query(
        `SELECT ma_ho_so, loai_benh_an, ma_benh_nhan FROM public.hosobenhan WHERE ma_ho_so = $1 LIMIT 1`,
        [parseInt(maHoSoMan, 10)]
      );
      if (!hsCheck.rows[0] || hsCheck.rows[0].loai_benh_an !== 'MAN' || Number(hsCheck.rows[0].ma_benh_nhan) !== maBenhNhan) {
        maHoSoMan = null; // FK yêu cầu phải là hồ sơ MAN của chính bệnh nhân này
      }
    }

    const overwrite = Boolean(data.overwrite);
    const dupCheck = await db.query(
      'SELECT ma_nhat_ky_uas FROM public.nhatkyuashangngay WHERE ma_benh_nhan = $1 AND ngay_cham_diem = $2::DATE LIMIT 1',
      [maBenhNhan, scoreDate]
    );
    if (dupCheck.rows.length > 0 && !overwrite) {
      throw createAppError(`Ngày ${scoreDate} đã được chấm điểm UAS7 trước đó (truyền overwrite: true để cập nhật)`, 1004, 409);
    }

    const client = await db.pool.connect();
    let row;
    try {
      await client.query('BEGIN');
      if (dupCheck.rows.length > 0 && overwrite) {
        const upd = await client.query(
          `UPDATE public.nhatkyuashangngay
           SET diem_san_phu_hss = $1,
               diem_ngua_iss = $2,
               trang_thai_dung_thuoc = COALESCE($3, trang_thai_dung_thuoc)
           WHERE ma_nhat_ky_uas = $4
           RETURNING *`,
          [whealScore, itchScore, data.medication_status || data.trang_thai_dung_thuoc || null, dupCheck.rows[0].ma_nhat_ky_uas]
        );
        row = upd.rows[0];
      } else {
        const cycle = await this._resolveOrCreateUasCycle(client, maBenhNhan, scoreDate);
        const ins = await client.query(
          `INSERT INTO public.nhatkyuashangngay (
            ma_chu_ky, ma_ho_so_man, ma_benh_nhan, ngay_cham_diem, ngay_thu_may_trong_chu_ky,
            diem_san_phu_hss, diem_ngua_iss, trang_thai_dung_thuoc, trang_thai_ngay
          ) VALUES ($1, $2, $3, $4::DATE, $5, $6, $7, $8, 'HOP_LE')
          RETURNING *`,
          [
            cycle.ma_chu_ky,
            maHoSoMan,
            maBenhNhan,
            scoreDate,
            Number(cycle.day_index),
            whealScore,
            itchScore,
            data.medication_status || data.trang_thai_dung_thuoc || null,
          ]
        );
        row = ins.rows[0];
      }
      await client.query('COMMIT');
    } catch (err) {
      await client.query('ROLLBACK');
      throw err;
    } finally {
      client.release();
    }

    // Sync ghi chú sang Sub DB
    try {
      await prisma.uas7Note.upsert({
        where: { maBenhNhan_scoreDate: { maBenhNhan: BigInt(maBenhNhan), scoreDate } },
        create: {
          maBenhNhan: BigInt(maBenhNhan),
          maHoSoMan: maHoSoMan ? BigInt(maHoSoMan) : null,
          scoreDate,
          whealScore,
          itchScore,
          uasDaily: whealScore + itchScore,
          notes: data.notes || data.note || null,
          medicationChanged: Boolean(data.medication_changed ?? false),
          medicationStatus: data.medication_status || data.trang_thai_dung_thuoc || null,
        },
        update: {
          whealScore,
          itchScore,
          uasDaily: whealScore + itchScore,
          notes: data.notes !== undefined ? data.notes : (data.note !== undefined ? data.note : undefined),
          medicationChanged: data.medication_changed !== undefined ? Boolean(data.medication_changed) : undefined,
          medicationStatus: data.medication_status || data.trang_thai_dung_thuoc || undefined,
        },
      });
    } catch (subErr) {
      console.warn('[UAS7 Note Warning]', subErr.message);
    }

    const [allLogs, notes] = await Promise.all([
      db.query(
        'SELECT * FROM public.nhatkyuashangngay WHERE ma_benh_nhan = $1 ORDER BY ngay_cham_diem DESC LIMIT 90',
        [maBenhNhan]
      ),
      prisma.uas7Note.findMany({ where: { maBenhNhan: BigInt(maBenhNhan) } }).catch(() => []),
    ]);
    const noteMap = new Map(notes.map((n) => [n.scoreDate, n]));
    return allLogs.rows.map((r) => {
      const dStr = this._formatDateYmd(r.ngay_cham_diem);
      const sub = noteMap.get(dStr);
      const daily = r.diem_uas_ngay ?? Number(r.diem_san_phu_hss) + Number(r.diem_ngua_iss);
      return {
        patient_id: String(r.ma_benh_nhan),
        medical_record_id: r.ma_ho_so_man ? String(r.ma_ho_so_man) : (sub?.maHoSoMan ? String(sub.maHoSoMan) : null),
        score_date: dStr,
        iss7: String(r.diem_ngua_iss),
        hss7: String(r.diem_san_phu_hss),
        daily_score: String(daily),
        note: sub?.notes ?? null,
        created_at: sub?.createdAt ? sub.createdAt.toISOString() : new Date().toISOString(),
        updated_at: r.thoi_diem_cap_nhat ? new Date(r.thoi_diem_cap_nhat).toISOString() : new Date().toISOString(),
      };
    });
  }

  _formatDateYmd(val) {
    if (!val) return null;
    if (val instanceof Date) {
      const y = val.getFullYear();
      const m = String(val.getMonth() + 1).padStart(2, '0');
      const d = String(val.getDate()).padStart(2, '0');
      return `${y}-${m}-${d}`;
    }
    return String(val).slice(0, 10);
  }

  _classifyUas7Level(score) {
    if (score === 0) return 'Không có';
    if (score <= 6) return 'Kiểm soát tốt';
    if (score <= 15) return 'Nhẹ';
    if (score <= 27) return 'Trung bình';
    return 'Nặng';
  }

  async getUas7Scores(user, queryParams = {}) {
    let maBenhNhan = queryParams.patient_id || queryParams.ma_benh_nhan;
    if (!isStaffRole(user) || !maBenhNhan) {
      maBenhNhan = await resolvePatientIdForUser(db, user);
    }
    if (!maBenhNhan) {
      throw createAppError('Thiếu mã bệnh nhân', 1002, 400);
    }
    maBenhNhan = await patientService.assertPatientAccess(user, maBenhNhan);

    const params = [maBenhNhan];
    let dateFilter = '';
    if (queryParams.from) {
      params.push(queryParams.from);
      dateFilter += ` AND n.ngay_cham_diem >= $${params.length}::DATE`;
    }
    if (queryParams.to) {
      params.push(queryParams.to);
      dateFilter += ` AND n.ngay_cham_diem <= $${params.length}::DATE`;
    }

    const [logsRes, notes] = await Promise.all([
      db.query(
        `SELECT n.* FROM public.nhatkyuashangngay n
         WHERE n.ma_benh_nhan = $1 ${dateFilter}
         ORDER BY n.ngay_cham_diem DESC
         LIMIT 90`,
        params
      ),
      prisma.uas7Note.findMany({ where: { maBenhNhan: BigInt(maBenhNhan) } }).catch(() => []),
    ]);

    const noteMap = new Map(notes.map((n) => [n.scoreDate, n]));
    return logsRes.rows.map((r) => {
      const dateStr = this._formatDateYmd(r.ngay_cham_diem);
      const sub = noteMap.get(dateStr);
      const daily = r.diem_uas_ngay ?? Number(r.diem_san_phu_hss) + Number(r.diem_ngua_iss);
      return {
        patient_id: String(r.ma_benh_nhan),
        medical_record_id: r.ma_ho_so_man ? String(r.ma_ho_so_man) : (sub?.maHoSoMan ? String(sub.maHoSoMan) : null),
        score_date: dateStr,
        iss7: String(r.diem_ngua_iss),
        hss7: String(r.diem_san_phu_hss),
        daily_score: String(daily),
        note: sub?.notes ?? null,
      };
    });
  }

  async getUas7WeekSummary(user, queryParams = {}) {
    let maBenhNhan = queryParams.patient_id || queryParams.ma_benh_nhan;
    if (!isStaffRole(user) || !maBenhNhan) {
      maBenhNhan = await resolvePatientIdForUser(db, user);
    }
    if (!maBenhNhan) {
      throw createAppError('Thiếu mã bệnh nhân', 1002, 400);
    }
    maBenhNhan = await patientService.assertPatientAccess(user, maBenhNhan);

    const params = [maBenhNhan];
    let sql;
    if (queryParams.start_date) {
      params.push(String(queryParams.start_date).slice(0, 10));
      sql = `SELECT * FROM public.nhatkyuashangngay
             WHERE ma_benh_nhan = $1 AND ngay_cham_diem >= $2::DATE AND ngay_cham_diem < ($2::DATE + 7)
             ORDER BY ngay_cham_diem DESC`;
    } else {
      sql = `SELECT * FROM public.nhatkyuashangngay
             WHERE ma_benh_nhan = $1
             ORDER BY ngay_cham_diem DESC
             LIMIT 7`;
    }
    const res = await db.query(sql, params);
    const weekScore = res.rows.reduce(
      (sum, r) => sum + Number(r.diem_uas_ngay ?? Number(r.diem_san_phu_hss) + Number(r.diem_ngua_iss)),
      0
    );
    return {
      patient_id: String(maBenhNhan),
      week_score: String(weekScore),
      severity_label: this._classifyUas7Level(weekScore),
      completed_days: String(res.rows.length),
    };
  }

  async logAasScore(user, data = {}) {
    let maBenhNhan = data.ma_benh_nhan || data.patient_id;
    if (!isStaffRole(user) || !maBenhNhan) {
      maBenhNhan = await resolvePatientIdForUser(db, user);
    }
    maBenhNhan = await patientService.assertPatientAccess(user, maBenhNhan);

    const scoreDate = String(data.score_date || data.ngay_theo_doi || new Date().toISOString().slice(0, 10)).slice(0, 10);
    const hasAngioedema = Boolean(data.co_dot_sung_phu ?? data.has_angioedema ?? false);

    let maHoSoMan = data.ma_ho_so_man || data.medical_record_id || null;
    if (maHoSoMan) {
      const chk = await db.query(
        'SELECT ma_ho_so FROM public.benhanmaydayman WHERE ma_ho_so = $1 LIMIT 1',
        [parseInt(maHoSoMan, 10)]
      );
      if (chk.rows.length === 0) maHoSoMan = null;
    }

    const clamp03 = (v) => (v === undefined || v === null ? null : Math.min(3, Math.max(0, parseInt(v, 10) || 0)));

    const res = await db.query(
      `INSERT INTO public.nhatkyaashangngay (
        ma_benh_nhan, ma_ho_so_man, ngay_theo_doi, co_dot_sung_phu, thoi_diem_xuat_hien,
        muc_kho_chiu, han_che_hoat_dong, anh_huong_ngoai_hinh, do_nang_tong_the
      ) VALUES ($1, $2, $3::DATE, $4, $5, $6, $7, $8, $9)
      ON CONFLICT (ma_benh_nhan, ngay_theo_doi)
      DO UPDATE SET
        co_dot_sung_phu = EXCLUDED.co_dot_sung_phu,
        thoi_diem_xuat_hien = EXCLUDED.thoi_diem_xuat_hien,
        muc_kho_chiu = EXCLUDED.muc_kho_chiu,
        han_che_hoat_dong = EXCLUDED.han_che_hoat_dong,
        anh_huong_ngoai_hinh = EXCLUDED.anh_huong_ngoai_hinh,
        do_nang_tong_the = EXCLUDED.do_nang_tong_the
      RETURNING *`,
      [
        maBenhNhan,
        maHoSoMan,
        scoreDate,
        hasAngioedema,
        data.thoi_diem_xuat_hien || null,
        hasAngioedema ? clamp03(data.muc_kho_chiu ?? 0) : null,
        hasAngioedema ? clamp03(data.han_che_hoat_dong ?? 0) : null,
        hasAngioedema ? clamp03(data.anh_huong_ngoai_hinh ?? 0) : null,
        hasAngioedema ? clamp03(data.do_nang_tong_the ?? 0) : null,
      ]
    );
    const r = res.rows[0];
    return {
      ...r,
      ma_nhat_ky_aas: Number(r.ma_nhat_ky_aas),
      ma_benh_nhan: Number(r.ma_benh_nhan),
    };
  }

  async getAasScores(user, queryParams = {}) {
    let maBenhNhan = queryParams.patient_id || queryParams.ma_benh_nhan;
    if (!isStaffRole(user) || !maBenhNhan) {
      maBenhNhan = await resolvePatientIdForUser(db, user);
    }
    maBenhNhan = await patientService.assertPatientAccess(user, maBenhNhan);

    const res = await db.query(
      'SELECT * FROM public.nhatkyaashangngay WHERE ma_benh_nhan = $1 ORDER BY ngay_theo_doi DESC LIMIT 90',
      [maBenhNhan]
    );
    const items = res.rows.map((r) => ({
      ...r,
      ma_nhat_ky_aas: Number(r.ma_nhat_ky_aas),
      ma_benh_nhan: Number(r.ma_benh_nhan),
    }));
    const aas7 = items.slice(0, 7).reduce((s, i) => s + (Number(i.diem_aas_ngay) || 0), 0);
    const aas28 = items.slice(0, 28).reduce((s, i) => s + (Number(i.diem_aas_ngay) || 0), 0);
    return { ma_benh_nhan: maBenhNhan, summary: { aas7_score: aas7, aas28_score: aas28 }, items };
  }

  // ============================================================================
  // 5. ĐỢT TỔN THƯƠNG, VỊ TRÍ, ẢNH & SUPABASE STORAGE (Slide 8 & 9)
  // ============================================================================
  _normalizeCircumstance(hoanCanh, hoanCanhKhac) {
    if (!hoanCanh) return { hoanCanh: null, hoanCanhKhac: null };
    const clean = String(hoanCanh).trim();
    if (clean === 'Khac' || clean.toLowerCase() === 'khác' || clean.toLowerCase() === 'other') {
      const detail = String(hoanCanhKhac || 'Yếu tố khác').trim();
      return { hoanCanh: 'Khac', hoanCanhKhac: detail };
    }
    // Theo ck_dottonthuongda_hoancanh / ck_vitritonthuong_hoancanh: khác 'Khac' thì khac PHẢI là NULL!
    return { hoanCanh: clean, hoanCanhKhac: null };
  }

  _formatEpisodeFull(r, meta = null, maHoSoFallback = null) {
    const rid = meta?.maHoSo ? Number(meta.maHoSo) : r.ma_ho_so_man ? Number(r.ma_ho_so_man) : maHoSoFallback;
    return {
      episode_id: String(r.ma_dot_ton_thuong_da),
      medical_record_id: rid ? String(rid) : null,
      patient_id: String(r.ma_benh_nhan),
      name: r.ten_dot_ton_thuong_da || '',
      occurred_at: r.thoi_diem_xuat_hien ? new Date(r.thoi_diem_xuat_hien).toISOString() : null,
      context_tags: meta?.contextTags ?? (r.hoan_canh_xuat_hien_khac || r.hoan_canh_xuat_hien || null),
      context_other: meta?.contextOther ?? r.hoan_canh_xuat_hien_khac ?? null,
      medication_name: r.ten_thuoc_dung_gan_thoi_diem_xuat_hien || null,
      medication_taken_ago: meta?.medicationTakenAgo ?? r.thoi_gian_dung_thuoc_truoc_khi_xuat_hien ?? null,
      medication_unit: meta?.medicationUnit ?? r.don_vi_thoi_gian ?? null,
      description: r.chi_tiet_dot_ton_thuong || null,
      created_at: r.thoi_diem_tao ? new Date(r.thoi_diem_tao).toISOString() : null,
      updated_at: r.thoi_diem_cap_nhat ? new Date(r.thoi_diem_cap_nhat).toISOString() : null,
    };
  }

  async createLesionEpisode(user, data = {}) {
    const rid = parseInt(data.ma_ho_so || data.medical_record_id, 10);
    const hs = await this._getRecordOrThrow(rid, user);
    const epName = data.ten_dot_ton_thuong_da || data.episode_name || data.name || '';
    if (!String(epName).trim()) {
      throw createAppError('Tên đợt tổn thương không được để rỗng', 1002, 400);
    }

    // Chỉ gán ma_ho_so_man nếu hồ sơ là MAN (FK tới benhanmaydayman), còn CAP để NULL & lưu ở Sub DB
    const maHoSoMan = hs.loai_benh_an === 'MAN' ? Number(hs.ma_ho_so) : null;
    const rawCtx = data.hoan_canh_xuat_hien || data.trigger_category;
    const ctxTagOther = !rawCtx && data.context_tags ? 'Khac' : rawCtx;
    const ctxOtherDetail =
      data.hoan_canh_xuat_hien_khac ||
      data.context_other ||
      (!rawCtx && data.context_tags ? String(data.context_tags) : null);
    const { hoanCanh, hoanCanhKhac } = this._normalizeCircumstance(ctxTagOther, ctxOtherDetail);

    const takenAgo = data.thoi_gian_dung_thuoc_truoc_khi_xuat_hien ?? data.medication_taken_ago ?? null;
    const medUnit = data.don_vi_thoi_gian ?? data.medication_unit ?? null;

    const res = await db.query(
      `INSERT INTO public.dottonthuongda (
        ma_benh_nhan, ma_ho_so_man, ten_dot_ton_thuong_da, thoi_diem_xuat_hien,
        hoan_canh_xuat_hien, hoan_canh_xuat_hien_khac, ten_thuoc_dung_gan_thoi_diem_xuat_hien,
        thoi_gian_dung_thuoc_truoc_khi_xuat_hien, don_vi_thoi_gian, chi_tiet_dot_ton_thuong
      ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10)
      RETURNING *`,
      [
        hs.ma_benh_nhan,
        maHoSoMan,
        String(epName).trim(),
        data.thoi_diem_xuat_hien || data.started_at || data.occurred_at || new Date(),
        hoanCanh,
        hoanCanhKhac,
        data.ten_thuoc_dung_gan_thoi_diem_xuat_hien || data.medication_name || null,
        takenAgo,
        medUnit,
        data.chi_tiet_dot_ton_thuong || data.notes || data.description || null,
      ]
    );
    const row = res.rows[0];

    const meta = await prisma.lesionEpisodeMeta.upsert({
      where: { maDotTonThuong: BigInt(row.ma_dot_ton_thuong_da) },
      create: {
        maDotTonThuong: BigInt(row.ma_dot_ton_thuong_da),
        maHoSo: BigInt(hs.ma_ho_so),
        maBenhNhan: BigInt(hs.ma_benh_nhan),
        hasLesions: data.has_lesions !== undefined ? Boolean(data.has_lesions) : true,
        triggerCategory: hoanCanh,
        contextTags: data.context_tags !== undefined ? String(data.context_tags) : null,
        contextOther: data.context_other !== undefined ? String(data.context_other) : null,
        medicationTakenAgo: takenAgo !== null ? String(takenAgo) : null,
        medicationUnit: medUnit !== null ? String(medUnit) : null,
      },
      update: {
        hasLesions: data.has_lesions !== undefined ? Boolean(data.has_lesions) : true,
        triggerCategory: hoanCanh,
        contextTags: data.context_tags !== undefined ? String(data.context_tags) : undefined,
        contextOther: data.context_other !== undefined ? String(data.context_other) : undefined,
      },
    }).catch(() => null);

    return this._formatEpisodeFull(row, meta, Number(hs.ma_ho_so));
  }

  async getLesionEpisodes(user, queryParams = {}) {
    const recordId = queryParams.medical_record_id || queryParams.ma_ho_so;
    let patientId = queryParams.patient_id || queryParams.ma_benh_nhan;

    if (recordId) {
      const hs = await this._getRecordOrThrow(recordId, user);
      patientId = Number(hs.ma_benh_nhan);
    } else if (!isStaffRole(user) || !patientId) {
      patientId = await resolvePatientIdForUser(db, user);
    }
    if (!patientId) return [];
    patientId = await patientService.assertPatientAccess(user, patientId);

    const rowsRes = await db.query(
      `SELECT * FROM public.dottonthuongda WHERE ma_benh_nhan = $1 ORDER BY ma_dot_ton_thuong_da DESC`,
      [patientId]
    );

    const metas = await prisma.lesionEpisodeMeta
      .findMany({ where: { maBenhNhan: BigInt(patientId) } })
      .catch(() => []);
    const metaMap = new Map(metas.map((m) => [Number(m.maDotTonThuong), m]));

    let rows = rowsRes.rows.map((r) => ({ r, m: metaMap.get(Number(r.ma_dot_ton_thuong_da)) }));
    if (recordId) {
      const rid = parseInt(recordId, 10);
      rows = rows.filter(({ r, m }) => (m && Number(m.maHoSo) === rid) || Number(r.ma_ho_so_man) === rid);
    }

    return rows.map(({ r, m }) => {
      const rid = m?.maHoSo ? Number(m.maHoSo) : r.ma_ho_so_man ? Number(r.ma_ho_so_man) : null;
      return {
        episode_id: String(r.ma_dot_ton_thuong_da),
        medical_record_id: rid ? String(rid) : null,
        patient_id: String(r.ma_benh_nhan),
        name: r.ten_dot_ton_thuong_da || '',
        occurred_at: r.thoi_diem_xuat_hien ? new Date(r.thoi_diem_xuat_hien).toISOString() : null,
        description: r.chi_tiet_dot_ton_thuong || null,
        created_at: r.thoi_diem_tao ? new Date(r.thoi_diem_tao).toISOString() : null,
        updated_at: r.thoi_diem_cap_nhat ? new Date(r.thoi_diem_cap_nhat).toISOString() : null,
      };
    });
  }

  async getLesionEpisodesByRecord(user, recordId) {
    const hs = await this._getRecordOrThrow(recordId, user);
    const rid = Number(hs.ma_ho_so);
    const [rowsRes, metas] = await Promise.all([
      db.query(
        'SELECT * FROM public.dottonthuongda WHERE ma_benh_nhan = $1 ORDER BY ma_dot_ton_thuong_da DESC',
        [hs.ma_benh_nhan]
      ),
      prisma.lesionEpisodeMeta.findMany({ where: { maHoSo: BigInt(rid) } }).catch(() => []),
    ]);
    const metaMap = new Map(metas.map((m) => [Number(m.maDotTonThuong), m]));
    return rowsRes.rows
      .filter((r) => metaMap.has(Number(r.ma_dot_ton_thuong_da)) || Number(r.ma_ho_so_man) === rid)
      .map((r) => {
        const m = metaMap.get(Number(r.ma_dot_ton_thuong_da));
        return {
          id: String(r.ma_dot_ton_thuong_da),
          medical_record_id: String(rid),
          name: r.ten_dot_ton_thuong_da || '',
          occurred_at: r.thoi_diem_xuat_hien ? new Date(r.thoi_diem_xuat_hien).toISOString() : null,
          context_tags: m?.contextTags ?? r.hoan_canh_xuat_hien_khac ?? r.hoan_canh_xuat_hien ?? null,
          description: r.chi_tiet_dot_ton_thuong || null,
        };
      });
  }

  async updateLesionEpisode(user, episodeId, data = {}) {
    const eid = parseInt(episodeId, 10);
    const chk = await db.query('SELECT * FROM public.dottonthuongda WHERE ma_dot_ton_thuong_da = $1 LIMIT 1', [eid]);
    const existing = chk.rows[0];
    if (!existing) throw createAppError(`Không tìm thấy đợt tổn thương #${eid}`, 9992, 404);
    await patientService.assertPatientAccess(user, existing.ma_benh_nhan);

    const sets = [];
    const vals = [];
    let idx = 1;
    if (data.ten_dot_ton_thuong_da !== undefined || data.episode_name !== undefined || data.name !== undefined) {
      sets.push(`ten_dot_ton_thuong_da = $${idx++}`);
      vals.push(data.ten_dot_ton_thuong_da ?? data.episode_name ?? data.name);
    }
    if (data.occurred_at !== undefined || data.thoi_diem_xuat_hien !== undefined) {
      sets.push(`thoi_diem_xuat_hien = $${idx++}`);
      vals.push(data.occurred_at ?? data.thoi_diem_xuat_hien);
    }
    if (data.medication_name !== undefined || data.ten_thuoc_dung_gan_thoi_diem_xuat_hien !== undefined) {
      sets.push(`ten_thuoc_dung_gan_thoi_diem_xuat_hien = $${idx++}`);
      vals.push(data.medication_name ?? data.ten_thuoc_dung_gan_thoi_diem_xuat_hien);
    }
    if (data.medication_taken_ago !== undefined || data.thoi_gian_dung_thuoc_truoc_khi_xuat_hien !== undefined) {
      sets.push(`thoi_gian_dung_thuoc_truoc_khi_xuat_hien = $${idx++}`);
      vals.push(data.medication_taken_ago ?? data.thoi_gian_dung_thuoc_truoc_khi_xuat_hien);
    }
    if (data.medication_unit !== undefined || data.don_vi_thoi_gian !== undefined) {
      sets.push(`don_vi_thoi_gian = $${idx++}`);
      vals.push(data.medication_unit ?? data.don_vi_thoi_gian);
    }
    if (data.chi_tiet_dot_ton_thuong !== undefined || data.notes !== undefined || data.description !== undefined) {
      sets.push(`chi_tiet_dot_ton_thuong = $${idx++}`);
      vals.push(data.chi_tiet_dot_ton_thuong ?? data.notes ?? data.description);
    }
    if (data.hoan_canh_xuat_hien !== undefined) {
      const { hoanCanh, hoanCanhKhac } = this._normalizeCircumstance(data.hoan_canh_xuat_hien, data.hoan_canh_xuat_hien_khac);
      sets.push(`hoan_canh_xuat_hien = $${idx++}`);
      vals.push(hoanCanh);
      sets.push(`hoan_canh_xuat_hien_khac = $${idx++}`);
      vals.push(hoanCanhKhac);
    }

    let updated = existing;
    if (sets.length > 0) {
      vals.push(eid);
      const uRes = await db.query(
        `UPDATE public.dottonthuongda SET ${sets.join(', ')} WHERE ma_dot_ton_thuong_da = $${idx} RETURNING *`,
        vals
      );
      updated = uRes.rows[0];
    }

    const subData = {};
    if (data.ended_at !== undefined) subData.endedAt = data.ended_at ? new Date(data.ended_at) : null;
    if (data.has_lesions !== undefined) subData.hasLesions = Boolean(data.has_lesions);
    if (data.context_tags !== undefined) subData.contextTags = String(data.context_tags);
    if (data.context_other !== undefined) subData.contextOther = String(data.context_other);
    if (data.medication_taken_ago !== undefined) subData.medicationTakenAgo = String(data.medication_taken_ago);
    if (data.medication_unit !== undefined) subData.medicationUnit = String(data.medication_unit);
    if (Object.keys(subData).length > 0) {
      await prisma.lesionEpisodeMeta.updateMany({
        where: { maDotTonThuong: BigInt(eid) },
        data: subData,
      }).catch(() => null);
    }

    const meta = await prisma.lesionEpisodeMeta.findUnique({ where: { maDotTonThuong: BigInt(eid) } }).catch(() => null);
    return this._formatEpisodeFull(updated, meta);
  }

  async getLesionEpisodeById(user, episodeId) {
    const eid = parseInt(episodeId, 10);
    const res = await db.query('SELECT * FROM public.dottonthuongda WHERE ma_dot_ton_thuong_da = $1 LIMIT 1', [eid]);
    const row = res.rows[0];
    if (!row) throw createAppError(`Không tìm thấy đợt tổn thương #${eid}`, 9992, 404);
    await patientService.assertPatientAccess(user, row.ma_benh_nhan);
    const meta = await prisma.lesionEpisodeMeta.findUnique({ where: { maDotTonThuong: BigInt(eid) } }).catch(() => null);
    return this._formatEpisodeFull(row, meta);
  }

  async deleteLesionEpisode(user, episodeId) {
    const eid = parseInt(episodeId, 10);
    const res = await db.query('SELECT ma_benh_nhan FROM public.dottonthuongda WHERE ma_dot_ton_thuong_da = $1 LIMIT 1', [eid]);
    if (!res.rows[0]) throw createAppError(`Không tìm thấy đợt tổn thương #${eid}`, 9992, 404);
    await patientService.assertPatientAccess(user, res.rows[0].ma_benh_nhan);

    await db.query('DELETE FROM public.anhchuptonthuong WHERE ma_dot_ton_thuong_da = $1', [eid]);
    await db.query('DELETE FROM public.vitritonthuong WHERE ma_dot_ton_thuong_da = $1', [eid]);
    await db.query('DELETE FROM public.dottonthuongda WHERE ma_dot_ton_thuong_da = $1', [eid]);
    await prisma.lesionEpisodeMeta.deleteMany({ where: { maDotTonThuong: BigInt(eid) } }).catch(() => null);
    return {};
  }

  _formatLocation(r, meta = null) {
    return {
      lesion_location_id: String(r.ma_vi_tri_ton_thuong),
      episode_id: String(r.ma_dot_ton_thuong_da),
      body_part: r.vi_tri_co_the || '',
      occurred_at: r.thoi_diem_xuat_hien ? new Date(r.thoi_diem_xuat_hien).toISOString() : null,
      context_tags: meta?.contextTags ?? r.hoan_canh_xuat_hien_khac ?? r.hoan_canh_xuat_hien ?? null,
      context_other: meta?.contextOther ?? r.hoan_canh_xuat_hien_khac ?? null,
      medication_name: meta?.medicationName ?? r.ten_thuoc_lien_quan ?? null,
      medication_taken_ago: meta?.medicationTakenAgo ?? r.thoi_gian_dung_thuoc_truoc_khi_xuat_hien ?? null,
      medication_unit: meta?.medicationUnit ?? r.don_vi_thoi_gian ?? null,
      created_at: r.thoi_diem_tao ? new Date(r.thoi_diem_tao).toISOString() : null,
      updated_at: r.thoi_diem_cap_nhat ? new Date(r.thoi_diem_cap_nhat).toISOString() : null,
    };
  }

  async createLesionLocation(user, data = {}) {
    const eid = parseInt(data.episode_id || data.ma_dot_ton_thuong_da, 10);
    const epRes = await db.query('SELECT * FROM public.dottonthuongda WHERE ma_dot_ton_thuong_da = $1 LIMIT 1', [eid]);
    const ep = epRes.rows[0];
    if (!ep) throw createAppError(`Không tìm thấy đợt tổn thương #${eid}`, 9992, 404);
    await patientService.assertPatientAccess(user, ep.ma_benh_nhan);

    const bodyPart = String(data.vi_tri_co_the || data.body_part || '').trim();
    if (!bodyPart) {
      throw createAppError('Vị trí body_part không được để rỗng', 1002, 400);
    }
    const rawCtx = data.hoan_canh_xuat_hien;
    const ctxTagOther = !rawCtx && data.context_tags ? 'Khac' : rawCtx;
    const ctxOtherDetail =
      data.hoan_canh_xuat_hien_khac ||
      data.context_other ||
      (!rawCtx && data.context_tags ? String(data.context_tags) : null);
    const { hoanCanh, hoanCanhKhac } = this._normalizeCircumstance(ctxTagOther, ctxOtherDetail);

    const medName = data.ten_thuoc_lien_quan ?? data.medication_name ?? null;
    const takenAgo = data.thoi_gian_dung_thuoc_truoc_khi_xuat_hien ?? data.medication_taken_ago ?? null;
    const medUnit = data.don_vi_thoi_gian ?? data.medication_unit ?? null;

    const ins = await db.query(
      `INSERT INTO public.vitritonthuong (
        ma_dot_ton_thuong_da, vi_tri_co_the, thoi_diem_xuat_hien, ten_thuoc_lien_quan,
        thoi_gian_dung_thuoc_truoc_khi_xuat_hien, hoan_canh_xuat_hien, hoan_canh_xuat_hien_khac, don_vi_thoi_gian
      ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8)
      RETURNING *`,
      [
        eid,
        bodyPart,
        data.thoi_diem_xuat_hien || data.occurred_at || new Date(),
        medName,
        takenAgo,
        hoanCanh,
        hoanCanhKhac,
        medUnit,
      ]
    );
    const row = ins.rows[0];

    const meta = await prisma.lesionLocationMeta.upsert({
      where: { maViTriTonThuong: BigInt(row.ma_vi_tri_ton_thuong) },
      create: {
        maViTriTonThuong: BigInt(row.ma_vi_tri_ton_thuong),
        maDotTonThuong: BigInt(eid),
        bodyPart,
        contextTags: data.context_tags !== undefined ? String(data.context_tags) : null,
        contextOther: data.context_other !== undefined ? String(data.context_other) : null,
        medicationName: medName ? String(medName) : null,
        medicationTakenAgo: takenAgo ? String(takenAgo) : null,
        medicationUnit: medUnit ? String(medUnit) : null,
        lesionType: data.lesion_type || null,
        itchScoreNrs: data.itch_score_nrs !== undefined ? parseInt(data.itch_score_nrs, 10) : null,
        painScoreNrs: data.pain_score_nrs !== undefined ? parseInt(data.pain_score_nrs, 10) : null,
        notes: data.notes || null,
      },
      update: { bodyPart },
    }).catch(() => null);

    return this._formatLocation(row, meta);
  }

  async getLesionLocations(user, queryParams = {}) {
    const eid = queryParams.episode_id || queryParams.ma_dot_ton_thuong_da;
    let rows = [];
    if (eid) {
      const epRes = await db.query('SELECT ma_benh_nhan FROM public.dottonthuongda WHERE ma_dot_ton_thuong_da = $1 LIMIT 1', [parseInt(eid, 10)]);
      if (!epRes.rows[0]) return [];
      await patientService.assertPatientAccess(user, epRes.rows[0].ma_benh_nhan);

      const res = await db.query(
        'SELECT * FROM public.vitritonthuong WHERE ma_dot_ton_thuong_da = $1 ORDER BY ma_vi_tri_ton_thuong DESC',
        [parseInt(eid, 10)]
      );
      rows = res.rows;
    } else {
      const params = [];
      let where = '';
      if (!isStaffRole(user)) {
        const pid = await resolvePatientIdForUser(db, user);
        if (!pid) return [];
        params.push(pid);
        where = 'WHERE d.ma_benh_nhan = $1';
      }
      const res = await db.query(
        `SELECT v.* FROM public.vitritonthuong v
         JOIN public.dottonthuongda d ON v.ma_dot_ton_thuong_da = d.ma_dot_ton_thuong_da
         ${where}
         ORDER BY v.ma_vi_tri_ton_thuong DESC
         LIMIT 100`,
        params
      );
      rows = res.rows;
    }

    const lids = rows.map((r) => BigInt(r.ma_vi_tri_ton_thuong));
    const metas = lids.length
      ? await prisma.lesionLocationMeta.findMany({ where: { maViTriTonThuong: { in: lids } } }).catch(() => [])
      : [];
    const metaMap = new Map(metas.map((m) => [Number(m.maViTriTonThuong), m]));
    return rows.map((r) => this._formatLocation(r, metaMap.get(Number(r.ma_vi_tri_ton_thuong))));
  }

  async updateLesionLocation(user, locationId, data = {}) {
    const lid = parseInt(locationId, 10);
    const res = await db.query(
      `SELECT v.*, d.ma_benh_nhan
       FROM public.vitritonthuong v
       JOIN public.dottonthuongda d ON v.ma_dot_ton_thuong_da = d.ma_dot_ton_thuong_da
       WHERE v.ma_vi_tri_ton_thuong = $1 LIMIT 1`,
      [lid]
    );
    if (!res.rows[0]) throw createAppError(`Không tìm thấy vị trí tổn thương #${lid}`, 9992, 404);
    await patientService.assertPatientAccess(user, res.rows[0].ma_benh_nhan);

    const bodyPart = data.vi_tri_co_the !== undefined ? data.vi_tri_co_the : data.body_part;
    const medName = data.ten_thuoc_lien_quan !== undefined ? data.ten_thuoc_lien_quan : data.medication_name;
    const takenAgo = data.thoi_gian_dung_thuoc_truoc_khi_xuat_hien !== undefined ? data.thoi_gian_dung_thuoc_truoc_khi_xuat_hien : data.medication_taken_ago;
    const medUnit = data.don_vi_thoi_gian !== undefined ? data.don_vi_thoi_gian : data.medication_unit;

    const sets = [];
    const vals = [];
    let idx = 1;
    const add = (col, val) => {
      if (val !== undefined) {
        sets.push(`${col} = $${idx++}`);
        vals.push(val);
      }
    };
    add('vi_tri_co_the', bodyPart);
    add('thoi_diem_xuat_hien', data.occurred_at ?? data.thoi_diem_xuat_hien);
    add('ten_thuoc_lien_quan', medName);
    add('thoi_gian_dung_thuoc_truoc_khi_xuat_hien', takenAgo);
    add('don_vi_thoi_gian', medUnit);

    let updatedRow = res.rows[0];
    if (sets.length > 0) {
      vals.push(lid);
      const upd = await db.query(
        `UPDATE public.vitritonthuong SET ${sets.join(', ')} WHERE ma_vi_tri_ton_thuong = $${idx} RETURNING *`,
        vals
      );
      updatedRow = upd.rows[0];
    }

    const subUpdate = {};
    if (bodyPart !== undefined) subUpdate.bodyPart = bodyPart;
    if (data.context_tags !== undefined) subUpdate.contextTags = String(data.context_tags);
    if (data.context_other !== undefined) subUpdate.contextOther = String(data.context_other);
    if (medName !== undefined) subUpdate.medicationName = medName;
    if (takenAgo !== undefined) subUpdate.medicationTakenAgo = takenAgo;
    if (medUnit !== undefined) subUpdate.medicationUnit = medUnit;
    if (data.notes !== undefined) subUpdate.notes = data.notes;
    if (Object.keys(subUpdate).length > 0) {
      await prisma.lesionLocationMeta.updateMany({ where: { maViTriTonThuong: BigInt(lid) }, data: subUpdate }).catch(() => null);
    }
    const meta = await prisma.lesionLocationMeta.findUnique({ where: { maViTriTonThuong: BigInt(lid) } }).catch(() => null);
    return this._formatLocation(updatedRow, meta);
  }

  async deleteLesionLocation(user, locationId) {
    const lid = parseInt(locationId, 10);
    const res = await db.query(
      `SELECT v.*, d.ma_benh_nhan
       FROM public.vitritonthuong v
       JOIN public.dottonthuongda d ON v.ma_dot_ton_thuong_da = d.ma_dot_ton_thuong_da
       WHERE v.ma_vi_tri_ton_thuong = $1 LIMIT 1`,
      [lid]
    );
    if (!res.rows[0]) throw createAppError(`Không tìm thấy vị trí tổn thương #${lid}`, 9992, 404);
    await patientService.assertPatientAccess(user, res.rows[0].ma_benh_nhan);

    await db.query('DELETE FROM public.anhchuptonthuong WHERE ma_vi_tri_ton_thuong = $1', [lid]);
    await db.query('DELETE FROM public.vitritonthuong WHERE ma_vi_tri_ton_thuong = $1', [lid]);
    await prisma.lesionLocationMeta.deleteMany({ where: { maViTriTonThuong: BigInt(lid) } }).catch(() => null);
    return {};
  }

  /**
   * Upload file ảnh thật lên Supabase Storage bucket (mayday-attachments)
   * và ghi đối chiếu vào tepdinhkem (Main DB) + anh_ton_thuong_mo_rong (Sub DB)
   */
  async uploadAttachmentToSupabase(user, file, body = {}) {
    if (!file || !file.buffer) {
      throw createAppError('Chưa chọn file ảnh upload', 1002, 400);
    }
    if (!isConfigured || !supabase) {
      throw createAppError('Supabase Storage chưa được cấu hình', 9999, 500);
    }

    const maHoSoRaw = body.medical_record_id || body.ma_ho_so;
    let maHoSo = 0;
    if (maHoSoRaw) {
      const hs = await this._getRecordOrThrow(maHoSoRaw, user);
      maHoSo = Number(hs.ma_ho_so);
    }

    const ext = path.extname(file.originalname || '').toLowerCase() || '.jpg';
    const randomName = `${Date.now()}_${crypto.randomBytes(6).toString('hex')}${ext}`;
    const folder = maHoSo > 0 ? `records/${maHoSo}` : `users/${user.ma_tai_khoan}`;
    const storagePath = `${folder}/${randomName}`;

    const { error: uploadErr } = await supabase.storage
      .from(bucketName)
      .upload(storagePath, file.buffer, {
        contentType: file.mimetype || 'image/jpeg',
        upsert: false,
      });

    if (uploadErr) {
      throw createAppError(`Lỗi upload lên Supabase Storage: ${uploadErr.message}`, 1007, 502);
    }

    const { data: pubData } = supabase.storage.from(bucketName).getPublicUrl(storagePath);
    const publicUrl = pubData?.publicUrl || '';
    const origName = file.originalname || randomName;
    const mime = file.mimetype || 'image/jpeg';
    const mediaType = body.media_type || (mime.startsWith('image/') ? 'image' : 'document');
    const category = body.category || body.purpose || body.phan_loai_muc_dich || null;
    const description = body.description || body.mo_ta_tep || body.notes || null;
    const questionId = body.question_id ? String(body.question_id) : null;

    let maTepDinhKem = null;
    if (maHoSo > 0) {
      const tepRes = await db.query(
        `INSERT INTO public.tepdinhkem (
          ma_ho_so, ma_tai_khoan, ten_tep_goc, duong_dan_luu_tru, duong_dan_url,
          dinh_dang_tep, loai_phuong_tien, dung_luong_byte, phan_loai_muc_dich, mo_ta_tep
        ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10)
        RETURNING *`,
        [
          maHoSo,
          user.ma_tai_khoan,
          origName,
          storagePath,
          publicUrl,
          mime,
          mediaType.toUpperCase(),
          file.size || file.buffer.length,
          category || 'LESION_PHOTO',
          description,
        ]
      );
      maTepDinhKem = Number(tepRes.rows[0].ma_tep_dinh_kem);
    }

    const anhSub = await prisma.anhTonThuongMoRong.create({
      data: {
        maHoSo: BigInt(maHoSo),
        maTaiKhoan: BigInt(user.ma_tai_khoan),
        maTepDinhKemGoc: maTepDinhKem ? BigInt(maTepDinhKem) : null,
        bucketName,
        storagePath,
        publicUrl,
        dinhDangTep: mime,
        dungLuongBytes: BigInt(file.size || file.buffer.length),
        questionId,
        mediaType,
        category,
        description,
        tenTepGoc: origName,
        toaDoX: body.toa_do_x !== undefined ? parseFloat(body.toa_do_x) : null,
        toaDoY: body.toa_do_y !== undefined ? parseFloat(body.toa_do_y) : null,
        vungCoThe: body.vung_co_the || body.body_part || null,
        ghiChuLamSang: body.ghi_chu_lam_sang || null,
        diemNguaNrs: body.diem_ngua_nrs !== undefined ? parseInt(body.diem_ngua_nrs, 10) : null,
        diemDauNrs: body.diem_dau_nrs !== undefined ? parseInt(body.diem_dau_nrs, 10) : null,
      },
    });

    const finalId = maTepDinhKem || anhSub.id;
    return {
      id: String(finalId),
      user_id: String(user.ma_tai_khoan),
      medical_record_id: maHoSo > 0 ? String(maHoSo) : null,
      question_id: questionId,
      file_path: storagePath,
      file_url: publicUrl,
      file_name: origName,
      file_type: mime,
      media_type: mediaType,
      category,
      description,
      created_at: anhSub.thoiDiemTao ? anhSub.thoiDiemTao.toISOString() : new Date().toISOString(),
    };
  }

  async uploadMultipleAttachments(user, files = [], body = {}) {
    if (!Array.isArray(files) || files.length === 0) {
      throw createAppError('Chưa chọn file ảnh upload', 1002, 400);
    }
    if (files.length > 10) {
      throw createAppError('Upload tối đa 10 ảnh 1 lần', 1008, 400);
    }
    const results = [];
    for (const f of files) {
      const uploaded = await this.uploadAttachmentToSupabase(user, f, body);
      results.push({ id: uploaded.id, file_url: uploaded.file_url });
    }
    return { total: String(results.length), data: results };
  }

  async listAttachments(user, queryParams = {}) {
    const rid = queryParams.medical_record_id || queryParams.ma_ho_so;
    const uid = queryParams.user_id || queryParams.ma_tai_khoan;
    let rows = [];
    if (rid) {
      const hs = await this._getRecordOrThrow(rid, user);
      rows = await prisma.anhTonThuongMoRong.findMany({
        where: { maHoSo: BigInt(hs.ma_ho_so) },
        orderBy: { thoiDiemTao: 'desc' },
      });
    } else if (uid) {
      const parsedUid = parseInt(uid, 10);
      if (Number.isNaN(parsedUid)) throw createAppError('user_id không hợp lệ', 1004, 400);
      const selfPid = await resolvePatientIdForUser(db, user);
      const isSelf =
        parsedUid === Number(user.ma_tai_khoan) ||
        (user.ma_nguoi && parsedUid === Number(user.ma_nguoi)) ||
        (selfPid && parsedUid === Number(selfPid));
      if (!isStaffRole(user) && !isSelf) {
        throw createAppError('Không có quyền xem tệp đính kèm của người dùng khác', 1009, 403);
      }
      const tkRes = await db.query(
        'SELECT ma_tai_khoan FROM public.taikhoan WHERE ma_tai_khoan = $1 OR ma_nguoi = $1',
        [parsedUid]
      );
      const tkIds = tkRes.rows.length > 0 ? tkRes.rows.map((r) => BigInt(r.ma_tai_khoan)) : [BigInt(parsedUid)];
      rows = await prisma.anhTonThuongMoRong.findMany({
        where: { maTaiKhoan: { in: tkIds } },
        orderBy: { thoiDiemTao: 'desc' },
        take: 100,
      });
    } else {
      rows = await prisma.anhTonThuongMoRong.findMany({
        where: isStaffRole(user) ? {} : { maTaiKhoan: BigInt(user.ma_tai_khoan) },
        orderBy: { thoiDiemTao: 'desc' },
        take: 100,
      });
    }

    return rows.map((r) => ({
      id: String(r.maTepDinhKemGoc ? Number(r.maTepDinhKemGoc) : r.id),
      medical_record_id: Number(r.maHoSo) > 0 ? String(Number(r.maHoSo)) : null,
      question_id: r.questionId || null,
      file_url: r.publicUrl,
      file_type: r.dinhDangTep || 'image/jpeg',
      created_at: r.thoiDiemTao ? r.thoiDiemTao.toISOString() : null,
    }));
  }

  async viewAttachmentBinary(attachmentId) {
    const id = parseInt(attachmentId, 10);
    if (Number.isNaN(id)) throw createAppError('ID tệp không hợp lệ', 1004, 400);

    let storagePath = null;
    let bucket = bucketName;
    let mimeType = 'image/jpeg';
    let publicUrl = null;

    const sub = await prisma.anhTonThuongMoRong.findFirst({
      where: { OR: [{ maTepDinhKemGoc: BigInt(id) }, { id }] },
    });
    if (sub) {
      storagePath = sub.storagePath;
      bucket = sub.bucketName || bucketName;
      mimeType = sub.dinhDangTep || 'image/jpeg';
      publicUrl = sub.publicUrl;
    } else {
      const tepRes = await db.query('SELECT * FROM public.tepdinhkem WHERE ma_tep_dinh_kem = $1 LIMIT 1', [id]);
      if (!tepRes.rows[0]) throw createAppError('Không tìm thấy ảnh đính kèm', 9992, 404);
      storagePath = tepRes.rows[0].duong_dan_luu_tru;
      mimeType = tepRes.rows[0].dinh_dang_tep || 'image/jpeg';
      publicUrl = tepRes.rows[0].duong_dan_url;
    }

    if (isConfigured && supabase && storagePath) {
      const { data: blobData, error } = await supabase.storage.from(bucket).download(storagePath);
      if (!error && blobData) {
        const ab = await blobData.arrayBuffer();
        return { buffer: Buffer.from(ab), mimeType };
      }
    }
    if (publicUrl && /^https?:\/\//i.test(publicUrl)) {
      const resp = await fetch(publicUrl);
      if (resp.ok) {
        const ab = await resp.arrayBuffer();
        return { buffer: Buffer.from(ab), mimeType: resp.headers.get('content-type') || mimeType };
      }
    }
    throw createAppError('Không tìm thấy ảnh đính kèm', 9992, 404);
  }

  async deleteAttachment(user, attachmentId) {
    const id = parseInt(attachmentId, 10);
    let sub = await prisma.anhTonThuongMoRong.findFirst({
      where: {
        OR: [{ maTepDinhKemGoc: BigInt(id) }, { id }],
      },
    });
    if (!sub) {
      const tepRes = await db.query('SELECT * FROM public.tepdinhkem WHERE ma_tep_dinh_kem = $1 LIMIT 1', [id]);
      if (!tepRes.rows[0]) throw createAppError(`Không tìm thấy tệp đính kèm #${id}`, 9992, 404);
      const t = tepRes.rows[0];
      if (!isStaffRole(user) && Number(t.ma_tai_khoan) !== Number(user.ma_tai_khoan)) {
        throw createAppError('Không có quyền xóa tệp đính kèm của người khác', 1009, 403);
      }
      if (isConfigured && supabase && t.duong_dan_luu_tru) {
        await supabase.storage.from(bucketName).remove([t.duong_dan_luu_tru]).catch(() => null);
      }
      await db.query('DELETE FROM public.anhchuptonthuong WHERE ma_tep_dinh_kem = $1', [id]);
      await db.query('DELETE FROM public.tepdinhkem WHERE ma_tep_dinh_kem = $1', [id]);
      return {};
    }

    if (!isStaffRole(user) && Number(sub.maTaiKhoan) !== Number(user.ma_tai_khoan)) {
      throw createAppError('Không có quyền xóa tệp đính kèm của người khác', 1009, 403);
    }

    if (isConfigured && supabase && sub.storagePath) {
      await supabase.storage.from(sub.bucketName || bucketName).remove([sub.storagePath]).catch(() => null);
    }

    if (sub.maTepDinhKemGoc) {
      const tepId = Number(sub.maTepDinhKemGoc);
      await db.query('DELETE FROM public.anhchuptonthuong WHERE ma_tep_dinh_kem = $1', [tepId]).catch(() => null);
      await db.query('DELETE FROM public.tepdinhkem WHERE ma_tep_dinh_kem = $1', [tepId]).catch(() => null);
    }
    await prisma.anhTonThuongMoRong.delete({ where: { id: sub.id } });
    return {};
  }

  _formatLesionPhoto(r, annotatedUrl = null) {
    return {
      photo_id: String(r.ma_anh),
      episode_id: r.ma_dot_ton_thuong_da ? String(r.ma_dot_ton_thuong_da) : null,
      location_id: r.ma_vi_tri_ton_thuong ? String(r.ma_vi_tri_ton_thuong) : null,
      attachment_id: String(r.ma_tep_dinh_kem),
      taken_at: r.thoi_diem_chup ? new Date(r.thoi_diem_chup).toISOString() : null,
      milestone: r.moc_tien_trien || null,
      itch_score: r.diem_ngua_nrs !== null && r.diem_ngua_nrs !== undefined ? String(r.diem_ngua_nrs) : null,
      pain_score: r.diem_dau_nrs !== null && r.diem_dau_nrs !== undefined ? String(r.diem_dau_nrs) : null,
      burn_score: r.diem_bong_rat_nrs !== null && r.diem_bong_rat_nrs !== undefined ? String(r.diem_bong_rat_nrs) : null,
      hives_count: r.so_luong_not_san !== null && r.so_luong_not_san !== undefined ? String(r.so_luong_not_san) : null,
      local_auas: r.chi_so_auas_cuc_bo !== null && r.chi_so_auas_cuc_bo !== undefined ? String(r.chi_so_auas_cuc_bo) : null,
      annotated_url: annotatedUrl ?? null,
      created_at: r.thoi_diem_tao ? new Date(r.thoi_diem_tao).toISOString() : null,
      updated_at: r.thoi_diem_cap_nhat ? new Date(r.thoi_diem_cap_nhat).toISOString() : null,
    };
  }

  async _resolveOrSyncTepDinhKemId(rawAttId, fallbackHoSo, user) {
    const aid = parseInt(rawAttId, 10);
    if (Number.isNaN(aid)) return null;
    const direct = await db.query('SELECT ma_tep_dinh_kem, duong_dan_url FROM public.tepdinhkem WHERE ma_tep_dinh_kem = $1 LIMIT 1', [aid]);
    if (direct.rows[0]) return { id: Number(direct.rows[0].ma_tep_dinh_kem), url: direct.rows[0].duong_dan_url };

    const sub = await prisma.anhTonThuongMoRong.findFirst({ where: { OR: [{ maTepDinhKemGoc: BigInt(aid) }, { id: aid }] } });
    if (!sub) return null;
    if (sub.maTepDinhKemGoc) return { id: Number(sub.maTepDinhKemGoc), url: sub.publicUrl };

    const targetHoSo = Number(sub.maHoSo) > 0 ? Number(sub.maHoSo) : fallbackHoSo;
    if (!targetHoSo) return null;
    const ins = await db.query(
      `INSERT INTO public.tepdinhkem (ma_ho_so, ma_tai_khoan, ten_tep_goc, duong_dan_luu_tru, duong_dan_url, dinh_dang_tep, dung_luong_byte)
       VALUES ($1, $2, $3, $4, $5, $6, $7) RETURNING ma_tep_dinh_kem`,
      [targetHoSo, Number(sub.maTaiKhoan || user.ma_tai_khoan), sub.tenTepGoc || 'image.jpg', sub.storagePath, sub.publicUrl, sub.dinhDangTep || 'image/jpeg', Number(sub.dungLuongBytes || 1024)]
    );
    const tepId = Number(ins.rows[0].ma_tep_dinh_kem);
    await prisma.anhTonThuongMoRong.update({ where: { id: sub.id }, data: { maTepDinhKemGoc: BigInt(tepId), maHoSo: BigInt(targetHoSo) } }).catch(() => null);
    return { id: tepId, url: sub.publicUrl };
  }

  async createLesionPhoto(user, data = {}) {
    let episodeId = data.episode_id || data.ma_dot_ton_thuong_da || null;
    const locationId = data.location_id || data.ma_vi_tri_ton_thuong || null;
    let maTepDinhKem = data.attachment_id || data.ma_tep_dinh_kem || null;
    let maHoSo = data.medical_record_id || data.ma_ho_so || null;

    if (locationId && !episodeId) {
      const locRes = await db.query('SELECT ma_dot_ton_thuong_da FROM public.vitritonthuong WHERE ma_vi_tri_ton_thuong = $1 LIMIT 1', [parseInt(locationId, 10)]);
      if (locRes.rows[0]) episodeId = Number(locRes.rows[0].ma_dot_ton_thuong_da);
    }

    if (episodeId) {
      const epRes = await db.query('SELECT ma_benh_nhan, ma_ho_so_man FROM public.dottonthuongda WHERE ma_dot_ton_thuong_da = $1 LIMIT 1', [parseInt(episodeId, 10)]);
      if (!epRes.rows[0]) throw createAppError(`Không tìm thấy đợt tổn thương #${episodeId}`, 9992, 404);
      await patientService.assertPatientAccess(user, epRes.rows[0].ma_benh_nhan);
      if (!maHoSo && epRes.rows[0].ma_ho_so_man) maHoSo = Number(epRes.rows[0].ma_ho_so_man);
      if (!maHoSo) {
        const epMeta = await prisma.lesionEpisodeMeta.findUnique({ where: { maDotTonThuong: BigInt(parseInt(episodeId, 10)) } }).catch(() => null);
        if (epMeta?.maHoSo) maHoSo = Number(epMeta.maHoSo);
      }
    }

    let resolvedUrl = null;
    if (maTepDinhKem) {
      const synced = await this._resolveOrSyncTepDinhKemId(maTepDinhKem, maHoSo, user);
      if (!synced) throw createAppError(`Không tìm thấy tệp đính kèm #${maTepDinhKem}`, 9992, 404);
      maTepDinhKem = synced.id;
      resolvedUrl = synced.url;
    } else if (maHoSo && (data.url || data.public_url || data.image_url || data.storage_path)) {
      const urlVal = data.public_url || data.url || data.image_url || '';
      const storagePath = data.storage_path || urlVal;
      const tepIns = await db.query(
        `INSERT INTO public.tepdinhkem (ma_ho_so, ma_tai_khoan, ten_tep_goc, duong_dan_luu_tru, duong_dan_url, dinh_dang_tep, dung_luong_byte)
         VALUES ($1, $2, $3, $4, $5, $6, $7) RETURNING ma_tep_dinh_kem`,
        [maHoSo, user.ma_tai_khoan, data.file_name || 'lesion.jpg', storagePath, urlVal, 'image/jpeg', 1024]
      );
      maTepDinhKem = Number(tepIns.rows[0].ma_tep_dinh_kem);
      resolvedUrl = urlVal;
    }

    if (!maTepDinhKem) {
      throw createAppError('Cần cung cấp attachment_id từ bước upload ảnh', 1002, 400);
    }

    const clamp010 = (v) => (v === undefined || v === null ? null : Math.min(10, Math.max(0, parseInt(v, 10) || 0)));
    const localAuasVal = data.local_auas !== undefined && data.local_auas !== null ? Number(data.local_auas) : null;

    const res = await db.query(
      `INSERT INTO public.anhchuptonthuong (
        ma_tep_dinh_kem, ma_dot_ton_thuong_da, ma_vi_tri_ton_thuong, thoi_diem_chup,
        moc_tien_trien, diem_ngua_nrs, diem_dau_nrs, diem_bong_rat_nrs, so_luong_not_san, chi_so_auas_cuc_bo, url_anh
      ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11)
      RETURNING *`,
      [
        maTepDinhKem,
        episodeId ? parseInt(episodeId, 10) : null,
        locationId ? parseInt(locationId, 10) : null,
        data.thoi_diem_chup || data.taken_at || data.captured_at || new Date(),
        data.moc_tien_trien || data.milestone || null,
        clamp010(data.diem_ngua_nrs ?? data.itch_score_nrs ?? data.itch_score),
        clamp010(data.diem_dau_nrs ?? data.pain_score_nrs ?? data.pain_score),
        clamp010(data.diem_bong_rat_nrs ?? data.burning_score_nrs ?? data.burn_score),
        (data.so_luong_not_san ?? data.hives_count) !== undefined && (data.so_luong_not_san ?? data.hives_count) !== null
          ? Math.max(0, parseInt(data.so_luong_not_san ?? data.hives_count, 10))
          : null,
        localAuasVal,
        data.url_anh || data.url || data.image_url || resolvedUrl || null,
      ]
    );

    const row = res.rows[0];
    const annotatedUrl = data.annotated_url || null;
    if (annotatedUrl !== null) {
      await prisma.lesionPhotoMeta.upsert({
        where: { maAnh: BigInt(row.ma_anh) },
        create: { maAnh: BigInt(row.ma_anh), annotatedUrl },
        update: { annotatedUrl },
      }).catch(() => null);
    }

    return this._formatLesionPhoto(row, annotatedUrl);
  }

  async updateLesionPhotoMilestone(user, photoId, data = {}) {
    const pid = parseInt(photoId, 10);
    const chk = await db.query(
      `SELECT a.*, d.ma_benh_nhan AS dot_benh_nhan, hs.ma_benh_nhan AS hoso_benh_nhan
       FROM public.anhchuptonthuong a
       JOIN public.tepdinhkem t ON a.ma_tep_dinh_kem = t.ma_tep_dinh_kem
       LEFT JOIN public.dottonthuongda d ON a.ma_dot_ton_thuong_da = d.ma_dot_ton_thuong_da
       LEFT JOIN public.hosobenhan hs ON t.ma_ho_so = hs.ma_ho_so
       WHERE a.ma_anh = $1 LIMIT 1`,
      [pid]
    );
    if (!chk.rows[0]) throw createAppError(`Không tìm thấy ảnh chụp tổn thương #${pid}`, 9992, 404);
    const ownerPid = chk.rows[0].hoso_benh_nhan || chk.rows[0].dot_benh_nhan;
    if (ownerPid) await patientService.assertPatientAccess(user, ownerPid);

    const clamp010 = (v) => (v === undefined || v === null ? null : Math.min(10, Math.max(0, parseInt(v, 10) || 0)));
    const sets = [];
    const params = [];
    const addSet = (col, val) => {
      params.push(val);
      sets.push(`${col} = $${params.length}`);
    };

    const milestone = data.moc_tien_trien ?? data.milestone;
    if (milestone !== undefined) addSet('moc_tien_trien', milestone);
    const itch = data.diem_ngua_nrs ?? data.itch_score_nrs ?? data.itch_score;
    if (itch !== undefined) addSet('diem_ngua_nrs', clamp010(itch));
    const pain = data.diem_dau_nrs ?? data.pain_score_nrs ?? data.pain_score;
    if (pain !== undefined) addSet('diem_dau_nrs', clamp010(pain));
    const burn = data.diem_bong_rat_nrs ?? data.burning_score_nrs ?? data.burn_score;
    if (burn !== undefined) addSet('diem_bong_rat_nrs', clamp010(burn));
    const hives = data.so_luong_not_san ?? data.hives_count;
    if (hives !== undefined) addSet('so_luong_not_san', hives === null ? null : Math.max(0, parseInt(hives, 10)));
    if (data.local_auas !== undefined) addSet('chi_so_auas_cuc_bo', data.local_auas === null ? null : Number(data.local_auas));

    let row = chk.rows[0];
    if (sets.length > 0) {
      params.push(pid);
      const upd = await db.query(
        `UPDATE public.anhchuptonthuong SET ${sets.join(', ')}, thoi_diem_cap_nhat = CURRENT_TIMESTAMP WHERE ma_anh = $${params.length} RETURNING *`,
        params
      );
      row = upd.rows[0];
    }

    if (data.annotated_url !== undefined) {
      await prisma.lesionPhotoMeta.upsert({
        where: { maAnh: BigInt(pid) },
        create: { maAnh: BigInt(pid), annotatedUrl: data.annotated_url },
        update: { annotatedUrl: data.annotated_url },
      }).catch(() => null);
    }
    const meta = await prisma.lesionPhotoMeta.findUnique({ where: { maAnh: BigInt(pid) } }).catch(() => null);
    return this._formatLesionPhoto(row, meta?.annotatedUrl ?? null);
  }

  async getLesionPhotos(user, queryParams = {}) {
    const eid = queryParams.episode_id || queryParams.ma_dot_ton_thuong_da;
    const lid = queryParams.location_id || queryParams.ma_vi_tri_ton_thuong;
    const rid = queryParams.medical_record_id || queryParams.ma_ho_so;

    const conditions = [];
    const params = [];

    if (eid) {
      params.push(parseInt(eid, 10));
      conditions.push(`a.ma_dot_ton_thuong_da = $${params.length}`);
    }
    if (lid) {
      params.push(parseInt(lid, 10));
      conditions.push(`a.ma_vi_tri_ton_thuong = $${params.length}`);
    }
    if (rid) {
      await this._getRecordOrThrow(rid, user);
      params.push(parseInt(rid, 10));
      conditions.push(`t.ma_ho_so = $${params.length}`);
    } else if (!isStaffRole(user)) {
      const pid = await resolvePatientIdForUser(db, user);
      if (!pid) return [];
      params.push(pid);
      conditions.push(`(d.ma_benh_nhan = $${params.length} OR hs.ma_benh_nhan = $${params.length})`);
    }

    const where = conditions.length > 0 ? `WHERE ${conditions.join(' AND ')}` : '';
    const res = await db.query(
      `SELECT a.*, t.ma_ho_so, t.duong_dan_url, t.ten_tep_goc
       FROM public.anhchuptonthuong a
       JOIN public.tepdinhkem t ON a.ma_tep_dinh_kem = t.ma_tep_dinh_kem
       LEFT JOIN public.dottonthuongda d ON a.ma_dot_ton_thuong_da = d.ma_dot_ton_thuong_da
       LEFT JOIN public.hosobenhan hs ON t.ma_ho_so = hs.ma_ho_so
       ${where}
       ORDER BY a.ma_anh DESC
       LIMIT 100`,
      params
    );

    const pids = res.rows.map((r) => BigInt(r.ma_anh));
    const metas = pids.length
      ? await prisma.lesionPhotoMeta.findMany({ where: { maAnh: { in: pids } } }).catch(() => [])
      : [];
    const metaMap = new Map(metas.map((m) => [Number(m.maAnh), m]));

    return res.rows.map((r) => {
      const base = this._formatLesionPhoto(r, metaMap.get(Number(r.ma_anh))?.annotatedUrl ?? null);
      return {
        ...base,
        attachment: {
          attachment_id: String(r.ma_tep_dinh_kem),
          file_url: r.duong_dan_url || r.url_anh || null,
        },
      };
    });
  }

  async deleteLesionPhoto(user, photoId) {
    const pid = parseInt(photoId, 10);
    const chk = await db.query(
      `SELECT a.*, t.ma_tai_khoan, hs.ma_benh_nhan
       FROM public.anhchuptonthuong a
       JOIN public.tepdinhkem t ON a.ma_tep_dinh_kem = t.ma_tep_dinh_kem
       JOIN public.hosobenhan hs ON t.ma_ho_so = hs.ma_ho_so
       WHERE a.ma_anh = $1 LIMIT 1`,
      [pid]
    );
    if (!chk.rows[0]) throw createAppError(`Không tìm thấy ảnh chụp tổn thương #${pid}`, 9992, 404);
    await patientService.assertPatientAccess(user, chk.rows[0].ma_benh_nhan);
    await db.query('DELETE FROM public.anhchuptonthuong WHERE ma_anh = $1', [pid]);
    await prisma.lesionPhotoMeta.deleteMany({ where: { maAnh: BigInt(pid) } }).catch(() => null);
    return {};
  }

  // Answer Images (Sub DB)
  async attachAnswerImage(user, data = {}) {
    let rid = data.medical_record_id || data.ma_ho_so ? parseInt(data.medical_record_id || data.ma_ho_so, 10) : NaN;
    let qid = data.question_id ? parseInt(data.question_id, 10) : NaN;
    const answerId = data.answer_id ? parseInt(data.answer_id, 10) : NaN;

    if (!Number.isNaN(answerId) && (Number.isNaN(rid) || Number.isNaN(qid))) {
      const ans = await prisma.medicalRecordAnswer.findUnique({ where: { id: answerId } });
      if (!ans) throw createAppError(`Không tìm thấy câu trả lời #${answerId}`, 9992, 404);
      rid = Number(ans.maHoSo);
      qid = ans.questionId;
    }

    if (Number.isNaN(rid) || Number.isNaN(qid)) {
      throw createAppError('Thiếu medical_record_id + question_id hoặc answer_id', 1002, 400);
    }
    await this._getRecordOrThrow(rid, user);

    let rawAid = data.attachment_id || data.ma_tep_dinh_kem;
    let aid = rawAid ? parseInt(rawAid, 10) : NaN;
    let publicUrl = data.public_url || data.image_url || data.url || null;

    if (!Number.isNaN(aid)) {
      const synced = await this._resolveOrSyncTepDinhKemId(aid, rid, user);
      if (synced) {
        aid = synced.id;
        if (!publicUrl) publicUrl = synced.url;
      }
    } else if (publicUrl) {
      const tepIns = await db.query(
        `INSERT INTO public.tepdinhkem (ma_ho_so, ma_tai_khoan, ten_tep_goc, duong_dan_luu_tru, duong_dan_url, dinh_dang_tep, dung_luong_byte)
         VALUES ($1, $2, $3, $4, $5, $6, $7) RETURNING ma_tep_dinh_kem`,
        [rid, user.ma_tai_khoan, data.file_name || 'answer-image.jpg', publicUrl, publicUrl, 'image/jpeg', 1024]
      );
      aid = Number(tepIns.rows[0].ma_tep_dinh_kem);
    }

    if (Number.isNaN(aid)) {
      throw createAppError('Thiếu attachment_id hoặc image_url', 1002, 400);
    }

    const optVal = data.option_value !== undefined ? (data.option_value !== null ? String(data.option_value) : null) : null;
    const created = await prisma.answerImage.upsert({
      where: { maHoSo_questionId_attachmentId: { maHoSo: BigInt(rid), questionId: qid, attachmentId: BigInt(aid) } },
      create: { maHoSo: BigInt(rid), questionId: qid, attachmentId: BigInt(aid), publicUrl, optionValue: optVal },
      update: { publicUrl, optionValue: optVal ?? undefined },
    });

    return {
      id: String(created.id),
      answer_id: !Number.isNaN(answerId) ? String(answerId) : String(created.questionId),
      attachment_id: String(created.attachmentId),
      option_value: created.optionValue ?? null,
      created_at: created.createdAt.toISOString(),
    };
  }

  async attachAnswerImagesBulk(user, data = {}) {
    const answerId = data.answer_id;
    const list = Array.isArray(data.attachments) ? data.attachments : [];
    if (!answerId || list.length === 0) {
      throw createAppError('Thiếu answer_id hoặc mảng attachments', 1002, 400);
    }
    const saved = [];
    for (const item of list) {
      const attId = typeof item === 'object' ? item.attachment_id : item;
      const optVal = typeof item === 'object' ? item.option_value : undefined;
      const res = await this.attachAnswerImage(user, { answer_id: answerId, attachment_id: attId, option_value: optVal });
      saved.push({
        id: res.id,
        answer_id: res.answer_id,
        attachment_id: parseInt(res.attachment_id, 10) || res.attachment_id,
      });
    }
    return { total: String(saved.length), data: saved };
  }

  async getAnswerImages(user, queryParams = {}) {
    let rid = queryParams.medical_record_id || queryParams.ma_ho_so ? parseInt(queryParams.medical_record_id || queryParams.ma_ho_so, 10) : NaN;
    let qid = queryParams.question_id ? parseInt(queryParams.question_id, 10) : NaN;
    const answerId = queryParams.answer_id ? parseInt(queryParams.answer_id, 10) : NaN;

    if (!Number.isNaN(answerId)) {
      const ans = await prisma.medicalRecordAnswer.findUnique({ where: { id: answerId } });
      if (!ans) throw createAppError(`Không tìm thấy câu trả lời #${answerId}`, 9992, 404);
      rid = Number(ans.maHoSo);
      qid = ans.questionId;
    }

    if (Number.isNaN(rid)) throw createAppError('Thiếu medical_record_id hoặc answer_id', 1002, 400);
    await this._getRecordOrThrow(rid, user);

    const where = { maHoSo: BigInt(rid) };
    if (!Number.isNaN(qid)) where.questionId = qid;
    const rows = await prisma.answerImage.findMany({ where, orderBy: { id: 'desc' } });

    const attIds = rows.map((r) => Number(r.attachmentId));
    const tepRes = attIds.length
      ? await db.query('SELECT ma_tep_dinh_kem, ten_tep_goc, duong_dan_url FROM public.tepdinhkem WHERE ma_tep_dinh_kem = ANY($1)', [attIds])
      : { rows: [] };
    const tepMap = new Map(tepRes.rows.map((t) => [Number(t.ma_tep_dinh_kem), t]));

    return rows.map((r) => {
      const t = tepMap.get(Number(r.attachmentId));
      return {
        id: String(r.id),
        option_value: r.optionValue ?? null,
        attachment: {
          attachment_id: String(r.attachmentId),
          file_url: r.publicUrl || t?.duong_dan_url || null,
          file_name: t?.ten_tep_goc || 'image.jpg',
        },
      };
    });
  }

  async deleteAnswerImage(user, answerImageId) {
    const id = parseInt(answerImageId, 10);
    const existing = await prisma.answerImage.findUnique({ where: { id } });
    if (!existing) throw createAppError(`Không tìm thấy liên kết ảnh #${id}`, 9992, 404);
    await this._getRecordOrThrow(Number(existing.maHoSo), user);
    await prisma.answerImage.delete({ where: { id } });
    return {};
  }
}

module.exports = new PatientFlowService();

