const docpat01Service = require('./docpat01.service');

class Docpat01Controller {
  /**
   * docpat01: Bác sĩ tìm kiếm hồ sơ bệnh nhân (Slide 5, Sheet GET apidoctorpatientssearch)
   */
  async searchPatients(req, res, next) {
    try {
      const result = await docpat01Service.searchPatients(req.query);
      return res.status(200).json({
        code: 1000,
        message: 'Tìm kiếm bệnh nhân thành công',
        data: result.patients,
        total_records: result.total_records,
      });
    } catch (err) {
      next(err);
    }
  }
}

module.exports = new Docpat01Controller();

