const medrec04Service = require('./medrec04.service');
const { errorResponse } = require('../../common/response');

class Medrec04Controller {
  /**
   * medrec04: Lấy danh sách toàn bộ hồ sơ bệnh án (Admin / Bác sĩ / Lễ tân)
   * Route: GET /api/v1/medical_records/all
   */
  async getAllMedicalRecords(req, res, next) {
    try {
      const data = await medrec04Service.getAllMedicalRecords(req.query);
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

module.exports = new Medrec04Controller();

