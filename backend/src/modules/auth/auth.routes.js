const express = require('express');
const router = express.Router();
const authController = require('./auth.controller');
const { authenticate, authorize } = require('../../middlewares/auth.middleware');

// 1.1 Đăng ký tài khoản (Sheet 1.1 signup)
router.post('/signup', authController.signup);
router.post('/register', authController.signup);
router.post('/register-patient', authController.signup);

// 1.2 Đăng nhập (Sheet 1.2 login)
router.post('/login', authController.login);

// 1.3 Đăng xuất (Sheet 1.3 logout)
router.post('/logout', authenticate, authController.logout);

// 1.4 Quên mật khẩu (Sheet 1.4 forgot_password)
router.post('/forgot_password', authController.forgotPassword);
router.post('/forgot-password', authController.forgotPassword);

// 1.5 Đổi mật khẩu (Sheet 1.5 change_password)
router.post('/change_password', authenticate, authController.changePassword);
router.post('/change-password', authenticate, authController.changePassword);

// 1.6 Admin tạo nhân viên y tế (Sheet 1.6 create_staff)
router.post('/create_staff', authenticate, authorize(['ADMIN']), authController.createStaff);
router.post('/create-staff', authenticate, authorize(['ADMIN']), authController.createStaff);

// Lấy thông tin tài khoản hiện tại (Authenticated Profile)
router.get('/me', authenticate, authController.getMe);

module.exports = router;
