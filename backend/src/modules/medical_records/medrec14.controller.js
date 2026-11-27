const medrec14Service = require('./medrec14.service');
const { errorResponse } = require('../../common/response');

class Medrec14Controller {
  /**
   * medrec14: Admin xóa toàn bộ hồ sơ bệnh án
   * Route: DELETE /api/v1/medical_records/:id
   */
  async deleteMedicalRecord(req, res, next) {
    try {
      const data = await medrec14Service.deleteMedicalRecord(req.params.id);
      return res.status(200).json({
        code: 1000,
        message: 'Xóa bệnh án thành công',
        data,
      });
    } catch (err) {
      if (err.code) {
        return errorResponse(res, err.message, err.statusCode || 400, err.code);
      }
      next(err);
    }
  }
}

module.exports = new Medrec14Controller();

