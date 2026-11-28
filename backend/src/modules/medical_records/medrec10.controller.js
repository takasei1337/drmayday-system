const medrec10Service = require('./medrec10.service');
const { sheetSuccess, errorResponse } = require('../../common/response');

class Medrec10Controller {
  /**
   * medrec10: Cập nhật (Upsert) câu trả lời vào biểu mẫu bệnh án
   * Route: PUT /api/v1/medical_records/:id/answers
   */
  async updateMedicalRecordAnswers(req, res, next) {
    try {
      const data = await medrec10Service.updateMedicalRecordAnswers(req.params.id, req.body, req.user);
      return sheetSuccess(res, data, 'Cập nhật câu trả lời thành công', 200);
    } catch (err) {
      if (typeof err.code === 'number') {
        return errorResponse(res, err.message, err.statusCode || 400, err.code);
      }
      next(err);
    }
  }
}

module.exports = new Medrec10Controller();

