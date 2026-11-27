const patientService = require('./patient.service');
const patientFlowService = require('./patientFlow.service');
const { successResponse, errorResponse } = require('../../common/response');
const { isStaffRole, resolvePatientIdForUser } = require('./patient.helpers');
const db = require('../../config/db');

function sendError(res, next, err) {
  if (err && err.code) {
    return errorResponse(res, err.message, err.statusCode || 400, err.code);
  }
  return next(err);
}

class PatientController {
  // pat01 / rec01: Danh sách bệnh nhân
  async getBenhNhan(req, res, next) {
    try {
      const limit = parseInt(req.query.limit, 10) || 50;
      const offset = parseInt(req.query.offset, 10) || 0;
      const search = req.query.q || req.query.search || '';
      const data = await patientService.getBenhNhanList(limit, offset, search);
      return successResponse(res, data, 'Lấy danh sách bệnh nhân thành công');
    } catch (err) {
      return sendError(res, next, err);
    }
  }

  // pat02: Chi tiết bệnh nhân theo ID
  async getBenhNhanById(req, res, next) {
    try {
      const pid = await patientService.assertPatientAccess(req.user, req.params.id);
      const data = await patientService.getBenhNhanById(pid, false);
      return successResponse(res, data, 'Lấy thông tin bệnh nhân thành công');
    } catch (err) {
      return sendError(res, next, err);
    }
  }

  // pat03: Cập nhật bệnh nhân theo ID
  async updateBenhNhanById(req, res, next) {
    try {
      const pid = await patientService.assertPatientAccess(req.user, req.params.id);
      const data = await patientService.updateBenhNhanById(pid, req.body);
      return successResponse(res, data, 'Cập nhật thông tin bệnh nhân thành công');
    } catch (err) {
      return sendError(res, next, err);
    }
  }

  // pat04 / rec02: Hồ sơ bệnh án của bệnh nhân
  async getHoSoByPatient(req, res, next) {
    try {
      const pid = await patientService.assertPatientAccess(req.user, req.params.id);
      const data = await patientService.getHoSoBenhAnByPatientId(pid);
      return successResponse(res, data, `Lấy hồ sơ bệnh án của bệnh nhân ${pid} thành công`);
    } catch (err) {
      return sendError(res, next, err);
    }
  }

  // rec03: Tạo hồ sơ bệnh án mới
  async createHoSo(req, res, next) {
    try {
      let maBenhNhan = req.body.ma_benh_nhan || req.body.patient_id;
      if (!isStaffRole(req.user)) {
        const myPid = await resolvePatientIdForUser(db, req.user);
        if (!maBenhNhan) maBenhNhan = myPid;
        await patientService.assertPatientAccess(req.user, maBenhNhan);
      }

      const loaiBenhAn = req.body.loai_benh_an || req.body.record_type || req.body.type;
      if (!maBenhNhan || !loaiBenhAn) {
        return errorResponse(res, 'Mã bệnh nhân và loại bệnh án là bắt buộc', 400, 2001);
      }

      const data = await patientService.createHoSoBenhAn({ ...req.body, ma_benh_nhan: maBenhNhan }, req.user);
      return successResponse(res, data, 'Tạo hồ sơ bệnh án thành công', 201);
    } catch (err) {
      return sendError(res, next, err);
    }
  }

  // rec04: Lấy danh sách phiên khám theo hồ sơ
  async getPhienKham(req, res, next) {
    try {
      const maHoSo = req.params.ma_ho_so || req.params.id;
      await patientFlowService.getMedicalRecordDetail(req.user, maHoSo);
      const data = await patientService.getPhienKhamList(maHoSo);
      return successResponse(res, data, 'Lấy danh sách phiên khám thành công');
    } catch (err) {
      return sendError(res, next, err);
    }
  }

  // rec05: Tạo phiên khám mới
  async createPhienKham(req, res, next) {
    try {
      const maHoSo = req.params.ma_ho_so || req.params.id;
      const data = await patientService.createPhienKham(maHoSo, req.body, req.user);
      return successResponse(res, data, 'Tạo phiên khám mới thành công', 201);
    } catch (err) {
      return sendError(res, next, err);
    }
  }

  // docpat01: Bác sĩ xem danh sách bệnh nhân phân trang & lọc
  async getDoctorPatients(req, res, next) {
    try {
      const data = await patientService.getDoctorPatients({
        page: req.query.page,
        limit: req.query.limit,
        search: req.query.q || req.query.search || req.query.keyword,
        status: req.query.status,
        recordType: req.query.loai_benh_an || req.query.record_type,
      });
      return successResponse(res, data, 'Lấy danh sách bệnh nhân thành công');
    } catch (err) {
      return sendError(res, next, err);
    }
  }

  // docpat02: Bác sĩ xem chi tiết bệnh nhân & danh sách hồ sơ
  async getDoctorPatientDetail(req, res, next) {
    try {
      const data = await patientService.getBenhNhanById(req.params.id, true);
      return successResponse(res, data, 'Lấy chi tiết bệnh nhân thành công');
    } catch (err) {
      return sendError(res, next, err);
    }
  }
}

module.exports = new PatientController();
