const medrec08Service = require('./medrec08.service');
const { errorResponse } = require('../../common/response');

class Medrec08Controller {
  /**
   * medrec08: Lấy danh sách câu trả lời chi tiết của bệnh án
   * Route: GET /api/v1/medical_records/:id/answers
   */
  async getMedicalRecordAnswers(req, res, next) {
    try {
      const data = await medrec08Service.getMedicalRecordAnswers(req.params.id, req.user);
      return res.status(200).json({
        code: 1000,
        message: 'OK',
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

module.exports = new Medrec08Controller();

