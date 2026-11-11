/**
 * Response Helper chuẩn hóa đầu ra cho toàn bộ API theo chuẩn Google Sheet (Mã 1000 | OK)
 */
const successResponse = (res, data = null, message = 'OK', statusCode = 200, code = 1000) => {
  return res.status(statusCode).json({
    code: code || 1000,
    message: message || 'OK',
    data: data !== null && data !== undefined ? data : {},
    success: true,
  });
};

const errorResponse = (res, message = 'Có lỗi xảy ra', statusCode = 500, code = null, error = null) => {
  return res.status(statusCode).json({
    code: code || (statusCode === 400 ? 1002 : statusCode === 404 ? 4002 : 9999),
    message,
    error: error ? (error.message || error) : null,
    success: false,
  });
};

module.exports = {
  successResponse,
  errorResponse,
};
