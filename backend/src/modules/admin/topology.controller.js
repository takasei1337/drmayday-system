const topologyService = require('./topology.service');
const { sheetSuccess } = require('../../common/response');

class TopologyController {
  // =========================================================================
  // 1. BRANCHES
  // =========================================================================

  async createBranch(req, res, next) {
    try {
      const data = await topologyService.createBranch(req.body);
      return sheetSuccess(res, data, 'Tạo chi nhánh thành công', 201);
    } catch (err) {
      return next(err);
    }
  }

  async listBranches(req, res, next) {
    try {
      const data = await topologyService.listBranches();
      return sheetSuccess(res, data, 'Lấy danh sách chi nhánh thành công');
    } catch (err) {
      return next(err);
    }
  }

  async getBranchById(req, res, next) {
    try {
      const data = await topologyService.getBranchById(req.params.id);
      return sheetSuccess(res, data, 'Lấy chi tiết chi nhánh thành công');
    } catch (err) {
      return next(err);
    }
  }

  async updateBranch(req, res, next) {
    try {
      const data = await topologyService.updateBranch(req.params.id, req.body);
      return sheetSuccess(res, data, 'Cập nhật chi nhánh thành công');
    } catch (err) {
      return next(err);
    }
  }

  async deleteBranch(req, res, next) {
    try {
      const data = await topologyService.deleteBranch(req.params.id);
      return sheetSuccess(res, data, 'Xóa chi nhánh thành công');
    } catch (err) {
      return next(err);
    }
  }

  // =========================================================================
  // 2. DEPARTMENTS
  // =========================================================================

  async createDepartment(req, res, next) {
    try {
      const data = await topologyService.createDepartment(req.body);
      return sheetSuccess(res, data, 'Tạo chuyên khoa thành công', 201);
    } catch (err) {
      return next(err);
    }
  }

  async listDepartments(req, res, next) {
    try {
      const data = await topologyService.listDepartments(req.query);
      return sheetSuccess(res, data, 'Lấy danh sách chuyên khoa thành công');
    } catch (err) {
      return next(err);
    }
  }

  async getDepartmentById(req, res, next) {
    try {
      const data = await topologyService.getDepartmentById(req.params.id);
      return sheetSuccess(res, data, 'Lấy chi tiết chuyên khoa thành công');
    } catch (err) {
      return next(err);
    }
  }

  async updateDepartment(req, res, next) {
    try {
      const data = await topologyService.updateDepartment(req.params.id, req.body);
      return sheetSuccess(res, data, 'Cập nhật chuyên khoa thành công');
    } catch (err) {
      return next(err);
    }
  }

  async deleteDepartment(req, res, next) {
    try {
      const data = await topologyService.deleteDepartment(req.params.id);
      return sheetSuccess(res, data, 'Xóa chuyên khoa thành công');
    } catch (err) {
      return next(err);
    }
  }

  // =========================================================================
  // 3. ROOMS
  // =========================================================================

  async createRoom(req, res, next) {
    try {
      const data = await topologyService.createRoom(req.body);
      return sheetSuccess(res, data, 'Tạo phòng khám thành công', 201);
    } catch (err) {
      return next(err);
    }
  }

  async listRooms(req, res, next) {
    try {
      const data = await topologyService.listRooms(req.query);
      return sheetSuccess(res, data, 'Lấy danh sách phòng khám thành công');
    } catch (err) {
      return next(err);
    }
  }

  async getRoomById(req, res, next) {
    try {
      const data = await topologyService.getRoomById(req.params.id);
      return sheetSuccess(res, data, 'Lấy chi tiết phòng khám thành công');
    } catch (err) {
      return next(err);
    }
  }

  async updateRoom(req, res, next) {
    try {
      const data = await topologyService.updateRoom(req.params.id, req.body);
      return sheetSuccess(res, data, 'Cập nhật phòng khám thành công');
    } catch (err) {
      return next(err);
    }
  }

  async deleteRoom(req, res, next) {
    try {
      const data = await topologyService.deleteRoom(req.params.id);
      return sheetSuccess(res, data, 'Xóa phòng khám thành công');
    } catch (err) {
      return next(err);
    }
  }
}

module.exports = new TopologyController();
