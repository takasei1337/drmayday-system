const express = require('express');
const router = express.Router();
const adminRbacController = require('./adminRbac.controller');
const { authenticate, authorize } = require('../../middlewares/auth.middleware');

// Áp dụng authenticate + authorize(['ADMIN']) trên từng route cụ thể để không chặn các router khác mount cùng /api hoặc /api/v1
const requireAdmin = [authenticate, authorize(['ADMIN'])];

// Admin Users & Staff Assignment
router.post('/admin/users', ...requireAdmin, adminRbacController.createUser);
router.get('/admin/users', ...requireAdmin, adminRbacController.listUsers);
router.get('/admin/users/:id', ...requireAdmin, adminRbacController.getUserById);
router.put('/admin/users/:id', ...requireAdmin, adminRbacController.updateUser);
router.delete('/admin/users/:id', ...requireAdmin, adminRbacController.deleteUser);
router.put('/admin/users/:id/assign', ...requireAdmin, adminRbacController.assignStaff);

// Roles
router.post('/roles', ...requireAdmin, adminRbacController.createRole);
router.get('/roles', ...requireAdmin, adminRbacController.listRoles);

// Permissions
router.post('/permissions', ...requireAdmin, adminRbacController.createPermission);
router.get('/permissions', ...requireAdmin, adminRbacController.listPermissions);
router.put('/permissions/:id', ...requireAdmin, adminRbacController.updatePermission);
router.delete('/permissions/:id', ...requireAdmin, adminRbacController.deletePermission);

// Role-Permissions
router.post('/role_permissions', ...requireAdmin, adminRbacController.assignRolePermissions);
router.post('/role-permissions', ...requireAdmin, adminRbacController.assignRolePermissions);
router.get('/role_permissions/:role_id', ...requireAdmin, adminRbacController.getRolePermissions);
router.get('/role-permissions/:role_id', ...requireAdmin, adminRbacController.getRolePermissions);
router.delete('/role_permissions/:role_id/:permission_id', ...requireAdmin, adminRbacController.revokeRolePermission);
router.delete('/role-permissions/:role_id/:permission_id', ...requireAdmin, adminRbacController.revokeRolePermission);

module.exports = router;
