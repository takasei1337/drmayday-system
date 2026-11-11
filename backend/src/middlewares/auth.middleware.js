const jwt = require('jsonwebtoken');
const { errorResponse } = require('../common/response');
const prisma = require('../config/prisma');

/**
 * Middleware xác thực người dùng qua JWT thật & kiểm tra Token Blacklist trên Sub DB
 */
const authenticate = async (req, res, next) => {
  const authHeader = req.headers['authorization'];
  if (!authHeader) {
    return errorResponse(res, 'Chưa đăng nhập (Thiếu header Authorization)', 401, 3003);
  }

  const parts = authHeader.split(' ');
  if (parts.length !== 2 || parts[0] !== 'Bearer') {
    return errorResponse(res, 'Định dạng token không đúng chuẩn: Bearer <token>', 401, 3001);
  }

  const token = parts[1];

  try {
    const decoded = jwt.verify(token, process.env.JWT_SECRET || 'mayday_super_secret_jwt_key_2026');

    // Kiểm tra Token Blacklist trên Sub Database (Supabase qua Prisma)
    try {
      const blacklisted = await prisma.tokenBlacklist.findUnique({
        where: { token },
      });

      if (blacklisted) {
        return errorResponse(res, 'Token này đã bị thu hồi do đăng xuất. Vui lòng đăng nhập lại.', 401, 3001);
      }
    } catch (dbErr) {
      if (process.env.NODE_ENV === 'development') {
        console.warn('[Token Blacklist Warning] Chưa thể kiểm tra blacklist trên Sub DB:', dbErr.message);
      }
    }

    req.token = token;
    req.user = decoded;
    return next();
  } catch (err) {
    if (err.name === 'TokenExpiredError') {
      return errorResponse(res, 'Token đã hết hạn, vui lòng đăng nhập lại', 401, 3002);
    }
    return errorResponse(res, 'Token không hợp lệ hoặc đã bị thay đổi', 401, 3001);
  }
};

/**
 * Middleware kiểm tra vai trò (Role-Based Access Control)
 * Hỗ trợ so sánh không phân biệt hoa/thường ('admin', 'ADMIN', 'bac_si', 'BAC_SI' đều hợp lệ)
 * @param {Array<string>} roles Danh sách vai trò hợp lệ (VD: ['admin', 'bac_si'])
 */
const authorize = (roles = []) => {
  return (req, res, next) => {
    if (!req.user) {
      return errorResponse(res, 'Người dùng chưa được xác thực', 401, 3003);
    }

    if (roles.length > 0) {
      const userRole = (req.user.vai_tro || '').toLowerCase().trim();
      const allowedRoles = roles.map(r => r.toLowerCase().trim());

      if (!allowedRoles.includes(userRole)) {
        const isNeedAdmin = allowedRoles.includes('admin');
        return errorResponse(
          res,
          `Quyền truy cập bị từ chối. Chức năng yêu cầu quyền: ${roles.join(', ')}`,
          403,
          isNeedAdmin ? 3102 : 3101
        );
      }
    }

    next();
  };
};

module.exports = {
  authenticate,
  authorize,
};
