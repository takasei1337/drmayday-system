const prisma = require('../../config/prisma');
const medrec01Service = require('./medrec01.service');
const { createBusinessError } = require('./medical_records.helper');

class Medrec02Service {
  /**
   * Mapping câu trả lời sàng lọc sang mã code_template tương ứng trên Sub DB
   */
  resolveTemplateCode(answerMap) {
    const historyVal = answerMap.Q_CLASSIFY_01;
    const durationVal = answerMap.Q_CLASSIFY_02;

    if (historyVal === 'FOLLOW_UP') {
      return 'TMPL_URTICARIA_FOLLOWUP';
    }
    if (durationVal === 'CHRONIC') {
      return 'TMPL_URTICARIA_CHRONIC_INIT';
    }
    return 'TMPL_URTICARIA_ACUTE';
  }

  /**
   * medrec02: Tiếp nhận câu trả lời phân loại & trả về template_id kèm cấu trúc template
   * Căn cứ: Slide 5 (trang 16-18) & Sheet POST apimedical_recordsclassify
   */
  async classifyMedicalRecord(answers) {
    await medrec01Service.ensureSeedData();

    const allQuestions = await prisma.classifyQuestion.findMany({
      orderBy: { orderIndex: 'asc' },
      include: { options: true },
    });

    if (!Array.isArray(answers) || answers.length === 0) {
      throw createBusinessError('Classification options incomplete', 4006, 400);
    }

    // Chuẩn hóa danh sách câu trả lời client gửi lên
    const answerMap = {};
    for (const item of answers) {
      if (!item || typeof item.question_id !== 'string' || typeof item.option_value !== 'string') {
        continue;
      }
      const qId = item.question_id.trim();
      const optVal = item.option_value.trim().toUpperCase();
      if (qId && optVal) {
        answerMap[qId] = optVal;
      }
    }

    // Kiểm tra phải trả lời đủ toàn bộ câu hỏi sàng lọc và giá trị phải hợp lệ
    for (const q of allQuestions) {
      const selectedVal = answerMap[q.questionId];
      if (!selectedVal) {
        throw createBusinessError('Classification options incomplete', 4006, 400);
      }
      const validValues = q.options.map((opt) => opt.optionValue.trim().toUpperCase());
      if (!validValues.includes(selectedVal)) {
        throw createBusinessError('Classification options incomplete', 4006, 400);
      }
    }

    const targetCodeTemplate = this.resolveTemplateCode(answerMap);

    const template = await prisma.template.findFirst({
      where: {
        codeTemplate: targetCodeTemplate,
        isActive: true,
      },
      include: {
        sections: {
          orderBy: { orderIndex: 'asc' },
          include: {
            questions: {
              orderBy: { orderIndex: 'asc' },
            },
          },
        },
      },
    });

    if (!template) {
      throw createBusinessError('Template not found', 4101, 404);
    }

    return {
      id: template.id,
      template_id: template.codeTemplate,
      template_name: template.title,
      description: template.description,
      version: template.version,
      sections: template.sections.map((sec) => ({
        section_id: sec.id,
        title: sec.sectionName,
        order_index: sec.orderIndex,
        questions: sec.questions.map((ques) => ({
          question_id: ques.id,
          question_text: ques.questionText,
          type_question: ques.questionType,
          options: ques.options,
          is_required: ques.isRequired,
          order_index: ques.orderIndex,
        })),
      })),
    };
  }
}

module.exports = new Medrec02Service();

