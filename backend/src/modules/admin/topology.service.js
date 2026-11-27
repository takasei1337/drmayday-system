const db = require('../../config/db');
const prisma = require('../../config/prisma');
const { createSheetError } = require('../../common/response');

/**
 * Parse and validate a positive integer ID from path, query, or body.
 */
function parsePositiveInt(value, fieldName = 'id') {
  if (typeof value === 'boolean' || value === null || value === undefined) {
    throw createSheetError(`${fieldName} không hợp lệ`, 1003, 400);
  }
  if (typeof value === 'string') {
    const trimmed = value.trim();
    if (!/^-?\d+$/.test(trimmed)) {
      throw createSheetError(`${fieldName} phải là số nguyên`, 1003, 400);
    }
    const num = Number(trimmed);
    if (!Number.isSafeInteger(num) || num <= 0) {
      throw createSheetError(`${fieldName} phải là số nguyên dương`, 1004, 400);
    }
    return num;
  }
  if (typeof value === 'number') {
    if (!Number.isInteger(value)) {
      throw createSheetError(`${fieldName} phải là số nguyên`, 1003, 400);
    }
    if (!Number.isSafeInteger(value) || value <= 0) {
      throw createSheetError(`${fieldName} phải là số nguyên dương`, 1004, 400);
    }
    return value;
  }
  throw createSheetError(`${fieldName} không đúng kiểu dữ liệu`, 1003, 400);
}

/**
 * Validate a required non-empty string parameter.
 */
function requireNonEmptyString(value, fieldName, maxLength = null) {
  if (value === undefined || value === null) {
    throw createSheetError(`Thiếu tham số bắt buộc: ${fieldName}`, 1002, 400);
  }
  if (typeof value !== 'string') {
    throw createSheetError(`${fieldName} phải là chuỗi ký tự`, 1003, 400);
  }
  const trimmed = value.trim();
  if (!trimmed) {
    throw createSheetError(`Tham số ${fieldName} không được để trống`, 1002, 400);
  }
  if (maxLength && trimmed.length > maxLength) {
    throw createSheetError(`${fieldName} vượt quá ${maxLength} ký tự`, 1004, 400);
  }
  return trimmed;
}

/**
 * Validate an optional non-empty string when present on PUT requests.
 */
function parseOptionalNonEmptyString(value, fieldName, maxLength = null) {
  if (value === undefined) return undefined;
  if (value === null || typeof value !== 'string') {
    throw createSheetError(`${fieldName} phải là chuỗi ký tự`, 1003, 400);
  }
  const trimmed = value.trim();
  if (!trimmed) {
    throw createSheetError(`${fieldName} không được để trống`, 1004, 400);
  }
  if (maxLength && trimmed.length > maxLength) {
    throw createSheetError(`${fieldName} vượt quá ${maxLength} ký tự`, 1004, 400);
  }
  return trimmed;
}

/**
 * Validate an optional nullable description field.
 */
function parseOptionalDescription(value) {
  if (value === undefined) return undefined;
  if (value === null) return null;
  if (typeof value !== 'string') {
    throw createSheetError('description phải là chuỗi ký tự', 1003, 400);
  }
  return value.trim();
}

function formatBranchDetail(row, meta) {
  const nowIso = new Date().toISOString();
  return {
    id: Number(row.ma_chi_nhanh),
    name: row.ten_chi_nhanh,
    address: row.dia_chi,
    phone: row.so_dien_thoai ?? '',
    created_at: meta?.createdAt ? meta.createdAt.toISOString() : nowIso,
    updated_at: meta?.updatedAt ? meta.updatedAt.toISOString() : nowIso,
  };
}

function formatDepartmentDetail(dept) {
  return {
    id: Number(dept.id),
    name: dept.departmentName,
    description: dept.description ?? null,
    branch_id: Number(dept.maChiNhanh),
    created_at: dept.createdAt.toISOString(),
    updated_at: dept.updatedAt.toISOString(),
  };
}

function formatRoomDetail(row, meta) {
  const nowIso = new Date().toISOString();
  const hasDept = meta?.departmentId !== null && meta?.departmentId !== undefined;
  return {
    id: Number(row.ma_phong_kham),
    name: row.ten_phong_kham,
    description: meta?.description ?? null,
    department_id: hasDept ? Number(meta.departmentId) : null,
    created_at: meta?.createdAt ? meta.createdAt.toISOString() : nowIso,
    updated_at: meta?.updatedAt ? meta.updatedAt.toISOString() : nowIso,
  };
}

class TopologyService {
  // =========================================================================
  // 1. BRANCHES (chinhanh + prisma.branchMeta)
  // =========================================================================

  async createBranch(body = {}) {
    const name = requireNonEmptyString(body.name, 'name', 150);
    const address = requireNonEmptyString(body.address, 'address');
    const phone = requireNonEmptyString(body.phone, 'phone', 20);

    let row;
    try {
      const insertRes = await db.query(
        `
          INSERT INTO public.chinhanh (ten_chi_nhanh, dia_chi, so_dien_thoai, trang_thai)
          VALUES ($1, $2, $3, TRUE)
          RETURNING ma_chi_nhanh, ten_chi_nhanh, dia_chi, so_dien_thoai, trang_thai
        `,
        [name, address, phone]
      );
      row = insertRes.rows[0];
    } catch (err) {
      if (err.code === '23505') {
        throw createSheetError('Chi nhánh đã tồn tại', 9996, 409);
      }
      throw err;
    }

    try {
      const meta = await prisma.branchMeta.upsert({
        where: { maChiNhanh: BigInt(row.ma_chi_nhanh) },
        create: { maChiNhanh: BigInt(row.ma_chi_nhanh) },
        update: { updatedAt: new Date() },
      });
      return formatBranchDetail(row, meta);
    } catch (err) {
      // Compensate Main DB row if Sub DB metadata write fails
      await db.query('DELETE FROM public.chinhanh WHERE ma_chi_nhanh = $1', [row.ma_chi_nhanh]).catch(() => {});
      throw err;
    }
  }

  async listBranches() {
    const result = await db.query(
      `
        SELECT ma_chi_nhanh, ten_chi_nhanh, dia_chi, so_dien_thoai, trang_thai
        FROM public.chinhanh
        ORDER BY ma_chi_nhanh ASC
      `
    );

    const rows = result.rows;
    if (rows.length === 0) return [];

    const metas = await prisma.branchMeta.findMany({
      where: {
        maChiNhanh: { in: rows.map((r) => BigInt(r.ma_chi_nhanh)) },
      },
    });
    const metaMap = new Map(metas.map((m) => [String(m.maChiNhanh), m]));
    const nowIso = new Date().toISOString();

    return rows.map((row) => {
      const meta = metaMap.get(String(row.ma_chi_nhanh));
      return {
        id: String(row.ma_chi_nhanh),
        name: row.ten_chi_nhanh,
        address: row.dia_chi,
        phone: row.so_dien_thoai ?? '',
        is_active: row.trang_thai ? '1' : '0',
        created_at: meta?.createdAt ? meta.createdAt.toISOString() : nowIso,
        updated_at: meta?.updatedAt ? meta.updatedAt.toISOString() : nowIso,
      };
    });
  }

  async getBranchById(rawId) {
    const branchId = parsePositiveInt(rawId, 'id');
    const result = await db.query(
      `
        SELECT ma_chi_nhanh, ten_chi_nhanh, dia_chi, so_dien_thoai, trang_thai
        FROM public.chinhanh
        WHERE ma_chi_nhanh = $1
      `,
      [branchId]
    );

    if (result.rows.length === 0) {
      throw createSheetError('Không tìm thấy chi nhánh', 9992, 404);
    }

    const meta = await prisma.branchMeta.findUnique({
      where: { maChiNhanh: BigInt(branchId) },
    });

    return formatBranchDetail(result.rows[0], meta);
  }

  async updateBranch(rawId, body = {}) {
    const branchId = parsePositiveInt(rawId, 'id');
    const name = parseOptionalNonEmptyString(body.name, 'name', 150);
    const address = parseOptionalNonEmptyString(body.address, 'address');
    const phone = parseOptionalNonEmptyString(body.phone, 'phone', 20);

    const existingRes = await db.query(
      `
        SELECT ma_chi_nhanh, ten_chi_nhanh, dia_chi, so_dien_thoai, trang_thai
        FROM public.chinhanh
        WHERE ma_chi_nhanh = $1
      `,
      [branchId]
    );
    if (existingRes.rows.length === 0) {
      throw createSheetError('Không tìm thấy chi nhánh', 9992, 404);
    }

    const existing = existingRes.rows[0];
    const nextName = name !== undefined ? name : existing.ten_chi_nhanh;
    const nextAddress = address !== undefined ? address : existing.dia_chi;
    const nextPhone = phone !== undefined ? phone : existing.so_dien_thoai;

    const updatedRes = await db.query(
      `
        UPDATE public.chinhanh
        SET ten_chi_nhanh = $1, dia_chi = $2, so_dien_thoai = $3
        WHERE ma_chi_nhanh = $4
        RETURNING ma_chi_nhanh, ten_chi_nhanh, dia_chi, so_dien_thoai, trang_thai
      `,
      [nextName, nextAddress, nextPhone, branchId]
    );

    const meta = await prisma.branchMeta.upsert({
      where: { maChiNhanh: BigInt(branchId) },
      create: { maChiNhanh: BigInt(branchId) },
      update: { updatedAt: new Date() },
    });

    return formatBranchDetail(updatedRes.rows[0], meta);
  }

  async deleteBranch(rawId) {
    const branchId = parsePositiveInt(rawId, 'id');

    const existingRes = await db.query(
      'SELECT ma_chi_nhanh FROM public.chinhanh WHERE ma_chi_nhanh = $1',
      [branchId]
    );
    if (existingRes.rows.length === 0) {
      throw createSheetError('Không tìm thấy chi nhánh', 9992, 404);
    }

    const [deptCount, roomRes, staffRes] = await Promise.all([
      prisma.department.count({ where: { maChiNhanh: BigInt(branchId) } }),
      db.query('SELECT COUNT(*)::int AS cnt FROM public.phongkham WHERE ma_chi_nhanh = $1', [branchId]),
      db.query('SELECT COUNT(*)::int AS cnt FROM public.nhanvien WHERE ma_chi_nhanh = $1', [branchId]),
    ]);

    if (deptCount > 0 || roomRes.rows[0].cnt > 0 || staffRes.rows[0].cnt > 0) {
      throw createSheetError('Chi nhánh đang có khoa/phòng/nhân viên trực thuộc', 1010, 409);
    }

    try {
      await db.query('DELETE FROM public.chinhanh WHERE ma_chi_nhanh = $1', [branchId]);
    } catch (err) {
      if (err.code === '23503') {
        throw createSheetError('Chi nhánh đang có khoa/phòng/nhân viên trực thuộc', 1010, 409);
      }
      throw err;
    }

    await prisma.branchMeta.deleteMany({
      where: { maChiNhanh: BigInt(branchId) },
    });

    return {};
  }

  // =========================================================================
  // 2. DEPARTMENTS (prisma.department)
  // =========================================================================

  async createDepartment(body = {}) {
    const name = requireNonEmptyString(body.name, 'name');
    if (body.branch_id === undefined || body.branch_id === null || body.branch_id === '') {
      throw createSheetError('Thiếu tham số bắt buộc: branch_id', 1002, 400);
    }
    const branchId = parsePositiveInt(body.branch_id, 'branch_id');
    const description = parseOptionalDescription(body.description);

    const branchRes = await db.query(
      'SELECT ma_chi_nhanh FROM public.chinhanh WHERE ma_chi_nhanh = $1',
      [branchId]
    );
    if (branchRes.rows.length === 0) {
      throw createSheetError('Chi nhánh không tồn tại', 9992, 404);
    }

    const rand = Math.random().toString(36).substring(2, 8).toUpperCase();
    const departmentCode = `DEPT_${Date.now()}_${rand}`;

    const dept = await prisma.department.create({
      data: {
        maChiNhanh: BigInt(branchId),
        departmentCode,
        departmentName: name,
        description: description !== undefined ? description : null,
      },
    });

    return {
      id: String(dept.id),
      name: dept.departmentName,
      branch_id: String(dept.maChiNhanh),
      description: dept.description ?? null,
      created_at: dept.createdAt.toISOString(),
    };
  }

  async listDepartments(query = {}) {
    const where = {};
    if (query.branch_id !== undefined && query.branch_id !== '') {
      const branchId = parsePositiveInt(query.branch_id, 'branch_id');
      where.maChiNhanh = BigInt(branchId);
    }

    const depts = await prisma.department.findMany({
      where,
      orderBy: { id: 'asc' },
    });

    return depts.map((d) => ({
      id: String(d.id),
      name: d.departmentName,
      branch_id: String(d.maChiNhanh),
      description: d.description ?? null,
    }));
  }

  async getDepartmentById(rawId) {
    const deptId = parsePositiveInt(rawId, 'id');
    const dept = await prisma.department.findUnique({
      where: { id: deptId },
    });
    if (!dept) {
      throw createSheetError('Không tìm thấy khoa/phòng ban', 9992, 404);
    }

    return formatDepartmentDetail(dept);
  }

  async updateDepartment(rawId, body = {}) {
    const deptId = parsePositiveInt(rawId, 'id');
    const existing = await prisma.department.findUnique({
      where: { id: deptId },
    });
    if (!existing) {
      throw createSheetError('Không tìm thấy khoa/phòng ban', 9992, 404);
    }

    const name = parseOptionalNonEmptyString(body.name, 'name');
    const description = parseOptionalDescription(body.description);

    const updateData = {};
    if (name !== undefined) updateData.departmentName = name;
    if (description !== undefined) updateData.description = description;

    if (body.branch_id !== undefined) {
      const newBranchId = parsePositiveInt(body.branch_id, 'branch_id');
      if (BigInt(newBranchId) !== existing.maChiNhanh) {
        const branchRes = await db.query(
          'SELECT ma_chi_nhanh FROM public.chinhanh WHERE ma_chi_nhanh = $1',
          [newBranchId]
        );
        if (branchRes.rows.length === 0) {
          throw createSheetError('Chi nhánh không tồn tại', 9992, 404);
        }
        updateData.maChiNhanh = BigInt(newBranchId);
      }
    }

    const updated = await prisma.department.update({
      where: { id: deptId },
      data: updateData,
    });

    return formatDepartmentDetail(updated);
  }

  async deleteDepartment(rawId) {
    const deptId = parsePositiveInt(rawId, 'id');
    const existing = await prisma.department.findUnique({
      where: { id: deptId },
    });
    if (!existing) {
      throw createSheetError('Không tìm thấy khoa/phòng ban', 9992, 404);
    }

    await prisma.$transaction(async (tx) => {
      await tx.roomMeta.updateMany({
        where: { departmentId: deptId },
        data: { departmentId: null },
      });
      await tx.staffAssignmentMeta.updateMany({
        where: { departmentId: deptId },
        data: { departmentId: null },
      });
      await tx.department.delete({
        where: { id: deptId },
      });
    });

    return {};
  }

  // =========================================================================
  // 3. ROOMS (phongkham + prisma.roomMeta)
  // =========================================================================

  async createRoom(body = {}) {
    const name = requireNonEmptyString(body.name, 'name', 150);
    if (body.department_id === undefined || body.department_id === null || body.department_id === '') {
      throw createSheetError('Thiếu tham số bắt buộc: department_id', 1002, 400);
    }
    const deptId = parsePositiveInt(body.department_id, 'department_id');
    const description = parseOptionalDescription(body.description);

    const dept = await prisma.department.findUnique({
      where: { id: deptId },
    });
    if (!dept) {
      throw createSheetError('Khoa/phòng ban không tồn tại', 9992, 404);
    }

    const branchId = Number(dept.maChiNhanh);
    let row;
    try {
      const insertRes = await db.query(
        `
          INSERT INTO public.phongkham (ma_chi_nhanh, ten_phong_kham)
          VALUES ($1, $2)
          RETURNING ma_phong_kham, ma_chi_nhanh, ten_phong_kham
        `,
        [branchId, name]
      );
      row = insertRes.rows[0];
    } catch (err) {
      if (err.code === '23505') {
        throw createSheetError('Phòng khám đã tồn tại trong chi nhánh này', 9996, 409);
      }
      if (err.code === '23503') {
        throw createSheetError('Chi nhánh không tồn tại', 9992, 404);
      }
      throw err;
    }

    try {
      const meta = await prisma.roomMeta.upsert({
        where: { maPhongKham: BigInt(row.ma_phong_kham) },
        create: {
          maPhongKham: BigInt(row.ma_phong_kham),
          departmentId: deptId,
          description: description !== undefined ? description : null,
        },
        update: {
          departmentId: deptId,
          description: description !== undefined ? description : null,
        },
      });

      return {
        id: String(row.ma_phong_kham),
        name: row.ten_phong_kham,
        department_id: String(deptId),
        description: meta.description ?? null,
        created_at: meta.createdAt.toISOString(),
      };
    } catch (err) {
      // Compensate Main DB insert if Sub DB metadata write fails
      await db.query('DELETE FROM public.phongkham WHERE ma_phong_kham = $1', [row.ma_phong_kham]).catch(() => {});
      throw err;
    }
  }

  async listRooms(query = {}) {
    let deptIdFilter = null;
    if (query.department_id !== undefined && query.department_id !== '') {
      deptIdFilter = parsePositiveInt(query.department_id, 'department_id');
    }

    let branchIdFilter = null;
    if (query.branch_id !== undefined && query.branch_id !== '') {
      branchIdFilter = parsePositiveInt(query.branch_id, 'branch_id');
    }

    let sql = 'SELECT ma_phong_kham, ma_chi_nhanh, ten_phong_kham FROM public.phongkham';
    const params = [];
    if (branchIdFilter !== null) {
      sql += ' WHERE ma_chi_nhanh = $1';
      params.push(branchIdFilter);
    }
    sql += ' ORDER BY ma_phong_kham ASC';

    const result = await db.query(sql, params);
    const rows = result.rows;
    if (rows.length === 0) return [];

    const metas = await prisma.roomMeta.findMany({
      where: {
        maPhongKham: { in: rows.map((r) => BigInt(r.ma_phong_kham)) },
      },
    });
    const metaMap = new Map(metas.map((m) => [String(m.maPhongKham), m]));
    const nowIso = new Date().toISOString();

    const mapped = [];
    for (const row of rows) {
      const meta = metaMap.get(String(row.ma_phong_kham));
      const deptId = meta?.departmentId ?? null;
      if (deptIdFilter !== null && deptId !== deptIdFilter) {
        continue;
      }
      mapped.push({
        id: String(row.ma_phong_kham),
        name: row.ten_phong_kham,
        department_id: deptId !== null && deptId !== undefined ? String(deptId) : null,
        description: meta?.description ?? null,
        created_at: meta?.createdAt ? meta.createdAt.toISOString() : nowIso,
      });
    }
    return mapped;
  }

  async getRoomById(rawId) {
    const roomId = parsePositiveInt(rawId, 'id');
    const result = await db.query(
      `
        SELECT ma_phong_kham, ma_chi_nhanh, ten_phong_kham
        FROM public.phongkham
        WHERE ma_phong_kham = $1
      `,
      [roomId]
    );
    if (result.rows.length === 0) {
      throw createSheetError('Không tìm thấy phòng khám', 9992, 404);
    }

    const meta = await prisma.roomMeta.findUnique({
      where: { maPhongKham: BigInt(roomId) },
    });

    return formatRoomDetail(result.rows[0], meta);
  }

  async updateRoom(rawId, body = {}) {
    const roomId = parsePositiveInt(rawId, 'id');
    const existingRes = await db.query(
      `
        SELECT ma_phong_kham, ma_chi_nhanh, ten_phong_kham
        FROM public.phongkham
        WHERE ma_phong_kham = $1
      `,
      [roomId]
    );
    if (existingRes.rows.length === 0) {
      throw createSheetError('Không tìm thấy phòng khám', 9992, 404);
    }

    const existing = existingRes.rows[0];
    const existingMeta = await prisma.roomMeta.findUnique({
      where: { maPhongKham: BigInt(roomId) },
    });

    const name = parseOptionalNonEmptyString(body.name, 'name', 150);
    const description = parseOptionalDescription(body.description);

    let nextBranchId = Number(existing.ma_chi_nhanh);
    let nextDeptId = existingMeta?.departmentId ?? null;

    if (body.department_id !== undefined) {
      if (body.department_id === null) {
        nextDeptId = null;
      } else {
        const parsedDeptId = parsePositiveInt(body.department_id, 'department_id');
        if (parsedDeptId !== existingMeta?.departmentId) {
          const dept = await prisma.department.findUnique({
            where: { id: parsedDeptId },
          });
          if (!dept) {
            throw createSheetError('Khoa/phòng ban không tồn tại', 9992, 404);
          }
          nextBranchId = Number(dept.maChiNhanh);
        }
        nextDeptId = parsedDeptId;
      }
    }

    const nextName = name !== undefined ? name : existing.ten_phong_kham;
    const nextDescription = description !== undefined ? description : existingMeta?.description ?? null;

    let updatedRow;
    try {
      const updatedRes = await db.query(
        `
          UPDATE public.phongkham
          SET ten_phong_kham = $1, ma_chi_nhanh = $2
          WHERE ma_phong_kham = $3
          RETURNING ma_phong_kham, ma_chi_nhanh, ten_phong_kham
        `,
        [nextName, nextBranchId, roomId]
      );
      updatedRow = updatedRes.rows[0];
    } catch (err) {
      if (err.code === '23505') {
        throw createSheetError('Phòng khám đã tồn tại trong chi nhánh này', 9996, 409);
      }
      if (err.code === '23503') {
        throw createSheetError('Chi nhánh không tồn tại', 9992, 404);
      }
      throw err;
    }

    const meta = await prisma.roomMeta.upsert({
      where: { maPhongKham: BigInt(roomId) },
      create: {
        maPhongKham: BigInt(roomId),
        departmentId: nextDeptId,
        description: nextDescription,
      },
      update: {
        departmentId: nextDeptId,
        description: nextDescription,
      },
    });

    return formatRoomDetail(updatedRow, meta);
  }

  async deleteRoom(rawId) {
    const roomId = parsePositiveInt(rawId, 'id');
    const existingRes = await db.query(
      'SELECT ma_phong_kham FROM public.phongkham WHERE ma_phong_kham = $1',
      [roomId]
    );
    if (existingRes.rows.length === 0) {
      throw createSheetError('Không tìm thấy phòng khám', 9992, 404);
    }

    const [staffCount, sessionRes] = await Promise.all([
      prisma.staffAssignmentMeta.count({ where: { roomId: BigInt(roomId) } }),
      db.query('SELECT COUNT(*)::int AS cnt FROM public.phienkham WHERE ma_phong_kham = $1', [roomId]),
    ]);

    if (staffCount > 0) {
      throw createSheetError('Phòng khám đang có nhân sự công tác', 1010, 409);
    }
    if (sessionRes.rows[0].cnt > 0) {
      throw createSheetError('Phòng khám đang có phiên khám liên kết', 1010, 409);
    }

    try {
      await db.query('DELETE FROM public.phongkham WHERE ma_phong_kham = $1', [roomId]);
    } catch (err) {
      if (err.code === '23503') {
        throw createSheetError('Phòng khám đang được sử dụng', 1010, 409);
      }
      throw err;
    }

    await prisma.roomMeta.deleteMany({
      where: { maPhongKham: BigInt(roomId) },
    });

    return {};
  }
}

module.exports = new TopologyService();
