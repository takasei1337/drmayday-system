'use strict';

const uas701Service = require('./uas701.service');
const { errorResponse } = require('../../common/response');

class Uas701Controller {
  /**
   * uas701: Kiểm tra điều kiện làm bảng chấm điểm UAS7
   * Route: GET /api/v1/uas7-scores/eligibility
   */
  async checkEligibility(req, res, next) {
    try {
      const data = await uas701Service.checkEligibility(req.user);
      return res.status(200).json({
        code: 1000,
        message: 'OK',
        data,
      });
    } catch (err) {
      if (err.code) {
        return errorResponse(res, err.message, err.statusCode || 400, err.code);
      }
      next(err);
    }
  }
}

module.exports = new Uas701Controller();

