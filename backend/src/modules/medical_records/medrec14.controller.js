const medrec14Service = require('./medrec14.service');
const { sheetSuccess, errorResponse } = require('../../common/response');

class Medrec14Controller {
  /**
   * medrec14: Admin xóa toàn bộ hồ sơ bệnh án
   * Route: DELETE /api/v1/medical_records/:id
   */
  async deleteMedicalRecord(req, res, next) {
    try {
      const data = await medrec14Service.deleteMedicalRecord(req.params.id);
      return sheetSuccess(res, data, 'Xóa bệnh án thành công', 200);
    } catch (err) {
      if (typeof err.code === 'number') {
        return errorResponse(res, err.message, err.statusCode || 400, err.code);
      }
      next(err);
    }
  }
}

module.exports = new Medrec14Controller();

