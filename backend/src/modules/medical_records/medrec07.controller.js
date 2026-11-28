const medrec07Service = require('./medrec07.service');
const { sheetSuccess, errorResponse } = require('../../common/response');

class Medrec07Controller {
  /**
   * medrec07: Bác sĩ tiếp nhận hồ sơ bệnh án
   * Route: POST /api/v1/medical_records/:id/accept
   */
  async acceptMedicalRecord(req, res, next) {
    try {
      const data = await medrec07Service.acceptMedicalRecord(req.params.id, req.user);
      return sheetSuccess(res, data, 'Tiếp nhận bệnh án thành công', 200);
    } catch (err) {
      if (typeof err.code === 'number') {
        return errorResponse(res, err.message, err.statusCode || 400, err.code);
      }
      next(err);
    }
  }
}

module.exports = new Medrec07Controller();

