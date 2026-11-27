const { errorResponse, resolveMergedCode } = require('../common/response');

const errorHandler = (err, req, res, next) => {
  console.error('[Unhandled Error]', err);

  const code = resolveMergedCode(err.code, err.statusCode || 500, err);
  const statusCode = err.statusCode || (code === 1001 ? 503 : 500);
  const message = err.message || 'Lỗi máy chủ nội bộ';
  const detail = process.env.NODE_ENV === 'development' ? err.stack : null;

  return errorResponse(res, message, statusCode, code, detail);
};

const notFoundHandler = (req, res) => {
  return errorResponse(res, `Đường dẫn [${req.method}] ${req.originalUrl} không tồn tại`, 404, 9994);
};

module.exports = {
  errorHandler,
  notFoundHandler,
};
