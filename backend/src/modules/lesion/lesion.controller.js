const lesionService = require('./lesion.service');
const { successResponse, errorResponse } = require('../../common/response');

class LesionController {
  async getViTri(req, res, next) {
    try {
      const data = await lesionService.getViTriTonThuongList();
      return successResponse(res, data, 'Lấy danh mục vị trí tổn thương thành công');
    } catch (err) {
      next(err);
    }
  }

  async getDotTonThuong(req, res, next) {
    try {
      const { ma_ho_so } = req.params;
      const data = await lesionService.getDotTonThuongByHoSo(ma_ho_so);
      return successResponse(res, data, 'Lấy danh sách đợt bùng phát tổn thương thành công');
    } catch (err) {
      next(err);
    }
  }

  async saveAnhMoRong(req, res, next) {
    try {
      const { ma_ho_so, ten_tep_goc, storage_path, public_url } = req.body;
      if (!ma_ho_so || !public_url) {
        return errorResponse(res, 'Mã hồ sơ và URL ảnh là bắt buộc', 400);
      }

      const payload = {
        ...req.body,
        ma_tai_khoan: req.user.ma_tai_khoan,
      };

      const data = await lesionService.saveAnhTonThuongMoRong(payload);
      return successResponse(res, data, 'Lưu ảnh tổn thương mở rộng vào Sub DB thành công', 201);
    } catch (err) {
      next(err);
    }
  }

  async getAnhMoRongByHoSo(req, res, next) {
    try {
      const { ma_ho_so } = req.params;
      const data = await lesionService.getAnhTonThuongMoRongByHoSo(ma_ho_so);
      return successResponse(res, data, `Lấy danh sách ảnh tổn thương mở rộng của hồ sơ ${ma_ho_so} thành công`);
    } catch (err) {
      next(err);
    }
  }
}

module.exports = new LesionController();
