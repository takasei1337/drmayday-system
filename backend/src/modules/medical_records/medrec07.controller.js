const medrec07Service = require('./medrec07.service');
const { errorResponse } = require('../../common/response');

class Medrec07Controller {
  /**
   * medrec07: Bác sĩ tiếp nhận hồ sơ bệnh án
   * Route: POST /api/v1/medical_records/:id/accept
   */
  async acceptMedicalRecord(req, res, next) {
    try {
      const data = await medrec07Service.acceptMedicalRecord(req.params.id, req.user);
      return res.status(200).json({
        code: 1000,
        message: 'Tiếp nhận bệnh án thành công',
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

module.exports = new Medrec07Controller();

