/**
 * Response Helper chuẩn hóa đầu ra & bảng mã phản hồi đã gộp theo Google Sheet ("3. response code")
 */
const MERGED_RESPONSE_CODES = {
  1000: 'OK',
  9992: 'Post is not existed',
  9993: 'Code verify is incorrect',
  9994: 'No Data or end of list data',
  9995: 'User is not validated',
  9996: 'User existed',
  9997: 'Method is invalid',
  9998: 'Token is invalid',
  9999: 'Exception error.',
  1001: 'Can not connect to DB',
  1002: 'Parameter is not enough',
  1003: 'Parameter type is invalid.',
  1004: 'Parameter value is invalid.',
  1005: 'Unknown error',
  1006: 'File size is too big.',
  1007: 'Upload File Failed!.',
  1008: 'Maximum number of images.',
  1009: 'Not access.',
  1010: 'Action has been done previously',
};

const LEGACY_TO_MERGED_CODE = {
  1000: 1000,
  // Bit 0 -> 9992
  3007: 9992, 4001: 9992, 4008: 9992, 4101: 9992, 4103: 9992, 4104: 9992,
  6005: 9992, 7001: 9992, 7002: 9992, 7003: 9992, 8103: 9992, 9102: 9992,
  // Bit 1 -> 9993
  3004: 9993, 3005: 9993,
  // Bit 2 -> 9994
  4002: 9994, 5001: 9994,
  // Bit 3 -> 9995
  3008: 9995, 3009: 9995,
  // Bit 4 -> 9996
  3006: 9996, 4102: 9996,
  // Bit 6 -> 9998
  3001: 9998, 3002: 9998, 3003: 9998,
  // Bit 7 -> 9999
  9001: 9999, 9002: 9999, 9901: 9999, 9903: 9999,
  // Bit 8 -> 1001
  9902: 1001,
  // Bit 9 -> 1002
  2001: 1002, 4006: 1002, 4007: 1002, 5005: 1002, 6001: 1002, 7004: 1002,
  7005: 1002, 8001: 1002, 8002: 1002, 8101: 1002, 8102: 1002, 9101: 1002,
  // Bit 10 -> 1003
  2002: 1003, 2007: 1003, 6002: 1003,
  // Bit 11 -> 1004
  2003: 1004, 2004: 1004, 2005: 1004, 2006: 1004, 4004: 1004, 4009: 1004,
  5003: 1004, 5004: 1004, 7006: 1004, 7007: 1004, 9003: 1004,
  // Bit 13 -> 1006
  6003: 1006,
  // Bit 14 -> 1007
  6007: 1007,
  // Bit 15 -> 1008
  6004: 1008,
  // Bit 16 -> 1009
  3101: 1009, 3102: 1009, 3103: 1009, 3104: 1009, 3105: 1009, 3106: 1009,
  // Bit 17 -> 1010
  4003: 1010, 4005: 1010, 4105: 1010, 5002: 1010, 6006: 1010, 8003: 1010,
};

const DB_ERROR_STRINGS = new Set([
  'ECONNREFUSED', 'ECONNRESET', 'ETIMEDOUT', 'ENOTFOUND', 'EHOSTUNREACH',
  'P1001', 'P1002', 'P1008', 'P1017', '08001', '08006', '57P01', '57P02', '57P03',
]);

function resolveMergedCode(rawCode, statusCode = 500, errorObj = null) {
  const errCodeStr = typeof rawCode === 'string'
    ? rawCode.trim()
    : (errorObj && typeof errorObj.code === 'string' ? errorObj.code.trim() : '');

  if (errCodeStr === 'LIMIT_FILE_SIZE') return 1006;
  if (errCodeStr === 'LIMIT_FILE_COUNT' || errCodeStr === 'LIMIT_UNEXPECTED_FILE') return 1008;
  if (DB_ERROR_STRINGS.has(errCodeStr) || /^P10\d\d$/.test(errCodeStr) || /^08\d{3}$/.test(errCodeStr)) {
    return 1001;
  }

  const num = Number(rawCode);
  if (!Number.isNaN(num) && num > 0) {
    if (LEGACY_TO_MERGED_CODE[num]) return LEGACY_TO_MERGED_CODE[num];
    if (MERGED_RESPONSE_CODES[num]) return num;
  }

  if (statusCode === 401) return 9998;
  if (statusCode === 403) return 1009;
  if (statusCode === 404) return 9994;
  if (statusCode === 405) return 9997;
  if (statusCode === 409) return 9996;
  if (statusCode === 400) return 1002;
  if (statusCode >= 500) return 9999;
  return 1005;
}

const successResponse = (res, data = null, message = 'OK', statusCode = 200, code = 1000) => {
  return res.status(statusCode).json({
    code: code || 1000,
    message: message || 'OK',
    data: data !== null && data !== undefined ? data : {},
    success: true,
  });
};

const errorResponse = (res, message = 'Có lỗi xảy ra', statusCode = 500, code = null, error = null) => {
  const normalizedCode = resolveMergedCode(code, statusCode, error);
  return res.status(statusCode).json({
    code: normalizedCode,
    message: message || MERGED_RESPONSE_CODES[normalizedCode] || 'Có lỗi xảy ra',
    error: error ? (error.message || error) : null,
    success: false,
  });
};

const sheetSuccess = (res, data = {}, message = 'OK', statusCode = 200, code = 1000) => {
  return res.status(statusCode).json({
    code: code || 1000,
    message: message || 'OK',
    data: data !== undefined ? data : {},
  });
};

const sheetRawSuccess = (res, payload = {}, statusCode = 200) => {
  return res.status(statusCode).json(payload);
};

const handleControllerError = (res, next, err) => {
  if (err && err.code) {
    const fallbackStatus = typeof err.code === 'string' ? 500 : 400;
    const code = resolveMergedCode(err.code, err.statusCode || fallbackStatus, err);
    const statusCode = err.statusCode || (code === 1001 ? 503 : fallbackStatus);
    return errorResponse(res, err.message, statusCode, code, err);
  }
  return next(err);
};

module.exports = {
  MERGED_RESPONSE_CODES,
  LEGACY_TO_MERGED_CODE,
  resolveMergedCode,
  successResponse,
  errorResponse,
  sheetSuccess,
  sheetRawSuccess,
  handleControllerError,
};
