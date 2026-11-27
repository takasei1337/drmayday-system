const express = require('express');
const router = express.Router();
const patientController = require('./patient.controller');
const flowController = require('./patientFlow.controller');
const { authenticate, authorize } = require('../../middlewares/auth.middleware');

/**
 * Tuyến đường API cho Quản lý Bệnh nhân & Hồ sơ cốt lõi (Slide 5: pat01-04, rec01-05)
 * Mounted at /api/v1/patients và /api/v1/patient-mgmt
 */
router.use(authenticate);

// Danh sách & tìm kiếm bệnh nhân (đặt trước /:id)
router.get('/', authorize(['ADMIN', 'BAC_SI', 'DIEU_DUONG']), patientController.getBenhNhan);
router.get('/benh-nhan', authorize(['ADMIN', 'BAC_SI', 'DIEU_DUONG']), patientController.getBenhNhan);
router.get('/search', authorize(['ADMIN', 'BAC_SI', 'DIEU_DUONG']), patientController.getDoctorPatients);

// Hồ sơ bệnh án & Phiên khám (đặt trước /:id để không bị khớp nhầm param)
router.get('/benh-nhan/:id/ho-so', authorize(['ADMIN', 'BAC_SI', 'DIEU_DUONG', 'BENH_NHAN']), patientController.getHoSoByPatient);
router.get('/ho-so/benh-nhan/:id', authorize(['ADMIN', 'BAC_SI', 'DIEU_DUONG', 'BENH_NHAN']), patientController.getHoSoByPatient);
router.post('/ho-so', authorize(['ADMIN', 'BAC_SI', 'BENH_NHAN']), patientController.createHoSo);
router.get('/ho-so/:ma_ho_so/phien-kham', authorize(['ADMIN', 'BAC_SI', 'DIEU_DUONG', 'BENH_NHAN']), patientController.getPhienKham);
router.post('/ho-so/:ma_ho_so/phien-kham', authorize(['ADMIN', 'BAC_SI']), patientController.createPhienKham);
router.put('/medical-records/:id/close', authorize(['BENH_NHAN', 'BAC_SI', 'ADMIN']), flowController.closeRecord);

// Chi tiết / cập nhật bệnh nhân & danh sách bệnh án của bệnh nhân
router.get('/:id/medical-records', authorize(['ADMIN', 'BAC_SI', 'DIEU_DUONG', 'BENH_NHAN']), patientController.getHoSoByPatient);
router.get('/:id', authorize(['ADMIN', 'BAC_SI', 'DIEU_DUONG', 'BENH_NHAN']), patientController.getBenhNhanById);
router.put('/:id', authorize(['ADMIN', 'BAC_SI', 'BENH_NHAN']), patientController.updateBenhNhanById);
router.patch('/:id', authorize(['ADMIN', 'BAC_SI', 'BENH_NHAN']), patientController.updateBenhNhanById);

module.exports = router;
