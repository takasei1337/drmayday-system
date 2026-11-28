/**
 * @file backend/src/common/response.js
 * @description Chuẩn hóa Response & Bảng mã gộp theo Tab `3. response code` trong `docs/GoogleSheets_APIs.xlsx`.
 */

const MERGED_RESPONSE_CODES = {
  1000: { code: '1000', message: 'OK', httpStatus: 200 },
  9992: { code: '9992', message: 'Post is not existed', httpStatus: 404 },
  9993: { code: '9993', message: 'Code verify is incorrect', httpStatus: 400 },
  9994: { code: '9994', message: 'No Data or end of list data', httpStatus: 404 },
  9995: { code: '9995', message: 'User is not validated', httpStatus: 401 },
  9996: { code: '9996', message: 'User existed.', httpStatus: 409 },
  9997: { code: '9997', message: 'Method is invalid', httpStatus: 405 },
  9998: { code: '9998', message: 'Token is invalid.', httpStatus: 401 },
  9999: { code: '9999', message: 'Exception error.', httpStatus: 500 },
  1001: { code: '1001', message: 'Can not connect to DB.', httpStatus: 500 },
  1002: { code: '1002', message: 'Parameter is not enough', httpStatus: 400 },
  1003: { code: '1003', message: 'Parameter type is invalid.', httpStatus: 400 },
  1004: { code: '1004', message: 'Parameter value is invalid.', httpStatus: 400 },
  1005: { code: '1005', message: 'Unknown error.', httpStatus: 500 },
  1006: { code: '1006', message: 'File size is too big.', httpStatus: 400 },
  1007: { code: '1007', message: 'Upload File Failed!.', httpStatus: 500 },
  1008: { code: '1008', message: 'Maximum number of images.', httpStatus: 400 },
  1009: { code: '1009', message: 'Not access.', httpStatus: 403 },
  1010: { code: '1010', message: 'Action has been done previously by this user.', httpStatus: 409 },
};

const DETAIL_TO_MERGED_CODE = {
  // 1000: OK
  1000: 1000,
  // 9992: Post is not existed (3007, 4001, 4008, 4101, 4103, 4104, 6005, 7001, 7002, 7003, 8103, 9102)
  3007: 9992, 4001: 9992, 4008: 9992, 4101: 9992, 4103: 9992, 4104: 9992,
  6005: 9992, 7001: 9992, 7002: 9992, 7003: 9992, 8103: 9992, 9102: 9992,
<<<<<<< HEAD
  3201: 9992, 3203: 9992, 3301: 9992, 3303: 9992, 3304: 9992, 4002: 9994,
  // 9993: Code verify is incorrect (3004, 3005)
  3004: 9993, 3005: 9993,
  // 9994: No Data or end of list data (4002, 5001)
  5001: 9994,
=======
  3201: 9992, 3203: 9992, 3301: 9992, 3303: 9992, 3304: 9992,
  // 9993: Code verify is incorrect (3004, 3005)
  3004: 9993, 3005: 9993,
  // 9994: No Data or end of list data (4002, 5001)
  4002: 9994, 5001: 9994,
>>>>>>> 0ad0325 (fix(backend): standardize sheetSuccess/merged response codes, fix docpat02 role_id & medrec02/07/08)
  // 9995: User is not validated (3008, 3009)
  3008: 9995, 3009: 9995,
  // 9996: User existed. (3006, 4102)
  3006: 9996, 4102: 9996, 3202: 9996, 3204: 9996,
  // 9998: Token is invalid. (3001, 3002, 3003)
  3001: 9998, 3002: 9998, 3003: 9998,
  // 9999: Exception error. (9001, 9002, 9901, 9903)
  9001: 9999, 9002: 9999, 9901: 9999, 9903: 9999,
  // 1001: Can not connect to DB. (9902)
  9902: 1001,
  // 1002: Parameter is not enough
  2001: 1002, 4006: 1002, 4007: 1002, 5005: 1002, 6001: 1002,
  7004: 1002, 7005: 1002, 8001: 1002, 8002: 1002, 8101: 1002, 8102: 1002, 9101: 1002,
  // 1003: Parameter type is invalid. (2002, 2007, 6002)
  2002: 1003, 2007: 1003, 6002: 1003,
  // 1004: Parameter value is invalid.
  2003: 1004, 2004: 1004, 2005: 1004, 2006: 1004, 4004: 1004, 4009: 1004,
  5003: 1004, 5004: 1004, 7006: 1004, 7007: 1004, 9003: 1004,
  // 1006 / 1007 / 1008: Media
  6003: 1006, 6007: 1007, 6004: 1008,
  // 1009: Not access. (3101..3106)
  3101: 1009, 3102: 1009, 3103: 1009, 3104: 1009, 3105: 1009, 3106: 1009,
  // 1010: Action has been done previously (4003, 4005, 4105, 5002, 6006, 8003)
  4003: 1010, 4005: 1010, 4105: 1010, 5002: 1010, 6006: 1010, 8003: 1010,
};

<<<<<<< HEAD
const DB_ERROR_STRINGS = new Set([
  'ECONNREFUSED', 'ECONNRESET', 'ETIMEDOUT', 'ENOTFOUND', 'EHOSTUNREACH',
  'P1001', 'P1002', 'P1008', 'P1017', '08001', '08006', '57P01', '57P02', '57P03',
]);

function mapToMergedCode(rawCode, fallbackCode = 1005) {
=======
function mapToMergedCode(rawCode, fallbackCode = 9999) {
>>>>>>> 0ad0325 (fix(backend): standardize sheetSuccess/merged response codes, fix docpat02 role_id & medrec02/07/08)
  const n = Number(rawCode);
  if (Number.isFinite(n)) {
    if (MERGED_RESPONSE_CODES[n]) return n;
    if (DETAIL_TO_MERGED_CODE[n]) return DETAIL_TO_MERGED_CODE[n];
  }
  return fallbackCode;
}

<<<<<<< HEAD
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
    if (DETAIL_TO_MERGED_CODE[num]) return DETAIL_TO_MERGED_CODE[num];
    if (MERGED_RESPONSE_CODES[num]) return num;
  }

  if (statusCode === 401) return 9998;
  if (statusCode === 403) return 1009;
  if (statusCode === 404) return 9992;
  if (statusCode === 405) return 9997;
  if (statusCode === 409) return 9996;
  if (statusCode === 400) return 1002;
  if (statusCode >= 500) return 9999;
  return 1005;
}

=======
>>>>>>> 0ad0325 (fix(backend): standardize sheetSuccess/merged response codes, fix docpat02 role_id & medrec02/07/08)
function createSheetError(message, code = 1005, statusCode = null) {
  const merged = mapToMergedCode(code, 1005);
  const def = MERGED_RESPONSE_CODES[merged] || MERGED_RESPONSE_CODES[1005];
  const err = new Error(message || def.message);
  err.code = merged;
  err.statusCode = statusCode || def.httpStatus || 400;
  return err;
}

/**
 * Phản hồi thành công chuẩn Sheet: { code: "1000", message, data, ...extraTopLevel }
 */
const sheetSuccess = (res, data = {}, message = 'OK', statusCode = 200, extraTopLevel = null) => {
  const payload = {
    code: '1000',
    message: message || 'OK',
    data: data !== null && data !== undefined ? data : {},
  };
  if (extraTopLevel && typeof extraTopLevel === 'object') {
    Object.assign(payload, extraTopLevel);
  }
  return res.status(statusCode).json(payload);
};

/**
 * Phản hồi lỗi chuẩn Sheet Tab 3 (Bảng mã gộp): { code: "<merged>", message, data: {} }
 */
const sheetError = (res, message = null, statusCode = null, rawCode = 9999, data = {}) => {
<<<<<<< HEAD
  const merged = resolveMergedCode(rawCode, statusCode || 400);
=======
  const fallback = statusCode === 400 ? 1002 : statusCode === 404 ? 9992 : 9999;
  const merged = mapToMergedCode(rawCode, fallback);
>>>>>>> 0ad0325 (fix(backend): standardize sheetSuccess/merged response codes, fix docpat02 role_id & medrec02/07/08)
  const def = MERGED_RESPONSE_CODES[merged] || MERGED_RESPONSE_CODES[9999];
  return res.status(statusCode || def.httpStatus || 400).json({
    code: String(merged),
    message: message || def.message,
    data: data !== undefined ? data : {},
  });
};

// Tương thích các module cũ đang import successResponse / errorResponse
const successResponse = (res, data = null, message = 'OK', statusCode = 200) => {
  return sheetSuccess(res, data, message, statusCode);
};

<<<<<<< HEAD
const errorResponse = (res, message = 'Exception error.', statusCode = 500, code = null, error = null) => {
  const resolved = resolveMergedCode(code, statusCode, error);
  return sheetError(res, message, statusCode, resolved);
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
=======
const errorResponse = (res, message = 'Exception error.', statusCode = 500, code = null) => {
  const fallback = statusCode === 400 ? 1002 : statusCode === 404 ? 9992 : 9999;
  return sheetError(res, message, statusCode, code || fallback);
>>>>>>> 0ad0325 (fix(backend): standardize sheetSuccess/merged response codes, fix docpat02 role_id & medrec02/07/08)
};

module.exports = {
  MERGED_RESPONSE_CODES,
  DETAIL_TO_MERGED_CODE,
<<<<<<< HEAD
  LEGACY_TO_MERGED_CODE: DETAIL_TO_MERGED_CODE,
  mapToMergedCode,
  resolveMergedCode,
=======
  mapToMergedCode,
>>>>>>> 0ad0325 (fix(backend): standardize sheetSuccess/merged response codes, fix docpat02 role_id & medrec02/07/08)
  createSheetError,
  sheetSuccess,
  sheetError,
  successResponse,
  errorResponse,
  sheetRawSuccess,
  handleControllerError,
};
