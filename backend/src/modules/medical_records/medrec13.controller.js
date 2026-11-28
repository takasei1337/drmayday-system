const medrec13Service = require('./medrec13.service');
const { sheetSuccess, errorResponse } = require('../../common/response');

class Medrec13Controller {
  /**
   * medrec13: Xem lịch sử bệnh án cũ của bệnh nhân
   * Route: GET /api/v1/medical_records/patients/:id/history
   */
  async getPatientHistory(req, res, next) {
    try {
      const data = await medrec13Service.getPatientMedicalHistory(req.params.id, req.user);
      return sheetSuccess(res, data, 'OK', 200);
    } catch (err) {
      if (typeof err.code === 'number') {
        return errorResponse(res, err.message, err.statusCode || 400, err.code);
      }
      next(err);
    }
  }
}

module.exports = new Medrec13Controller();

