const express = require('express');
const router = express.Router();
const lesionController = require('./lesion.controller');
const { authenticate, authorize } = require('../../middlewares/auth.middleware');

router.use(authenticate);

// Vị trí tổn thương (Body map)
router.get('/vi-tri', lesionController.getViTri);

// Đợt tổn thương da từ CSDL chính
router.get('/dot-ton-thuong/ho-so/:ma_ho_so', lesionController.getDotTonThuong);

// Ảnh tổn thương mở rộng (Lưu trữ trên Supabase Storage & Sub DB Prisma)
router.post('/anh-mo-rong', authorize(['BENH_NHAN', 'BAC_SI']), lesionController.saveAnhMoRong);
router.get('/anh-mo-rong/ho-so/:ma_ho_so', authorize(['BENH_NHAN', 'BAC_SI', 'ADMIN']), lesionController.getAnhMoRongByHoSo);

module.exports = router;
