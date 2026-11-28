'use strict';

const uas702Service = require('./uas702.service');
const { sheetSuccess, errorResponse } = require('../../common/response');

class Uas702Controller {
  /**
   * uas702: Bệnh nhân gửi điểm UAS7 hằng ngày
   * Route: POST /api/v1/uas7-scores
   */
  async createUas7Score(req, res, next) {
    try {
      const data = await uas702Service.createUas7Score(req.body, req.user);
      return sheetSuccess(res, data, 'Created successfully', 201);
    } catch (err) {
      if (typeof err.code === 'number') {
        return errorResponse(res, err.message, err.statusCode || 400, err.code);
      }
      next(err);
    }
  }
}

module.exports = new Uas702Controller();

