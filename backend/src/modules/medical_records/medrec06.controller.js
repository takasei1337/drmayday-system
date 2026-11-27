const medrec06Service = require('./medrec06.service');
const { errorResponse } = require('../../common/response');

class Medrec06Controller {
  /**
   * medrec06: Xem bản tóm tắt nhanh (Summary) của 1 bệnh án
   * Route: GET /api/v1/medical_records/:id/summary
   */
  async getMedicalRecordSummary(req, res, next) {
    try {
      const data = await medrec06Service.getMedicalRecordSummary(req.params.id, req.user);
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

module.exports = new Medrec06Controller();

