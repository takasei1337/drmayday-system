const clinicalService = require('./clinical.service');
const { successResponse, errorResponse } = require('../../common/response');

class ClinicalController {
  async getThuoc(req, res, next) {
    try {
      const data = await clinicalService.getThuocList();
      return successResponse(res, data, 'Lấy danh mục thuốc thành công');
    } catch (err) {
      next(err);
    }
  }

  async getDonThuoc(req, res, next) {
    try {
      const { ma_phien_kham } = req.params;
      const data = await clinicalService.getDonThuocByPhienKham(ma_phien_kham);
      return successResponse(res, data, `Lấy đơn thuốc của phiên khám ${ma_phien_kham} thành công`);
    } catch (err) {
      next(err);
    }
  }

  async getChuKyUAS7(req, res, next) {
    try {
      const { ma_benh_nhan } = req.params;
      const data = await clinicalService.getChuKyUAS7(ma_benh_nhan);
      return successResponse(res, data, 'Lấy chu kỳ theo dõi UAS7 thành công');
    } catch (err) {
      next(err);
    }
  }

  async logUAS7(req, res, next) {
    try {
      const { ma_chu_ky, ngay_ghi_nhan } = req.body;
      if (!ma_chu_ky || !ngay_ghi_nhan) {
        return errorResponse(res, 'Mã chu kỳ và ngày ghi nhận là bắt buộc', 400);
      }
      const data = await clinicalService.logUAS7Daily(req.body);
      return successResponse(res, data, 'Ghi nhận điểm UAS7 hằng ngày thành công', 201);
    } catch (err) {
      next(err);
    }
  }
}

module.exports = new ClinicalController();
