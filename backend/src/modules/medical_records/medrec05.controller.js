const medrec05Service = require('./medrec05.service');
const { errorResponse } = require('../../common/response');

class Medrec05Controller {
  /**
   * medrec05: Xem chi tiết tổng quan của 1 bệnh án cụ thể
   * Route: GET /api/v1/medical_records/:id
   */
  async getMedicalRecordById(req, res, next) {
    try {
      const data = await medrec05Service.getMedicalRecordById(req.params.id, req.user);
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

module.exports = new Medrec05Controller();

