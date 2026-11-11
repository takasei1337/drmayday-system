const adminService = require('./admin.service');
const { successResponse, errorResponse } = require('../../common/response');

class AdminController {
  async getChiNhanh(req, res, next) {
    try {
      const data = await adminService.getChiNhanhList();
      return successResponse(res, data, 'Lấy danh sách chi nhánh thành công');
    } catch (err) {
      next(err);
    }
  }

  async createChiNhanh(req, res, next) {
    try {
      const { ten_chi_nhanh, dia_chi, so_dien_thoai } = req.body;
      if (!ten_chi_nhanh) {
        return errorResponse(res, 'Tên chi nhánh là bắt buộc', 400);
      }
      const data = await adminService.createChiNhanh(req.body);
      return successResponse(res, data, 'Tạo chi nhánh thành công', 201);
    } catch (err) {
      next(err);
    }
  }

  async getPhongKham(req, res, next) {
    try {
      const { ma_chi_nhanh } = req.query;
      const data = await adminService.getPhongKhamList(ma_chi_nhanh);
      return successResponse(res, data, 'Lấy danh sách phòng khám thành công');
    } catch (err) {
      next(err);
    }
  }

  async getNhanVien(req, res, next) {
    try {
      const data = await adminService.getNhanVienList();
      return successResponse(res, data, 'Lấy danh sách nhân viên y tế thành công');
    } catch (err) {
      next(err);
    }
  }
}

module.exports = new AdminController();
