const medrec05Service = require('./medrec05.service');
const { sheetSuccess, errorResponse } = require('../../common/response');

class Medrec05Controller {
  /**
   * medrec05: Xem chi tiết tổng quan của 1 bệnh án cụ thể
   * Route: GET /api/v1/medical_records/:id
   */
  async getMedicalRecordById(req, res, next) {
    try {
      const data = await medrec05Service.getMedicalRecordById(req.params.id, req.user);
      return sheetSuccess(res, data, 'OK', 200);
    } catch (err) {
      if (typeof err.code === 'number') {
        return errorResponse(res, err.message, err.statusCode || 400, err.code);
      }
      next(err);
    }
  }
}

module.exports = new Medrec05Controller();

