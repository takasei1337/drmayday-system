const authService = require('./auth.service');
const { successResponse, errorResponse } = require('../../common/response');

class AuthController {
  /**
   * 1.1 Đăng ký tài khoản (Sheet 1.1 signup)
   */
  async signup(req, res, next) {
    try {
      const data = await authService.signup(req.body);
      return successResponse(res, data, 'Created successfully', 201, 1000);
    } catch (err) {
      if (err.code) {
        return errorResponse(res, err.message, err.statusCode || 400, err.code);
      }
      next(err);
    }
  }

  /**
   * 1.2 Đăng nhập (Sheet 1.2 login)
   */
  async login(req, res, next) {
    try {
      const { phone, password, ten_dang_nhap, mat_khau, so_dien_thoai } = req.body;
      const usernameOrPhone = phone || ten_dang_nhap || so_dien_thoai;
      const pass = password || mat_khau;

      const data = await authService.login(usernameOrPhone, pass);
      return successResponse(res, data, 'Đăng nhập thành công', 200, 1000);
    } catch (err) {
      if (err.code) {
        return errorResponse(res, err.message, err.statusCode || 400, err.code);
      }
      next(err);
    }
  }

  /**
   * 1.3 Đăng xuất (Sheet 1.3 logout)
   */
  async logout(req, res, next) {
    try {
      await authService.logout(req.token, req.user);
      return successResponse(res, {}, 'Đăng xuất thành công', 200, 1000);
    } catch (err) {
      if (err.code) {
        return errorResponse(res, err.message, err.statusCode || 400, err.code);
      }
      next(err);
    }
  }

  /**
   * 1.4 Quên mật khẩu (Sheet 1.4 forgot_password)
   */
  async forgotPassword(req, res, next) {
    try {
      const { phone, so_dien_thoai } = req.body;
      const targetPhone = phone || so_dien_thoai;
      const data = await authService.forgotPassword(targetPhone);
      return successResponse(res, data, 'Đã gửi hướng dẫn khôi phục mật khẩu', 200, 1000);
    } catch (err) {
      if (err.code) {
        return errorResponse(res, err.message, err.statusCode || 400, err.code);
      }
      next(err);
    }
  }

  /**
   * 1.5 Đổi mật khẩu (Sheet 1.5 change_password)
   */
  async changePassword(req, res, next) {
    try {
      const { old_password, new_password, confirm_password, mat_khau_cu, mat_khau_moi, xac_nhan_mat_khau } =
        req.body;
      const oldPass = old_password || mat_khau_cu;
      const newPass = new_password || mat_khau_moi;
      const confirmPass = confirm_password || xac_nhan_mat_khau;

      const data = await authService.changePassword(req.user.ma_tai_khoan, oldPass, newPass, confirmPass);
      return successResponse(res, data, 'Đổi mật khẩu thành công', 200, 1000);
    } catch (err) {
      if (err.code) {
        return errorResponse(res, err.message, err.statusCode || 400, err.code);
      }
      next(err);
    }
  }

  /**
   * 1.6 Admin tạo nhân viên y tế (Sheet 1.6 create_staff)
   */
  async createStaff(req, res, next) {
    try {
      const data = await authService.createStaff(req.body);
      return successResponse(res, data, 'Tạo tài khoản nhân viên y tế thành công', 201, 1000);
    } catch (err) {
      if (err.code) {
        return errorResponse(res, err.message, err.statusCode || 400, err.code);
      }
      next(err);
    }
  }

  /**
   * Lấy thông tin cá nhân hiện tại
   */
  async getMe(req, res, next) {
    try {
      const data = await authService.getProfile(req.user.ma_tai_khoan);
      return successResponse(res, data, 'Lấy thông tin tài khoản thành công', 200, 1000);
    } catch (err) {
      if (err.code) {
        return errorResponse(res, err.message, err.statusCode || 400, err.code);
      }
      next(err);
    }
  }
}

module.exports = new AuthController();
