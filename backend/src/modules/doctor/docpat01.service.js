const db = require('../../config/db');

/**
 * Chuẩn hóa giới tính theo ràng buộc CSDL ('Nam', 'Nu')
 */
function normalizeGender(gender) {
  if (!gender || typeof gender !== 'string') return null;
  const g = gender.trim().toLowerCase();
  if (g === 'nam' || g === 'male' || g === 'm') return 'Nam';
  if (g === 'nu' || g === 'nữ' || g === 'female' || g === 'f') return 'Nu';
  return null;
}

class Docpat01Service {
  /**
   * docpat01: Bác sĩ tìm kiếm hồ sơ bệnh nhân
   * Căn cứ: Slide 5 (trang 6 & 7) & Sheet GET apidoctorpatientssearch
   */
  async searchPatients(params) {
    const { keyword, gender, min_year, max_year } = params;
    const page = Math.max(1, parseInt(params.page, 10) || 1);
    const limit = Math.max(1, parseInt(params.limit, 10) || 20);
    const offset = (page - 1) * limit;

    const conditions = [];
    const values = [];
    let paramIndex = 1;

    // 1. Tìm kiếm theo keyword (tên hoặc số điện thoại)
    if (keyword && keyword.trim()) {
      conditions.push(`(ng.ho_ten ILIKE $${paramIndex} OR ng.so_dien_thoai ILIKE $${paramIndex})`);
      values.push(`%${keyword.trim()}%`);
      paramIndex++;
    }

    // 2. Lọc theo giới tính
    const standardGender = normalizeGender(gender);
    if (standardGender) {
      conditions.push(`ng.gioi_tinh = $${paramIndex}`);
      values.push(standardGender);
      paramIndex++;
    }

    // 3. Lọc theo năm sinh
    const minYear = parseInt(min_year, 10) || null;
    const maxYear = parseInt(max_year, 10) || null;

    if (minYear && maxYear) {
      if (minYear === maxYear) {
        conditions.push(`EXTRACT(YEAR FROM ng.ngay_sinh) = $${paramIndex}`);
        values.push(minYear);
        paramIndex++;
      } else {
        const fromYear = Math.min(minYear, maxYear);
        const toYear = Math.max(minYear, maxYear);
        conditions.push(`EXTRACT(YEAR FROM ng.ngay_sinh) BETWEEN $${paramIndex} AND $${paramIndex + 1}`);
        values.push(fromYear, toYear);
        paramIndex += 2;
      }
    } else if (minYear || maxYear) {
      // Chỉ truyền 1 trong 2: tìm chính xác năm sinh đó theo quy định Slide 5
      const exactYear = minYear || maxYear;
      conditions.push(`EXTRACT(YEAR FROM ng.ngay_sinh) = $${paramIndex}`);
      values.push(exactYear);
      paramIndex++;
    }

    const whereClause = conditions.length > 0 ? `WHERE ${conditions.join(' AND ')}` : '';

    const query = `
      SELECT 
        bn.ma_benh_nhan,
        ng.ho_ten,
        ng.so_dien_thoai,
        ng.gioi_tinh,
        EXTRACT(YEAR FROM ng.ngay_sinh)::int AS year_of_birth,
        COUNT(*) OVER()::int AS total_records
      FROM public.benhnhan bn
      JOIN public.nguoi ng ON bn.ma_benh_nhan = ng.ma_nguoi
      ${whereClause}
      ORDER BY bn.ma_benh_nhan DESC
      LIMIT $${paramIndex} OFFSET $${paramIndex + 1}
    `;

    values.push(limit, offset);

    const result = await db.query(query, values);
    const rows = result.rows;
    const totalRecords = rows.length > 0 ? rows[0].total_records : 0;

    const patients = rows.map(r => ({
      user_id: Number(r.ma_benh_nhan),
      full_name: r.ho_ten,
      phone: r.so_dien_thoai,
      gender: r.gioi_tinh,
      year_of_birth: r.year_of_birth ? Number(r.year_of_birth) : null,
      total_records: String(totalRecords),
    }));

    return {
      patients,
      total_records: totalRecords,
    };
  }
}

module.exports = new Docpat01Service();

