'use strict';

const uas702Service = require('./uas702.service');
const { errorResponse } = require('../../common/response');

class Uas702Controller {
  /**
   * uas702: Bệnh nhân gửi điểm UAS7 hằng ngày
   * Route: POST /api/v1/uas7-scores
   */
  async createUas7Score(req, res, next) {
    try {
      const data = await uas702Service.createUas7Score(req.body, req.user);
      return res.status(201).json({
        code: 1001,
        message: 'Created successfully',
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

module.exports = new Uas702Controller();

