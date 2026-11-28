const medrec03Service = require('./medrec03.service');
const { sheetSuccess, errorResponse } = require('../../common/response');

class Medrec03Controller {
  /**
   * medrec03: Khởi tạo một hồ sơ bệnh án mới
   * Route: POST /api/v1/medical_records/
   */
  async createMedicalRecord(req, res, next) {
    try {
      const data = await medrec03Service.createMedicalRecord(req.body, req.user);
      return sheetSuccess(res, data, 'Created successfully', 201);
    } catch (err) {
      if (typeof err.code === 'number') {
        return errorResponse(res, err.message, err.statusCode || 400, err.code);
      }
      next(err);
    }
  }
}

module.exports = new Medrec03Controller();

