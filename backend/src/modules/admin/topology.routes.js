const express = require('express');
const topologyController = require('./topology.controller');
const { authenticate, authorize } = require('../../middlewares/auth.middleware');

const router = express.Router();

// Branches (Chi nhánh)
router.post('/branches', authenticate, authorize(['ADMIN']), topologyController.createBranch);
router.get('/branches', authenticate, topologyController.listBranches);
router.get('/branches/:id', authenticate, topologyController.getBranchById);
router.put('/branches/:id', authenticate, authorize(['ADMIN']), topologyController.updateBranch);
router.delete('/branches/:id', authenticate, authorize(['ADMIN']), topologyController.deleteBranch);

// Departments (Chuyên khoa / Phòng ban)
router.post('/departments', authenticate, authorize(['ADMIN']), topologyController.createDepartment);
router.get('/departments', authenticate, topologyController.listDepartments);
router.get('/departments/:id', authenticate, topologyController.getDepartmentById);
router.put('/departments/:id', authenticate, authorize(['ADMIN']), topologyController.updateDepartment);
router.delete('/departments/:id', authenticate, authorize(['ADMIN']), topologyController.deleteDepartment);

// Rooms (Phòng khám)
router.post('/rooms', authenticate, authorize(['ADMIN']), topologyController.createRoom);
router.get('/rooms', authenticate, topologyController.listRooms);
router.get('/rooms/:id', authenticate, topologyController.getRoomById);
router.put('/rooms/:id', authenticate, authorize(['ADMIN']), topologyController.updateRoom);
router.delete('/rooms/:id', authenticate, authorize(['ADMIN']), topologyController.deleteRoom);

module.exports = router;
