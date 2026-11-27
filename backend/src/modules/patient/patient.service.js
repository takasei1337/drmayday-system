const db = require('../../config/db');
const prisma = require('../../config/prisma');
const {
  createAppError,
  isValidVNPhone,
  isValid10DigitPhone,
  normalizeDbGender,
  normalizeCareer,
  isStaffRole,
  resolvePatientIdForUser,
} = require('./patient.helpers');

/**
 * MODULE QUẢN LÝ BỆNH NHÂN & HỒ SƠ CỐT LÕI (Slide 5: pat01-04, docpat01-02, rec01-05)
 * Đọc/ghi trực tiếp bảng public.* trên Main DB và metadata phụ trên Sub DB (Prisma).
 */
class PatientService {
  /**
   * pat01 / rec01: Lấy danh sách bệnh nhân (tương thích Frontend PatientListPage & Bruno)
   */
  async getBenhNhanList(limit = 50, offset = 0, search = '') {
    const cleanLimit = Math.min(Math.max(parseInt(limit, 10) || 50, 1), 200);
    const cleanOffset = Math.max(parseInt(offset, 10) || 0, 0);
    const cleanSearch = (search || '').trim();

    const params = [];
    let whereSql = '';
    if (cleanSearch) {
      params.push(`%${cleanSearch}%`);
      whereSql = `
        WHERE (
          ng.ho_ten ILIKE $1
          OR ng.so_dien_thoai ILIKE $1
          OR COALESCE(bn.ma_his, '') ILIKE $1
          OR CAST(bn.ma_benh_nhan AS TEXT) = $2
        )
      `;
      params.push(cleanSearch);
    }

    const pLimit = params.length + 1;
    const pOffset = params.length + 2;
    params.push(cleanLimit, cleanOffset);

    const query = `
      SELECT
        bn.ma_benh_nhan,
        bn.ma_his,
        bn.nghe_nghiep,
        bn.dan_toc,
        bn.bhyt_so_the,
        bn.bhyt_gia_tri_den,
        bn.nguoi_nha_ho_ten_dia_chi,
        bn.nguoi_nha_so_dien_thoai,
        ng.ma_nguoi,
        ng.ho_ten,
        ng.ngay_sinh,
        ng.gioi_tinh,
        ng.so_dien_thoai,
        ng.dia_chi_tinh_tp,
        ng.dia_chi_xa_phuong,
        ng.dia_chi_so_nha_thon_pho,
        tk.ma_tai_khoan,
        tk.ten_dang_nhap,
        (SELECT COUNT(*)::INT FROM public.hosobenhan hs WHERE hs.ma_benh_nhan = bn.ma_benh_nhan) AS so_ho_so
      FROM public.benhnhan bn
      JOIN public.nguoi ng ON bn.ma_benh_nhan = ng.ma_nguoi
      LEFT JOIN public.taikhoan tk ON ng.ma_nguoi = tk.ma_nguoi
      ${whereSql}
      ORDER BY bn.ma_benh_nhan DESC
      LIMIT $${pLimit} OFFSET $${pOffset}
    `;
    const result = await db.query(query, params);
    return result.rows.map((r) => ({
      ...r,
      ma_benh_nhan: Number(r.ma_benh_nhan),
      ma_nguoi: Number(r.ma_nguoi),
      ma_tai_khoan: r.ma_tai_khoan ? Number(r.ma_tai_khoan) : null,
      id: Number(r.ma_benh_nhan),
      full_name: r.ho_ten,
      phone: r.so_dien_thoai,
      gender: r.gioi_tinh,
      career: r.nghe_nghiep,
    }));
  }

  /**
   * docpat01: Danh sách bệnh nhân cho Bác sĩ (hỗ trợ phân trang, tìm kiếm, filter loại/trạng thái)
   */
  async getDoctorPatients({ page = 1, limit = 20, search = '', status = '', recordType = '' } = {}) {
    const cleanLimit = Math.min(Math.max(parseInt(limit, 10) || 20, 1), 100);
    const cleanPage = Math.max(parseInt(page, 10) || 1, 1);
    const offset = (cleanPage - 1) * cleanLimit;
    const cleanSearch = (search || '').trim();

    const conditions = [];
    const params = [];

    if (cleanSearch) {
      params.push(`%${cleanSearch}%`);
      const pLike = `$${params.length}`;
      params.push(cleanSearch);
      const pExact = `$${params.length}`;
      conditions.push(`(
        ng.ho_ten ILIKE ${pLike}
        OR ng.so_dien_thoai ILIKE ${pLike}
        OR COALESCE(bn.ma_his, '') ILIKE ${pLike}
        OR CAST(bn.ma_benh_nhan AS TEXT) = ${pExact}
      )`);
    }

    if (status) {
      params.push(status.trim());
      conditions.push(`EXISTS (SELECT 1 FROM public.hosobenhan h WHERE h.ma_benh_nhan = bn.ma_benh_nhan AND h.trang_thai = $${params.length})`);
    }

    if (recordType) {
      params.push(recordType.trim().toUpperCase());
      conditions.push(`EXISTS (SELECT 1 FROM public.hosobenhan h WHERE h.ma_benh_nhan = bn.ma_benh_nhan AND h.loai_benh_an = $${params.length})`);
    }

    const whereSql = conditions.length > 0 ? `WHERE ${conditions.join(' AND ')}` : '';

    const countRes = await db.query(
      `SELECT COUNT(*)::INT AS total
       FROM public.benhnhan bn
       JOIN public.nguoi ng ON bn.ma_benh_nhan = ng.ma_nguoi
       ${whereSql}`,
      params
    );

    const pLimit = params.length + 1;
    const pOffset = params.length + 2;
    const listRes = await db.query(
      `SELECT
         bn.ma_benh_nhan, bn.ma_his, bn.nghe_nghiep, bn.dan_toc, bn.bhyt_so_the,
         ng.ho_ten, ng.ngay_sinh, ng.gioi_tinh, ng.so_dien_thoai, ng.dia_chi_tinh_tp,
         tk.ma_tai_khoan,
         (SELECT COUNT(*)::INT FROM public.hosobenhan h WHERE h.ma_benh_nhan = bn.ma_benh_nhan) AS total_records,
         (SELECT h.ma_ho_so FROM public.hosobenhan h WHERE h.ma_benh_nhan = bn.ma_benh_nhan ORDER BY h.ma_ho_so DESC LIMIT 1) AS latest_record_id,
         (SELECT h.trang_thai FROM public.hosobenhan h WHERE h.ma_benh_nhan = bn.ma_benh_nhan ORDER BY h.ma_ho_so DESC LIMIT 1) AS latest_record_status,
         (SELECT h.loai_benh_an FROM public.hosobenhan h WHERE h.ma_benh_nhan = bn.ma_benh_nhan ORDER BY h.ma_ho_so DESC LIMIT 1) AS latest_record_type
       FROM public.benhnhan bn
       JOIN public.nguoi ng ON bn.ma_benh_nhan = ng.ma_nguoi
       LEFT JOIN public.taikhoan tk ON ng.ma_nguoi = tk.ma_nguoi
       ${whereSql}
       ORDER BY bn.ma_benh_nhan DESC
       LIMIT $${pLimit} OFFSET $${pOffset}`,
      [...params, cleanLimit, offset]
    );

    return {
      total: countRes.rows[0]?.total || 0,
      page: cleanPage,
      limit: cleanLimit,
      items: listRes.rows.map((r) => ({
        ...r,
        ma_benh_nhan: Number(r.ma_benh_nhan),
        ma_tai_khoan: r.ma_tai_khoan ? Number(r.ma_tai_khoan) : null,
        latest_record_id: r.latest_record_id ? Number(r.latest_record_id) : null,
      })),
    };
  }

  /**
   * Kiểm tra quyền truy cập dữ liệu của 1 bệnh nhân (Self-only với BENH_NHAN -> 3106)
   */
  async assertPatientAccess(user, targetPatientId) {
    const pid = parseInt(targetPatientId, 10);
    if (Number.isNaN(pid) || pid <= 0) {
      throw createAppError('Mã bệnh nhân không hợp lệ', 1004, 400);
    }
    if (isStaffRole(user)) return pid;

    const myPatientId = await resolvePatientIdForUser(db, user);
    const myAccountId = user?.ma_tai_khoan ? Number(user.ma_tai_khoan) : null;
    if (!myPatientId) {
      throw createAppError('Không có quyền truy cập hồ sơ của bệnh nhân khác', 1009, 403);
    }
    if (pid === myPatientId || (myAccountId && pid === myAccountId)) {
      return myPatientId;
    }
    throw createAppError('Không có quyền truy cập hồ sơ của bệnh nhân khác', 1009, 403);
  }

  /**
   * pat02 / docpat02: Chi tiết 1 bệnh nhân (Main DB + Sub DB + danh sách hồ sơ tóm tắt)
   */
  async getBenhNhanById(patientId, includeRecords = false) {
    const pid = parseInt(patientId, 10);
    if (Number.isNaN(pid) || pid <= 0) {
      throw createAppError('Mã bệnh nhân không hợp lệ', 1004, 400);
    }

    const res = await db.query(
      `SELECT
         bn.ma_benh_nhan, bn.ma_his, bn.nghe_nghiep, bn.dan_toc, bn.bhyt_so_the,
         bn.bhyt_gia_tri_den, bn.nguoi_nha_ho_ten_dia_chi, bn.nguoi_nha_so_dien_thoai,
         ng.ma_nguoi, ng.ho_ten, ng.ngay_sinh, ng.gioi_tinh, ng.so_dien_thoai,
         ng.dia_chi_tinh_tp, ng.dia_chi_xa_phuong, ng.dia_chi_so_nha_thon_pho,
         tk.ma_tai_khoan, tk.ten_dang_nhap, tk.trang_thai_hoat_dong
       FROM public.benhnhan bn
       JOIN public.nguoi ng ON bn.ma_benh_nhan = ng.ma_nguoi
       LEFT JOIN public.taikhoan tk ON ng.ma_nguoi = tk.ma_nguoi
       WHERE bn.ma_benh_nhan = $1
       LIMIT 1`,
      [pid]
    );
    const row = res.rows[0];
    if (!row) {
      throw createAppError(`Không tìm thấy bệnh nhân #${pid}`, 9992, 404);
    }

    let extra = null;
    try {
      extra = await prisma.patientExtraProfile.findUnique({
        where: { maNguoi: BigInt(row.ma_nguoi) },
      });
    } catch {}

    const base = {
      ...row,
      ma_benh_nhan: Number(row.ma_benh_nhan),
      ma_nguoi: Number(row.ma_nguoi),
      ma_tai_khoan: row.ma_tai_khoan ? Number(row.ma_tai_khoan) : null,
      id: Number(row.ma_benh_nhan),
      full_name: row.ho_ten,
      phone: row.so_dien_thoai,
      gender: extra?.genderRaw || row.gioi_tinh,
      year_of_birth: extra?.yearOfBirth || (row.ngay_sinh ? new Date(row.ngay_sinh).getFullYear() : null),
      address: row.dia_chi_tinh_tp,
      career: row.nghe_nghiep,
      ethnicity: row.dan_toc,
      health_insurance_number: row.bhyt_so_the,
      health_insurance_validate: extra?.healthInsuranceValidate || row.bhyt_gia_tri_den || null,
      medical_history: extra?.medicalHistory || null,
      allergy_history: extra?.allergyHistory || null,
      next_of_kin_name: row.nguoi_nha_ho_ten_dia_chi,
      next_of_kin_phone: row.nguoi_nha_so_dien_thoai,
    };

    if (includeRecords) {
      base.medical_records = await this.getHoSoBenhAnByPatientId(pid);
    }

    return base;
  }

  /**
   * pat03: Cập nhật thông tin bệnh nhân theo ID
   */
  async updateBenhNhanById(patientId, data = {}) {
    const existing = await this.getBenhNhanById(patientId, false);
    const pid = existing.ma_benh_nhan;

    const fullName = data.full_name !== undefined ? data.full_name : data.ho_ten;
    const phone = data.phone !== undefined ? data.phone : data.so_dien_thoai;
    const genderInput = data.gender !== undefined ? data.gender : data.gioi_tinh;
    const genderInfo = genderInput !== undefined ? normalizeDbGender(genderInput) : { provided: false };

    let yearOfBirth;
    if (data.year_of_birth !== undefined) {
      if (data.year_of_birth === null || data.year_of_birth === '') {
        yearOfBirth = null;
      } else {
        const yob = parseInt(data.year_of_birth, 10);
        const currentYear = new Date().getFullYear();
        if (Number.isNaN(yob) || yob < 1900 || yob > currentYear) {
          throw createAppError(`Năm sinh không hợp lệ (1900-${currentYear})`, 1004, 400);
        }
        yearOfBirth = yob;
      }
    }

    const ngaySinhInput = data.ngay_sinh !== undefined ? data.ngay_sinh : data.date_of_birth;
    const ngaySinh =
      ngaySinhInput !== undefined
        ? ngaySinhInput
        : yearOfBirth
        ? `${yearOfBirth}-01-01`
        : undefined;

    if (phone !== undefined && phone !== null && String(phone).trim() !== '') {
      const cleanPhone = String(phone).trim();
      if (!isValidVNPhone(cleanPhone)) {
        throw createAppError('Số điện thoại không đúng chuẩn VN (03/05/07/08/09)', 1004, 400);
      }
    }

    const nextOfKinPhone =
      data.next_of_kin_phone !== undefined ? data.next_of_kin_phone : data.nguoi_nha_so_dien_thoai;
    if (nextOfKinPhone !== undefined && nextOfKinPhone !== null && String(nextOfKinPhone).trim() !== '') {
      if (!isValid10DigitPhone(String(nextOfKinPhone))) {
        throw createAppError('Số điện thoại người thân phải đúng 10 chữ số', 1004, 400);
      }
    }

    const careerInput = data.career !== undefined ? data.career : data.nghe_nghiep;
    const career = careerInput !== undefined ? normalizeCareer(careerInput) : undefined;
    const ethnicity = data.ethnicity !== undefined ? data.ethnicity : data.dan_toc;
    const bhyt =
      data.health_insurance_number !== undefined ? data.health_insurance_number : data.bhyt_so_the;
    const bhytValidate =
      data.bhyt_gia_tri_den !== undefined ? data.bhyt_gia_tri_den : data.health_insurance_validate;
    const maHis = data.ma_his;
    const nextOfKinName =
      data.nguoi_nha_ho_ten_dia_chi !== undefined
        ? data.nguoi_nha_ho_ten_dia_chi
        : data.next_of_kin_name !== undefined
        ? data.next_of_kin_name
        : data.nguoi_nha_ho_ten;
    const tinhTp =
      data.tinh_tp !== undefined
        ? data.tinh_tp
        : data.dia_chi_tinh_tp !== undefined
        ? data.dia_chi_tinh_tp
        : data.address;
    const xaPhuong = data.xa_phuong !== undefined ? data.xa_phuong : data.dia_chi_xa_phuong;
    const soNha =
      data.so_nha_thon_pho !== undefined ? data.so_nha_thon_pho : data.dia_chi_so_nha_thon_pho;

    const client = await db.pool.connect();
    try {
      await client.query('BEGIN');

      const nguoiSets = [];
      const nguoiVals = [];
      let pIdx = 1;
      const pushNguoi = (col, val) => {
        if (val !== undefined) {
          nguoiSets.push(`${col} = $${pIdx++}`);
          nguoiVals.push(val);
        }
      };
      pushNguoi('ho_ten', fullName !== undefined ? String(fullName).trim() : undefined);
      pushNguoi('so_dien_thoai', phone !== undefined && phone !== null ? String(phone).trim() : undefined);
      if (genderInfo.provided) pushNguoi('gioi_tinh', genderInfo.dbValue);
      pushNguoi('ngay_sinh', ngaySinh);
      pushNguoi('dia_chi_tinh_tp', tinhTp);
      pushNguoi('dia_chi_xa_phuong', xaPhuong);
      pushNguoi('dia_chi_so_nha_thon_pho', soNha);

      if (nguoiSets.length > 0) {
        nguoiVals.push(pid);
        await client.query(`UPDATE public.nguoi SET ${nguoiSets.join(', ')} WHERE ma_nguoi = $${pIdx}`, nguoiVals);
      }

      const bnSets = [];
      const bnVals = [];
      let bIdx = 1;
      const pushBn = (col, val) => {
        if (val !== undefined) {
          bnSets.push(`${col} = $${bIdx++}`);
          bnVals.push(val);
        }
      };
      pushBn('ma_his', maHis);
      pushBn('nghe_nghiep', career);
      pushBn('dan_toc', ethnicity);
      pushBn('bhyt_so_the', bhyt);
      pushBn('bhyt_gia_tri_den', bhytValidate && /^\d{4}-\d{2}-\d{2}/.test(String(bhytValidate)) ? String(bhytValidate).slice(0, 10) : undefined);
      pushBn('nguoi_nha_ho_ten_dia_chi', nextOfKinName);
      pushBn(
        'nguoi_nha_so_dien_thoai',
        nextOfKinPhone !== undefined && nextOfKinPhone !== null && String(nextOfKinPhone).trim() === ''
          ? null
          : nextOfKinPhone
      );

      if (bnSets.length > 0) {
        bnVals.push(pid);
        await client.query(`UPDATE public.benhnhan SET ${bnSets.join(', ')} WHERE ma_benh_nhan = $${bIdx}`, bnVals);
      }

      await client.query('COMMIT');
    } catch (err) {
      await client.query('ROLLBACK');
      throw err;
    } finally {
      client.release();
    }

    const extraUpdate = {};
    if (genderInfo.provided) extraUpdate.genderRaw = genderInfo.rawValue || null;
    if (yearOfBirth !== undefined) extraUpdate.yearOfBirth = yearOfBirth;
    if (data.health_insurance_validate !== undefined) extraUpdate.healthInsuranceValidate = data.health_insurance_validate;
    if (data.medical_history !== undefined) extraUpdate.medicalHistory = data.medical_history;
    if (data.allergy_history !== undefined) extraUpdate.allergyHistory = data.allergy_history;

    if (Object.keys(extraUpdate).length > 0) {
      try {
        await prisma.patientExtraProfile.upsert({
          where: { maNguoi: BigInt(pid) },
          create: { maNguoi: BigInt(pid), ...extraUpdate },
          update: extraUpdate,
        });
      } catch (subErr) {
        console.warn('[UpdateBenhNhan Warning] Sub DB error:', subErr.message);
      }
    }

    return this.getBenhNhanById(pid, false);
  }

  /**
   * pat04 / rec02: Lấy danh sách hồ sơ bệnh án của 1 bệnh nhân (sửa JOIN pk & ORDER BY)
   */
  async getHoSoBenhAnByPatientId(ma_benh_nhan) {
    const pid = parseInt(ma_benh_nhan, 10);
    const query = `
      SELECT
        hs.ma_ho_so,
        hs.ma_benh_nhan,
        hs.loai_benh_an,
        hs.trang_thai,
        hs.thoi_diem_kham_lan_dau,
        hs.ngay_bat_dau_dieu_tri_ngoai_tru,
        hs.ngay_ket_thuc_dieu_tri_ngoai_tru,
        hs.chan_doan_tuyen_truoc,
        hs.chan_doan_ban_dau_phong_kham,
        hs.ket_qua_dieu_tri_bao_hiem,
        hs.thoi_gian_khoi_phat_tuan,
        hs.tien_su_gia_dinh,
        hs.tien_su_gia_dinh_ghi_ro,
        hs.da_dieu_tri_truoc_kham,
        bn_cap.nhap_vien,
        bn_man.chan_doan_chinh,
        bn_man.phan_nhom_csu,
        (SELECT COUNT(*)::INT FROM public.phienkham pk WHERE pk.ma_ho_so = hs.ma_ho_so) AS so_phien_kham
      FROM public.hosobenhan hs
      LEFT JOIN public.benhanmaydaycap bn_cap ON hs.ma_ho_so = bn_cap.ma_ho_so
      LEFT JOIN public.benhanmaydayman bn_man ON hs.ma_ho_so = bn_man.ma_ho_so
      WHERE hs.ma_benh_nhan = $1
      ORDER BY hs.ma_ho_so DESC
    `;
    const result = await db.query(query, [pid]);

    let metas = [];
    try {
      metas = await prisma.medicalRecordMeta.findMany({
        where: { maBenhNhan: BigInt(pid) },
      });
    } catch {}
    const metaMap = new Map(metas.map((m) => [Number(m.maHoSo), m]));

    return result.rows.map((row) => {
      const m = metaMap.get(Number(row.ma_ho_so));
      return {
        ...row,
        ma_ho_so: Number(row.ma_ho_so),
        ma_benh_nhan: Number(row.ma_benh_nhan),
        thoi_gian_khoi_phat_tuan: row.thoi_gian_khoi_phat_tuan !== null ? Number(row.thoi_gian_khoi_phat_tuan) : null,
        id: Number(row.ma_ho_so),
        template_id: m?.templateId || (row.loai_benh_an === 'CAP' ? 1 : 2),
        record_subtype: m?.recordSubtype || (row.loai_benh_an === 'CAP' ? 'URTICARIA_ACUTE' : 'URTICARIA_CHRONIC_INIT'),
        ly_do_den_kham: m?.lyDoDenKham || null,
        trieu_chung_chinh: m?.trieuChungChinh || null,
        locked_at: m?.lockedAt || null,
        accepted_at: m?.acceptedAt || null,
        completed_at: m?.completedAt || null,
      };
    });
  }

  /**
   * rec03: Tạo hồ sơ bệnh án mới (bắt buộc insert subtype benhanmaydaycap/benhanmaydayman trong transaction!)
   */
  async createHoSoBenhAn(data, actorUser = null) {
    const maBenhNhan = data.ma_benh_nhan || data.patient_id;
    const rawType = (data.loai_benh_an || data.record_type || '').toUpperCase().trim();
    const recordSubtype = data.record_subtype || data.type || null;

    let loaiBenhAn = rawType;
    if (!loaiBenhAn && recordSubtype) {
      loaiBenhAn = recordSubtype.toUpperCase().includes('ACUTE') ? 'CAP' : 'MAN';
    }
    if (!['CAP', 'MAN'].includes(loaiBenhAn)) {
      throw createAppError('loai_benh_an phải là CAP hoặc MAN', 1004, 400);
    }

    const pid = parseInt(maBenhNhan, 10);
    if (Number.isNaN(pid) || pid <= 0) {
      throw createAppError('Mã bệnh nhân không hợp lệ', 1002, 400);
    }

    // Kiểm tra bệnh nhân tồn tại
    const patCheck = await db.query('SELECT ma_benh_nhan FROM public.benhnhan WHERE ma_benh_nhan = $1 LIMIT 1', [pid]);
    if (patCheck.rows.length === 0) {
      throw createAppError(`Không tìm thấy bệnh nhân #${pid}`, 9992, 404);
    }

    const allowedStatus = ['draft', 'pending', 'in_progress', 'completed', 'cancelled'];
    const trangThai = allowedStatus.includes(data.trang_thai) ? data.trang_thai : 'draft';
    const thoiGianKhoiPhatTuan =
      data.thoi_gian_khoi_phat_tuan !== undefined && data.thoi_gian_khoi_phat_tuan !== null
        ? Number(data.thoi_gian_khoi_phat_tuan)
        : null;

    const client = await db.pool.connect();
    let createdRow;
    try {
      await client.query('BEGIN');

      const insertQuery = `
        INSERT INTO public.hosobenhan (
          ma_benh_nhan,
          loai_benh_an,
          thoi_diem_kham_lan_dau,
          chan_doan_tuyen_truoc,
          chan_doan_ban_dau_phong_kham,
          thoi_gian_khoi_phat_tuan,
          trang_thai,
          tien_su_gia_dinh,
          tien_su_gia_dinh_ghi_ro,
          da_dieu_tri_truoc_kham
        )
        VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10)
        RETURNING *
      `;
      const hsRes = await client.query(insertQuery, [
        pid,
        loaiBenhAn,
        data.thoi_diem_kham_lan_dau || new Date(),
        data.chan_doan_tuyen_truoc || null,
        data.chan_doan_ban_dau_phong_kham || null,
        thoiGianKhoiPhatTuan,
        trangThai,
        ['Co', 'Khong', 'Khong ro'].includes(data.tien_su_gia_dinh) ? data.tien_su_gia_dinh : null,
        data.tien_su_gia_dinh_ghi_ro || null,
        data.da_dieu_tri_truoc_kham !== undefined ? Boolean(data.da_dieu_tri_truoc_kham) : null,
      ]);
      createdRow = hsRes.rows[0];

      // Bắt buộc insert vào bảng subtype tương ứng do DEFERRABLE INITIALLY DEFERRED FK!
      if (loaiBenhAn === 'CAP') {
        await client.query(
          `INSERT INTO public.benhanmaydaycap (ma_ho_so, nhap_vien, benh_phu)
           VALUES ($1, $2, $3)`,
          [createdRow.ma_ho_so, data.nhap_vien ?? null, data.benh_phu || null]
        );
      } else {
        await client.query(
          `INSERT INTO public.benhanmaydayman (ma_ho_so, chan_doan_chinh, phan_nhom_csu)
           VALUES ($1, $2, $3)`,
          [
            createdRow.ma_ho_so,
            ['CSU', 'CIndU', 'CSU + CIndU', 'Phu mach don thuan'].includes(data.chan_doan_chinh)
              ? data.chan_doan_chinh
              : null,
            ['CSU Type I', 'CSU Type IIb', 'Chong lap Type I + Type IIb', 'Khong xac dinh'].includes(data.phan_nhom_csu)
              ? data.phan_nhom_csu
              : null,
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

    const templateId =
      data.template_id ? parseInt(data.template_id, 10) : loaiBenhAn === 'CAP' ? 1 : 2;
    const finalSubtype =
      recordSubtype || (loaiBenhAn === 'CAP' ? 'URTICARIA_ACUTE' : 'URTICARIA_CHRONIC_INIT');

    try {
      await prisma.medicalRecordMeta.upsert({
        where: { maHoSo: BigInt(createdRow.ma_ho_so) },
        create: {
          maHoSo: BigInt(createdRow.ma_ho_so),
          maBenhNhan: BigInt(pid),
          templateId,
          recordSubtype: finalSubtype,
          screeningDecision: data.screening_decision || null,
          lyDoDenKham: data.ly_do_den_kham || null,
          trieuChungChinh: data.trieu_chung_chinh || null,
          thoiGianKhoiPhat: data.thoi_gian_khoi_phat || null,
          createdBy: actorUser?.ma_tai_khoan ? BigInt(actorUser.ma_tai_khoan) : null,
        },
        update: {
          templateId,
          recordSubtype: finalSubtype,
          lyDoDenKham: data.ly_do_den_kham || undefined,
          trieuChungChinh: data.trieu_chung_chinh || undefined,
        },
      });
    } catch (subErr) {
      console.warn('[CreateHoSo Warning] Lỗi lưu MedicalRecordMeta lên Sub DB:', subErr.message);
    }

    return {
      ...createdRow,
      ma_ho_so: Number(createdRow.ma_ho_so),
      ma_benh_nhan: Number(createdRow.ma_benh_nhan),
      id: Number(createdRow.ma_ho_so),
      template_id: templateId,
      record_subtype: finalSubtype,
      ly_do_den_kham: data.ly_do_den_kham || null,
      trieu_chung_chinh: data.trieu_chung_chinh || null,
    };
  }

  /**
   * rec04: Lấy danh sách phiên khám theo hồ sơ (sửa ORDER BY ngay_kham DESC, lan_kham_thu DESC)
   */
  async getPhienKhamList(ma_ho_so) {
    const rid = parseInt(ma_ho_so, 10);
    const query = `
      SELECT
        pk.ma_phien_kham,
        pk.ma_ho_so,
        pk.ma_bac_si,
        pk.ma_phong_kham,
        pk.loai_benh_an,
        pk.ngay_kham,
        pk.lan_kham_thu,
        pk.loai_phien_kham,
        pk.ngay_hen_tai_kham,
        pk.tom_tat_buoi_kham,
        pk.huong_xu_tri_lan_sau,
        pk.dan_do,
        ng_bs.ho_ten AS ten_bac_si,
        phk.ten_phong_kham
      FROM public.phienkham pk
      LEFT JOIN public.nhanvien nv ON pk.ma_bac_si = nv.ma_nhan_vien
      LEFT JOIN public.nguoi ng_bs ON nv.ma_nhan_vien = ng_bs.ma_nguoi
      LEFT JOIN public.phongkham phk ON pk.ma_phong_kham = phk.ma_phong_kham
      WHERE pk.ma_ho_so = $1
      ORDER BY pk.ngay_kham DESC, pk.lan_kham_thu DESC
    `;
    const result = await db.query(query, [rid]);
    return result.rows.map((r) => ({
      ...r,
      ma_phien_kham: Number(r.ma_phien_kham),
      ma_ho_so: Number(r.ma_ho_so),
      ma_bac_si: Number(r.ma_bac_si),
      ma_phong_kham: r.ma_phong_kham ? Number(r.ma_phong_kham) : null,
    }));
  }

  /**
   * rec05: Tạo phiên khám mới (insert phienkham + subtype phienkhamcap/phienkhamman trong transaction)
   */
  async createPhienKham(ma_ho_so, data = {}, actorUser = null) {
    const rid = parseInt(ma_ho_so, 10);
    const hsRes = await db.query('SELECT ma_ho_so, loai_benh_an FROM public.hosobenhan WHERE ma_ho_so = $1 LIMIT 1', [rid]);
    const hs = hsRes.rows[0];
    if (!hs) {
      throw createAppError(`Không tìm thấy hồ sơ bệnh án #${rid}`, 9992, 404);
    }

    // Xác định mã bác sĩ hợp lệ trong public.nhanvien
    let maBacSi = data.ma_bac_si || actorUser?.ma_nguoi;
    const nvCheck = maBacSi
      ? await db.query('SELECT ma_nhan_vien FROM public.nhanvien WHERE ma_nhan_vien = $1 LIMIT 1', [maBacSi])
      : { rows: [] };
    if (nvCheck.rows.length === 0) {
      const fallbackNv = await db.query('SELECT ma_nhan_vien FROM public.nhanvien ORDER BY ma_nhan_vien ASC LIMIT 1');
      if (fallbackNv.rows.length === 0) {
        throw createAppError('Chưa có nhân viên/bác sĩ nào trong bảng nhanvien để gán phiên khám', 1004, 400);
      }
      maBacSi = fallbackNv.rows[0].ma_nhan_vien;
    }

    const maxLanRes = await db.query(
      'SELECT COALESCE(MAX(lan_kham_thu), 0)::INT AS max_lan FROM public.phienkham WHERE ma_ho_so = $1',
      [rid]
    );
    const lanKhamThu = data.lan_kham_thu ? parseInt(data.lan_kham_thu, 10) : (maxLanRes.rows[0].max_lan + 1);
    const ngayKham = data.ngay_kham || new Date().toISOString().slice(0, 10);

    const client = await db.pool.connect();
    let createdSession;
    try {
      await client.query('BEGIN');

      const pkRes = await client.query(
        `INSERT INTO public.phienkham (
          ma_ho_so, ma_bac_si, ma_phong_kham, loai_benh_an, ngay_kham, lan_kham_thu,
          loai_phien_kham, ngay_hen_tai_kham, tom_tat_buoi_kham, huong_xu_tri_lan_sau, dan_do
        ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11)
        RETURNING *`,
        [
          rid,
          maBacSi,
          data.ma_phong_kham || null,
          hs.loai_benh_an,
          ngayKham,
          lanKhamThu,
          data.loai_phien_kham || (lanKhamThu === 1 ? 'KHAM_LAN_DAU' : 'TAI_KHAM'),
          data.ngay_hen_tai_kham || null,
          data.tom_tat_buoi_kham || null,
          data.huong_xu_tri_lan_sau || null,
          data.dan_do || null,
        ]
      );
      createdSession = pkRes.rows[0];

      if (hs.loai_benh_an === 'CAP') {
        await client.query(
          `INSERT INTO public.phienkhamcap (ma_phien_kham, trieu_chung_da, co_san_phu)
           VALUES ($1, $2, $3)`,
          [createdSession.ma_phien_kham, data.trieu_chung_da || null, data.co_san_phu ?? null]
        );
      } else {
        await client.query(
          `INSERT INTO public.phienkhamman (ma_phien_kham, hien_tai_co_san_phu, vi_tri_san_phu)
           VALUES ($1, $2, $3)`,
          [createdSession.ma_phien_kham, data.hien_tai_co_san_phu ?? null, data.vi_tri_san_phu || null]
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
      ...createdSession,
      ma_phien_kham: Number(createdSession.ma_phien_kham),
      ma_ho_so: Number(createdSession.ma_ho_so),
      ma_bac_si: Number(createdSession.ma_bac_si),
    };
  }
}

module.exports = new PatientService();
