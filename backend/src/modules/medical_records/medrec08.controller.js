const medrec08Service = require('./medrec08.service');
const { sheetSuccess, errorResponse } = require('../../common/response');

class Medrec08Controller {
  /**
   * medrec08: Lấy danh sách câu trả lời chi tiết của bệnh án
   * Route: GET /api/v1/medical_records/:id/answers
   */
  async getMedicalRecordAnswers(req, res, next) {
    try {
      const data = await medrec08Service.getMedicalRecordAnswers(req.params.id, req.user);
      return sheetSuccess(res, data, 'OK', 200);
    } catch (err) {
      if (typeof err.code === 'number') {
        return errorResponse(res, err.message, err.statusCode || 400, err.code);
      }
      next(err);
    }
  }
}

module.exports = new Medrec08Controller();

