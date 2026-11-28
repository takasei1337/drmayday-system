const medrec06Service = require('./medrec06.service');
const { sheetSuccess, errorResponse } = require('../../common/response');

class Medrec06Controller {
  /**
   * medrec06: Xem bản tóm tắt nhanh (Summary) của 1 bệnh án
   * Route: GET /api/v1/medical_records/:id/summary
   */
  async getMedicalRecordSummary(req, res, next) {
    try {
      const data = await medrec06Service.getMedicalRecordSummary(req.params.id, req.user);
      return sheetSuccess(res, data, 'OK', 200);
    } catch (err) {
      if (typeof err.code === 'number') {
        return errorResponse(res, err.message, err.statusCode || 400, err.code);
      }
      next(err);
    }
  }
}

module.exports = new Medrec06Controller();

