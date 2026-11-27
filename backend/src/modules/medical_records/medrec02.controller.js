const medrec02Service = require('./medrec02.service');
const { errorResponse } = require('../../common/response');

class Medrec02Controller {
  /**
   * medrec02: Phân loại bệnh án từ câu trả lời sàng lọc
   * Route: POST /api/v1/medical_records/classify
   */
  async classifyMedicalRecord(req, res, next) {
    try {
      const { answers } = req.body || {};
      const data = await medrec02Service.classifyMedicalRecord(answers);
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

module.exports = new Medrec02Controller();

