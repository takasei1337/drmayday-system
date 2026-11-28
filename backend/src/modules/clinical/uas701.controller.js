'use strict';

const uas701Service = require('./uas701.service');
const { sheetSuccess, errorResponse } = require('../../common/response');

class Uas701Controller {
  /**
   * uas701: Kiểm tra điều kiện làm bảng chấm điểm UAS7
   * Route: GET /api/v1/uas7-scores/eligibility
   */
  async checkEligibility(req, res, next) {
    try {
      const data = await uas701Service.checkEligibility(req.user);
      return sheetSuccess(res, data, 'OK', 200);
    } catch (err) {
      if (typeof err.code === 'number') {
        return errorResponse(res, err.message, err.statusCode || 400, err.code);
      }
      next(err);
    }
  }
}

module.exports = new Uas701Controller();

