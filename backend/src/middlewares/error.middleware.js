const { errorResponse } = require('../common/response');

const errorHandler = (err, req, res, next) => {
  console.error('[Unhandled Error]', err);

  const statusCode = err.statusCode || 500;
  const message = err.message || 'Lỗi máy chủ nội bộ';

  return errorResponse(res, message, statusCode, process.env.NODE_ENV === 'development' ? err.stack : null);
};

const notFoundHandler = (req, res) => {
  return errorResponse(res, `Đường dẫn [${req.method}] ${req.originalUrl} không tồn tại`, 404);
};

module.exports = {
  errorHandler,
  notFoundHandler,
};
