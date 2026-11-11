const patientService = require('./patient.service');
const { successResponse, errorResponse } = require('../../common/response');

class PatientController {
  async getBenhNhan(req, res, next) {
    try {
      const limit = parseInt(req.query.limit, 10) || 50;
      const offset = parseInt(req.query.offset, 10) || 0;
      const data = await patientService.getBenhNhanList(limit, offset);
      return successResponse(res, data, 'Lấy danh sách bệnh nhân thành công');
    } catch (err) {
      next(err);
    }
  }

  async getHoSoByPatient(req, res, next) {
    try {
      const { id } = req.params;
      const data = await patientService.getHoSoBenhAnByPatientId(id);
      return successResponse(res, data, `Lấy hồ sơ bệnh án của bệnh nhân ${id} thành công`);
    } catch (err) {
      next(err);
    }
  }

  async createHoSo(req, res, next) {
    try {
      const { ma_benh_nhan, loai_benh_an, ly_do_den_kham } = req.body;
      if (!ma_benh_nhan || !loai_benh_an) {
        return errorResponse(res, 'Mã bệnh nhân và loại bệnh án là bắt buộc', 400);
      }
      const data = await patientService.createHoSoBenhAn(req.body);
      return successResponse(res, data, 'Tạo hồ sơ bệnh án thành công', 201);
    } catch (err) {
      next(err);
    }
  }

  async getPhienKham(req, res, next) {
    try {
      const { ma_ho_so } = req.params;
      const data = await patientService.getPhienKhamList(ma_ho_so);
      return successResponse(res, data, 'Lấy danh sách phiên khám thành công');
    } catch (err) {
      next(err);
    }
  }
}

module.exports = new PatientController();
