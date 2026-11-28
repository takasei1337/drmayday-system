const docpat01Service = require('./docpat01.service');
const { sheetSuccess, errorResponse } = require('../../common/response');

class Docpat01Controller {
  /**
   * docpat01: Bác sĩ tìm kiếm hồ sơ bệnh nhân (Slide 5, Sheet GET apidoctorpatientssearch)
   */
  async searchPatients(req, res, next) {
    try {
      const result = await docpat01Service.searchPatients(req.query);
      return sheetSuccess(res, result.patients, 'Tìm kiếm bệnh nhân thành công', 200, {
        total_records: result.total_records,
      });
    } catch (err) {
      next(err);
    }
  }
}

module.exports = new Docpat01Controller();

