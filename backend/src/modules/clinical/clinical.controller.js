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
      const maChuKy = req.body.ma_chu_ky;
      const ngay = req.body.ngay_cham_diem || req.body.ngay_ghi_nhan || req.body.score_date;
      if (!maChuKy || !ngay) {
        return errorResponse(res, 'Mã chu kỳ và ngày ghi nhận là bắt buộc', 400, 2001);
      }
      const data = await clinicalService.logUAS7Daily(req.body);
      return successResponse(res, data, 'Ghi nhận điểm UAS7 hằng ngày thành công', 201);
    } catch (err) {
      if (err.code) return errorResponse(res, err.message, err.statusCode || 400, err.code);
      next(err);
    }
  }
}

module.exports = new ClinicalController();
