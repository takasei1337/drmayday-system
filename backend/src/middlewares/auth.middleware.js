const jwt = require('jsonwebtoken');
const { sheetError } = require('../common/response');
const prisma = require('../config/prisma');

/**
 * Middleware xác thực người dùng qua JWT & kiểm tra Token Blacklist trên Sub DB.
 * Mã lỗi chuẩn Tab 3 (Bảng mã gộp): 9998 (Token is invalid.), 1009 (Not access.)
 */
const authenticate = async (req, res, next) => {
  const authHeader = req.headers['authorization'];
  if (!authHeader) {
    return sheetError(res, 'Token is invalid. (Thiếu header Authorization)', 401, 9998);
  }

  const parts = authHeader.split(' ');
  if (parts.length !== 2 || parts[0] !== 'Bearer') {
    return sheetError(res, 'Token is invalid. (Sai định dạng Bearer <token>)', 401, 9998);
  }

  const token = parts[1];

  try {
    const decoded = jwt.verify(token, process.env.JWT_SECRET || 'mayday_super_secret_jwt_key_2026');

    try {
      const blacklisted = await prisma.tokenBlacklist.findUnique({
        where: { token },
      });

      if (blacklisted) {
        return sheetError(res, 'Token is invalid. (Token đã bị thu hồi)', 401, 9998);
      }
    } catch (dbErr) {
      if (process.env.NODE_ENV === 'development') {
        console.warn('[Token Blacklist Warning]', dbErr.message);
      }
    }

    req.token = token;
    req.user = decoded;
    return next();
  } catch (err) {
    if (err.name === 'TokenExpiredError') {
      return sheetError(res, 'Token is invalid. (Token đã hết hạn)', 401, 9998);
    }
    return sheetError(res, 'Token is invalid.', 401, 9998);
  }
};

/**
 * Middleware kiểm tra vai trò (RBAC). Trả mã gộp 1009 (Not access.) khi không đủ quyền.
 */
const authorize = (roles = []) => {
  return (req, res, next) => {
    if (!req.user) {
      return sheetError(res, 'Token is invalid.', 401, 9998);
    }

    if (roles.length > 0) {
      const userRole = (req.user.vai_tro || '').toLowerCase().trim();
      const allowedRoles = roles.map((r) => r.toLowerCase().trim());

      if (!allowedRoles.includes(userRole)) {
        return sheetError(
          res,
          `Not access. Yêu cầu vai trò: ${roles.join(', ')}`,
          403,
          1009
        );
      }
    }

    return next();
  };
};

module.exports = {
  authenticate,
  authorize,
};
