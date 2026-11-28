const medrec04Service = require('./medrec04.service');
const { sheetSuccess, errorResponse } = require('../../common/response');

class Medrec04Controller {
  /**
   * medrec04: Lấy danh sách toàn bộ hồ sơ bệnh án (Admin / Bác sĩ / Lễ tân)
   * Route: GET /api/v1/medical_records/all
   */
  async getAllMedicalRecords(req, res, next) {
    try {
      const data = await medrec04Service.getAllMedicalRecords(req.query);
      return sheetSuccess(res, data, 'OK', 200);
    } catch (err) {
      if (typeof err.code === 'number') {
        return errorResponse(res, err.message, err.statusCode || 400, err.code);
      }
      next(err);
    }
  }
}

module.exports = new Medrec04Controller();

