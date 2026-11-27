'use strict';

const uas704Service = require('./uas704.service');
const { errorResponse } = require('../../common/response');

class Uas704Controller {
  /**
   * uas704: Lấy lịch sử điểm UAS7 của bệnh nhân
   * Route: GET /api/v1/uas7-scores/patient/:patient_id
   */
  async getPatientUas7History(req, res, next) {
    try {
      const data = await uas704Service.getPatientUas7History(req.params.patient_id, req.user);
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

module.exports = new Uas704Controller();

