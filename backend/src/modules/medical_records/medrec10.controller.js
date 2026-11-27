const medrec10Service = require('./medrec10.service');
const { errorResponse } = require('../../common/response');

class Medrec10Controller {
  /**
   * medrec10: Cập nhật (Upsert) câu trả lời vào biểu mẫu bệnh án
   * Route: PUT /api/v1/medical_records/:id/answers
   */
  async updateMedicalRecordAnswers(req, res, next) {
    try {
      const data = await medrec10Service.updateMedicalRecordAnswers(req.params.id, req.body, req.user);
      return res.status(200).json({
        code: 1000,
        message: 'Cập nhật câu trả lời thành công',
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

module.exports = new Medrec10Controller();

