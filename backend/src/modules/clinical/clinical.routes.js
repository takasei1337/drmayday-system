const express = require('express');
const router = express.Router();
const clinicalController = require('./clinical.controller');
const { authenticate, authorize } = require('../../middlewares/auth.middleware');

/**
 * Tuyến đường API của THÀNH VIÊN 3: Điều trị Lâm sàng, Đơn thuốc & UAS7 (Slide 6 & 7)
 */
router.use(authenticate);

// Danh mục thuốc & Kê đơn (Bác sĩ, Admin)
router.get('/thuoc', authorize(['ADMIN', 'BAC_SI']), clinicalController.getThuoc);
router.get('/don-thuoc/:ma_phien_kham', authorize(['ADMIN', 'BAC_SI', 'BENH_NHAN']), clinicalController.getDonThuoc);

// Thang điểm UAS7 & AAS (Bác sĩ xem, Bệnh nhân tự chấm điểm hàng ngày)
router.get('/uas7/chu-ky/:ma_benh_nhan', authorize(['ADMIN', 'BAC_SI', 'BENH_NHAN']), clinicalController.getChuKyUAS7);
router.post('/uas7/nhat-ky', authorize(['BENH_NHAN', 'BAC_SI']), clinicalController.logUAS7);

module.exports = router;
