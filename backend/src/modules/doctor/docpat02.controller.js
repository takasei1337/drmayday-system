const docpat02Service = require('./docpat02.service');
const { sheetSuccess, errorResponse } = require('../../common/response');

class Docpat02Controller {
  /**
   * docpat02: Bác sĩ tạo mới hồ sơ bệnh nhân (Slide 5, Sheet POST apidoctorpatientscreate)
   */
  async createPatient(req, res, next) {
    try {
      const newPatient = await docpat02Service.createPatient(req.body);
      return sheetSuccess(res, newPatient, 'Tạo bệnh nhân thành công', 201);
    } catch (err) {
      if (typeof err.code === 'number') {
        return errorResponse(res, err.message, err.statusCode || 400, err.code);
      }
      next(err);
    }
  }
}

module.exports = new Docpat02Controller();

