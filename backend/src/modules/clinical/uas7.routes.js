'use strict';

const express = require('express');
const router = express.Router();

const { authenticate } = require('../../middlewares/auth.middleware');

// uas701: Kiểm tra điều kiện chấm điểm UAS7
const uas701Controller = require('./uas701.controller');
// uas702: Bệnh nhân gửi điểm UAS7 hằng ngày
const uas702Controller = require('./uas702.controller');
// uas704: Lấy lịch sử điểm UAS7 của bệnh nhân
const uas704Controller = require('./uas704.controller');

// Áp dụng authenticate toàn bộ module
router.use(authenticate);

/**
 * uas701: Kiểm tra xem bệnh nhân có bệnh án đang active để chấm điểm UAS7 không
 * GET /api/v1/uas7-scores/eligibility
 */
router.get('/eligibility', uas701Controller.checkEligibility);

/**
 * uas704: Lấy toàn bộ lịch sử ghi nhận điểm UAS7 của bệnh nhân
 * GET /api/v1/uas7-scores/patient/:patient_id
 */
router.get('/patient/:patient_id', uas704Controller.getPatientUas7History);

/**
 * uas702: Bệnh nhân ghi nhận điểm số UAS7 hằng ngày (ISS7 + HSS7)
 * POST /api/v1/uas7-scores
 */
router.post('/', uas702Controller.createUas7Score);

module.exports = router;

