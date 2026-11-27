const express = require('express');
const router = express.Router();
const templatesController = require('./templates.controller');
const { authenticate, authorize } = require('../../middlewares/auth.middleware');

const requireAdmin = [authenticate, authorize(['ADMIN'])];

// Static & specific nested paths MUST precede parameterized /:id routes
router.get('/all', authenticate, templatesController.listTemplates);

// Sections (specific /sections/:id & /sections/:section_id/questions before /:id)
router.put('/sections/:id', ...requireAdmin, templatesController.updateSection);
router.delete('/sections/:id', ...requireAdmin, templatesController.deleteSection);
router.post('/sections/:section_id/questions', ...requireAdmin, templatesController.createQuestion);

// Questions
router.put('/questions/:id', ...requireAdmin, templatesController.updateQuestion);
router.delete('/questions/:id', ...requireAdmin, templatesController.deleteQuestion);

// Nested sections under template
router.post('/:template_id/sections', ...requireAdmin, templatesController.createSection);

// Templates CRUD
router.get('/:id', authenticate, templatesController.getTemplateDetail);
router.post('/', ...requireAdmin, templatesController.createTemplate);
router.put('/:id', ...requireAdmin, templatesController.updateTemplate);
router.delete('/:id', ...requireAdmin, templatesController.deleteTemplate);

module.exports = router;
