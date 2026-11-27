const docpat02Service = require('./docpat02.service');

class Docpat02Controller {
  /**
   * docpat02: Bác sĩ tạo mới hồ sơ bệnh nhân (Slide 5, Sheet POST apidoctorpatientscreate)
   */
  async createPatient(req, res, next) {
    try {
      const newPatient = await docpat02Service.createPatient(req.body);
      return res.status(201).json({
        code: 1001,
        message: 'Tạo bệnh nhân thành công',
        data: newPatient,
      });
    } catch (err) {
      next(err);
    }
  }
}

module.exports = new Docpat02Controller();

