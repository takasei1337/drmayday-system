const express = require('express');
const router = express.Router();
const adminController = require('./admin.controller');
const { authenticate, authorize } = require('../../middlewares/auth.middleware');

/**
 * Tuyến đường API của THÀNH VIÊN 1: Admin, RBAC & Topology (Slide 3 & 4)
 * Yêu cầu quyền: ADMIN
 */
router.use(authenticate);
router.use(authorize(['ADMIN']));

// Chi nhánh (Branches)
router.get('/chi-nhanh', adminController.getChiNhanh);
router.post('/chi-nhanh', adminController.createChiNhanh);

// Phòng khám (Clinics)
router.get('/phong-kham', adminController.getPhongKham);

// Nhân viên y tế (Employees/Staff)
router.get('/nhan-vien', adminController.getNhanVien);

module.exports = router;
