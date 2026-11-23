const express = require('express');
const router = express.Router();
const { authenticate, authorize } = require('../../middlewares/auth.middleware');

// Import controllers từ từng folder chức năng riêng biệt
const docpat01Controller = require('./docpat01/docpat01.controller');
const docpat02Controller = require('./docpat02/docpat02.controller');

/**
 * Tuyến đường API chuyên biệt dành cho Bác sĩ (Doctor Module)
 * Phân quyền bắt buộc: BAC_SI hoặc ADMIN
 */
router.use(authenticate);
router.use(authorize(['BAC_SI', 'ADMIN']));

/**
 * ========================================================
 * 1. FOLDER docpat01: Bác sĩ tìm kiếm hồ sơ bệnh nhân
 * Căn cứ: Slide 5 (trang 6 & 7) & Sheet GET apidoctorpatientssearch
 * ========================================================
 */
router.get('/patients/search', docpat01Controller.searchPatients);
router.get('/patients', docpat01Controller.searchPatients); // alias linh hoạt

/**
 * ========================================================
 * 2. FOLDER docpat02: Bác sĩ tạo mới hồ sơ bệnh nhân tại viện
 * Căn cứ: Slide 5 (trang 10 & 11) & Sheet POST apidoctorpatientscreate
 * ========================================================
 */
router.post('/patients/create', docpat02Controller.createPatient);
router.post('/patients', docpat02Controller.createPatient); // alias linh hoạt

module.exports = router;
