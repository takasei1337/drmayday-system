const medrec03Service = require('./medrec03.service');
const { errorResponse } = require('../../common/response');

class Medrec03Controller {
  /**
   * medrec03: Khởi tạo một hồ sơ bệnh án mới
   * Route: POST /api/v1/medical_records/
   */
  async createMedicalRecord(req, res, next) {
    try {
      const data = await medrec03Service.createMedicalRecord(req.body, req.user);
      return res.status(201).json({
        code: 1001,
        message: 'Created successfully',
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

module.exports = new Medrec03Controller();

