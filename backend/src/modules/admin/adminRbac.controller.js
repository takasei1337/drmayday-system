const adminRbacService = require('./adminRbac.service');
const { sheetSuccess, sheetError } = require('../../common/response');

function handleControllerError(err, res, next) {
  if (err && typeof err.code === 'number') {
    return sheetError(res, err.message, err.statusCode || 400, err.code);
  }
  return next(err);
}

class AdminRbacController {
  // 1. POST /admin/users
  async createUser(req, res, next) {
    try {
      const data = await adminRbacService.createUser(req.body || {});
      return sheetSuccess(res, data, 'Created successfully', 201);
    } catch (err) {
      return handleControllerError(err, res, next);
    }
  }

  // 2. GET /admin/users
  async listUsers(req, res, next) {
    try {
      const { data, total } = await adminRbacService.listUsers(req.query || {});
      return sheetSuccess(res, data, 'OK', 200, { total });
    } catch (err) {
      return handleControllerError(err, res, next);
    }
  }

  // 3. GET /admin/users/:id
  async getUserById(req, res, next) {
    try {
      const data = await adminRbacService.getUserById(req.params.id);
      return sheetSuccess(res, data, 'OK', 200);
    } catch (err) {
      return handleControllerError(err, res, next);
    }
  }

  // 4. PUT /admin/users/:id
  async updateUser(req, res, next) {
    try {
      const data = await adminRbacService.updateUser(req.params.id, req.body || {});
      return sheetSuccess(res, data, 'Cập nhật thành công', 200);
    } catch (err) {
      return handleControllerError(err, res, next);
    }
  }

  // 5. DELETE /admin/users/:id
  async deleteUser(req, res, next) {
    try {
      const data = await adminRbacService.deleteUser(req.params.id);
      return sheetSuccess(res, data, 'Xoá người dùng thành công', 200);
    } catch (err) {
      return handleControllerError(err, res, next);
    }
  }

  // 6. PUT /admin/users/:id/assign
  async assignStaff(req, res, next) {
    try {
      const data = await adminRbacService.assignStaff(req.params.id, req.body || {});
      return sheetSuccess(res, data, 'Phân công thành công', 200);
    } catch (err) {
      return handleControllerError(err, res, next);
    }
  }

  // 7. POST /roles
  async createRole(req, res, next) {
    try {
      const data = await adminRbacService.createRole(req.body || {});
      return sheetSuccess(res, data, 'Tạo vai trò thành công', 201);
    } catch (err) {
      return handleControllerError(err, res, next);
    }
  }

  // 8. GET /roles
  async listRoles(req, res, next) {
    try {
      const data = await adminRbacService.listRoles();
      return sheetSuccess(res, data, 'OK', 200);
    } catch (err) {
      return handleControllerError(err, res, next);
    }
  }

  // 9. POST /permissions
  async createPermission(req, res, next) {
    try {
      const data = await adminRbacService.createPermission(req.body || {});
      return sheetSuccess(res, data, 'Tạo quyền hạn thành công', 201);
    } catch (err) {
      return handleControllerError(err, res, next);
    }
  }

  // 10. GET /permissions
  async listPermissions(req, res, next) {
    try {
      const data = await adminRbacService.listPermissions();
      return sheetSuccess(res, data, 'OK', 200);
    } catch (err) {
      return handleControllerError(err, res, next);
    }
  }

  // 11. PUT /permissions/:id
  async updatePermission(req, res, next) {
    try {
      const data = await adminRbacService.updatePermission(req.params.id, req.body || {});
      return sheetSuccess(res, data, 'Cập nhật quyền hạn thành công', 200);
    } catch (err) {
      return handleControllerError(err, res, next);
    }
  }

  // 12. DELETE /permissions/:id
  async deletePermission(req, res, next) {
    try {
      const data = await adminRbacService.deletePermission(req.params.id);
      return sheetSuccess(res, data, 'Xóa thành công', 200);
    } catch (err) {
      return handleControllerError(err, res, next);
    }
  }

  // 13. POST /role_permissions
  async assignRolePermissions(req, res, next) {
    try {
      const data = await adminRbacService.assignRolePermissions(req.body || {}, req.user);
      return sheetSuccess(res, data, 'Gán quyền thành công', 200);
    } catch (err) {
      return handleControllerError(err, res, next);
    }
  }

  // 14. GET /role_permissions/:role_id
  async getRolePermissions(req, res, next) {
    try {
      const data = await adminRbacService.getRolePermissions(req.params.role_id);
      return sheetSuccess(res, data, 'OK', 200);
    } catch (err) {
      return handleControllerError(err, res, next);
    }
  }

  // 15. DELETE /role_permissions/:role_id/:permission_id
  async revokeRolePermission(req, res, next) {
    try {
      const data = await adminRbacService.revokeRolePermission(
        req.params.role_id,
        req.params.permission_id
      );
      return sheetSuccess(res, data, 'Thu hồi quyền thành công', 200);
    } catch (err) {
      return handleControllerError(err, res, next);
    }
  }
}

module.exports = new AdminRbacController();
