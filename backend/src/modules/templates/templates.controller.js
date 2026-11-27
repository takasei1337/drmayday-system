const templatesService = require('./templates.service');
const { sheetSuccess } = require('../../common/response');

class TemplatesController {
  /**
   * 1. GET /api/templates/all
   */
  async listTemplates(req, res, next) {
    try {
      const data = await templatesService.listTemplates(req.query);
      return sheetSuccess(res, data, 'OK', 200);
    } catch (err) {
      return next(err);
    }
  }

  /**
   * 2. GET /api/templates/:id
   */
  async getTemplateDetail(req, res, next) {
    try {
      const data = await templatesService.getTemplateDetail(req.params.id);
      return sheetSuccess(res, data, 'OK', 200);
    } catch (err) {
      return next(err);
    }
  }

  /**
   * 3. POST /api/templates
   */
  async createTemplate(req, res, next) {
    try {
      const data = await templatesService.createTemplate(req.body);
      return sheetSuccess(res, data, 'Tạo mẫu phiếu khám thành công', 201);
    } catch (err) {
      return next(err);
    }
  }

  /**
   * 4. PUT /api/templates/:id
   */
  async updateTemplate(req, res, next) {
    try {
      const data = await templatesService.updateTemplate(req.params.id, req.body);
      return sheetSuccess(res, data, 'Cập nhật mẫu thành công', 200);
    } catch (err) {
      return next(err);
    }
  }

  /**
   * 5. DELETE /api/templates/:id
   */
  async deleteTemplate(req, res, next) {
    try {
      const data = await templatesService.deleteTemplate(req.params.id);
      return sheetSuccess(res, data, 'Xóa mẫu thành công', 200);
    } catch (err) {
      return next(err);
    }
  }

  /**
   * 6. POST /api/templates/:template_id/sections
   */
  async createSection(req, res, next) {
    try {
      const data = await templatesService.createSection(req.params.template_id, req.body);
      return sheetSuccess(res, data, 'Tạo section thành công', 201);
    } catch (err) {
      return next(err);
    }
  }

  /**
   * 7. PUT /api/templates/sections/:id
   */
  async updateSection(req, res, next) {
    try {
      const data = await templatesService.updateSection(req.params.id, req.body);
      return sheetSuccess(res, data, 'Cập nhật section thành công', 200);
    } catch (err) {
      return next(err);
    }
  }

  /**
   * 8. DELETE /api/templates/sections/:id
   */
  async deleteSection(req, res, next) {
    try {
      const data = await templatesService.deleteSection(req.params.id);
      return sheetSuccess(res, data, 'Xóa section thành công', 200);
    } catch (err) {
      return next(err);
    }
  }

  /**
   * 9. POST /api/templates/sections/:section_id/questions
   */
  async createQuestion(req, res, next) {
    try {
      const data = await templatesService.createQuestion(req.params.section_id, req.body);
      return sheetSuccess(res, data, 'Tạo câu hỏi thành công', 201);
    } catch (err) {
      return next(err);
    }
  }

  /**
   * 10. PUT /api/templates/questions/:id
   */
  async updateQuestion(req, res, next) {
    try {
      const data = await templatesService.updateQuestion(req.params.id, req.body);
      return sheetSuccess(res, data, 'Cập nhật câu hỏi thành công', 200);
    } catch (err) {
      return next(err);
    }
  }

  /**
   * 11. DELETE /api/templates/questions/:id
   */
  async deleteQuestion(req, res, next) {
    try {
      const data = await templatesService.deleteQuestion(req.params.id);
      return sheetSuccess(res, data, 'Xóa câu hỏi thành công', 200);
    } catch (err) {
      return next(err);
    }
  }
}

module.exports = new TemplatesController();
