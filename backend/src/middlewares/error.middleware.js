const { sheetError } = require('../common/response');

const DB_ERROR_CODES = new Set(['ECONNREFUSED', 'ETIMEDOUT', 'ENOTFOUND', '28P01', '3D000', '08001', '08006', '57P01']);

function isDbError(err) {
  if (!err) return false;
  if (err.code && DB_ERROR_CODES.has(String(err.code))) return true;
  if (err.name === 'PrismaClientInitializationError') return true;
  return false;
}

const errorHandler = (err, req, res, next) => {
  if (err && err.type === 'entity.parse.failed') {
    return sheetError(res, 'Parameter type is invalid. (Body JSON không hợp lệ)', 400, 1003);
  }

  if (err && err.code) {
    if (isDbError(err)) {
      return sheetError(res, 'Can not connect to DB.', 500, 1001);
    }
    // PostgreSQL FK / Check / Unique errors nếu lọt xuống middleware
    if (err.code === '23505') {
      return sheetError(res, 'User existed.', 409, 9996);
    }
    if (err.code === '23503') {
      return sheetError(res, 'Post is not existed / Foreign key constraint', 400, 1004);
    }
    if (err.code === '23514' || err.code === '22P02') {
      return sheetError(res, err.message || 'Parameter value is invalid.', 400, 1004);
    }
    return sheetError(res, err.message, err.statusCode || 400, err.code);
  }

  console.error('[Unhandled Error]', err);
  const statusCode = err?.statusCode || 500;
  const message = err?.message || 'Exception error.';
  return sheetError(res, message, statusCode, 9999);
};

const notFoundHandler = (req, res) => {
  return sheetError(res, `Method/Route [${req.method}] ${req.originalUrl} is invalid`, 404, 9997);
};

module.exports = {
  errorHandler,
  notFoundHandler,
};
