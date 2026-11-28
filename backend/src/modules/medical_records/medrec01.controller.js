const medrec01Service = require('./medrec01.service');
const { sheetSuccess, errorResponse } = require('../../common/response');

class Medrec01Controller {
  /**
   * medrec01: Lấy danh sách câu hỏi sàng lọc phân loại bệnh án
   * Route: GET /api/v1/medical_records/classify-questions
   */
  async getClassifyQuestions(req, res, next) {
    try {
      const data = await medrec01Service.getClassifyQuestions();
      return sheetSuccess(res, data, 'Lấy danh sách câu hỏi phân loại thành công', 200);
    } catch (err) {
      next(err);
    }
  }
}

module.exports = new Medrec01Controller();

