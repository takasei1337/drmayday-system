const medrec01Service = require('./medrec01.service');

class Medrec01Controller {
  /**
   * medrec01: Lấy danh sách câu hỏi sàng lọc phân loại bệnh án
   * Route: GET /api/v1/medical_records/classify-questions
   */
  async getClassifyQuestions(req, res, next) {
    try {
      const data = await medrec01Service.getClassifyQuestions();
      return res.status(200).json({
        code: 1000,
        message: 'Lấy danh sách câu hỏi phân loại thành công',
        data,
      });
    } catch (err) {
      next(err);
    }
  }
}

module.exports = new Medrec01Controller();

