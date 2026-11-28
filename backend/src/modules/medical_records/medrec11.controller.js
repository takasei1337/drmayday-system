const medrec11Service = require('./medrec11.service');
const { sheetSuccess, errorResponse } = require('../../common/response');

class Medrec11Controller {
  /**
   * medrec11: Bác sĩ chốt bệnh án (cập nhật instructions, status, completed_at)
   * Route: PUT /api/v1/medical_records/:id
   */
  async completeMedicalRecord(req, res, next) {
    try {
      const data = await medrec11Service.completeMedicalRecord(req.params.id, req.body, req.user);
      return sheetSuccess(res, data, 'Cập nhật bệnh án thành công', 200);
    } catch (err) {
      if (typeof err.code === 'number') {
        return errorResponse(res, err.message, err.statusCode || 400, err.code);
      }
      next(err);
    }
  }
}

module.exports = new Medrec11Controller();

