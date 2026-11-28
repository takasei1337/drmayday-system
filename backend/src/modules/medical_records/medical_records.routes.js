const express = require('express');
const router = express.Router();
const { authenticate, authorize } = require('../../middlewares/auth.middleware');

const medrec01Controller = require('./medrec01.controller');
const medrec02Controller = require('./medrec02.controller');
const medrec03Controller = require('./medrec03.controller');
const medrec04Controller = require('./medrec04.controller');
const medrec05Controller = require('./medrec05.controller');
const medrec06Controller = require('./medrec06.controller');
const medrec07Controller = require('./medrec07.controller');
const medrec08Controller = require('./medrec08.controller');
const medrec10Controller = require('./medrec10.controller');
const medrec11Controller = require('./medrec11.controller');
const medrec13Controller = require('./medrec13.controller');
const medrec14Controller = require('./medrec14.controller');

/**
 * Tuyến đường API Quản lý Bệnh án (Medical Records - Slide 5)
 * Yêu cầu xác thực Bearer Token
 */
router.use(authenticate);

/**
 * medrec01: Lấy danh sách câu hỏi sàng lọc phân loại bệnh án
 * GET /api/v1/medical_records/classify-questions
 */
router.get('/classify-questions', medrec01Controller.getClassifyQuestions);

/**
 * medrec02: Phân loại bệnh án và trả về template phù hợp
 * POST /api/v1/medical_records/classify
 */
router.post('/classify', medrec02Controller.classifyMedicalRecord);

/**
 * medrec03: Khởi tạo hồ sơ bệnh án mới
 * POST /api/v1/medical_records/
 */
router.post('/', medrec03Controller.createMedicalRecord);

/**
 * medrec04: Bác sĩ/Admin/Lễ tân lấy danh sách toàn bộ hồ sơ bệnh án
 * GET /api/v1/medical_records/all
 */
router.get(
  '/all',
  authorize(['admin', 'bac_si', 'dieu_duong', 'le_tan']),
  medrec04Controller.getAllMedicalRecords
);

/**
 * medrec13: Truy xuất lịch sử khám bệnh (các bệnh án cũ) của 1 bệnh nhân cụ thể
 * GET /api/v1/medical_records/patients/:id/history (đặt trước /:id)
 */
router.get('/patients/:id/history', medrec13Controller.getPatientHistory);

/**
 * medrec07: Bác sĩ tiếp nhận hồ sơ bệnh án đang ở trạng thái pending
 * POST /api/v1/medical_records/:id/accept
 */
router.post(
  '/:id/accept',
  authorize(['bac_si', 'admin']),
  medrec07Controller.acceptMedicalRecord
);

/**
 * medrec08: Truy xuất toàn bộ câu trả lời chi tiết trong biểu mẫu khám của bệnh án
 * GET /api/v1/medical_records/:id/answers
 */
router.get('/:id/answers', medrec08Controller.getMedicalRecordAnswers);

/**
 * medrec10: Cập nhật (Upsert) câu trả lời trong biểu mẫu khám của bệnh án
 * PUT /api/v1/medical_records/:id/answers (đặt trước PUT /:id)
 */
router.put('/:id/answers', medrec10Controller.updateMedicalRecordAnswers);

/**
 * medrec06: Xem tóm tắt nhanh (Summary) của 1 bệnh án
 * GET /api/v1/medical_records/:id/summary
 */
router.get('/:id/summary', medrec06Controller.getMedicalRecordSummary);

/**
 * medrec05: Xem chi tiết tổng quan của 1 bệnh án cụ thể
 * GET /api/v1/medical_records/:id (đặt sau các route tĩnh /classify-questions, /all)
 */
router.get('/:id', medrec05Controller.getMedicalRecordById);

/**
 * medrec11: Bác sĩ phụ trách chốt bệnh án (cập nhật instructions, status, completed_at)
 * PUT /api/v1/medical_records/:id
 */
router.put(
  '/:id',
  authorize(['bac_si', 'admin']),
  medrec11Controller.completeMedicalRecord
);

/**
 * medrec14: Admin xóa toàn bộ hồ sơ bệnh án
 * DELETE /api/v1/medical_records/:id/
 */
router.delete('/:id', authorize(['admin']), medrec14Controller.deleteMedicalRecord);

module.exports = router;

