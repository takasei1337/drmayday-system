const express = require('express');
const router = express.Router();
const patientController = require('./patient.controller');
const { authenticate, authorize } = require('../../middlewares/auth.middleware');

/**
 * Tuyến đường API của THÀNH VIÊN 2: Quản lý Bệnh nhân & Hồ sơ Bệnh án (Slide 5)
 * Quyền: ADMIN hoặc BAC_SI
 */
router.use(authenticate);
router.use(authorize(['ADMIN', 'BAC_SI']));

// Quản lý bệnh nhân
router.get('/', patientController.getBenhNhan);
router.get('/benh-nhan', patientController.getBenhNhan);

// Quản lý hồ sơ bệnh án
router.get('/benh-nhan/:id/ho-so', patientController.getHoSoByPatient);
router.post('/ho-so', patientController.createHoSo);

// Quản lý phiên khám
router.get('/ho-so/:ma_ho_so/phien-kham', patientController.getPhienKham);

module.exports = router;
