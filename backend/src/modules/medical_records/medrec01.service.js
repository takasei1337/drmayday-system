const prisma = require('../../config/prisma');

const DEFAULT_CLASSIFY_QUESTIONS = [
  {
    questionId: 'Q_CLASSIFY_01',
    questionText: 'Bạn đã từng khám bệnh mày đay tại phòng khám trước đây chưa?',
    typeQuestion: 'radio',
    orderIndex: 1,
    options: [
      { optionText: 'Chưa từng khám (Khám lần đầu)', optionValue: 'NEW' },
      { optionText: 'Đã từng khám (Tái khám)', optionValue: 'FOLLOW_UP' },
    ],
  },
  {
    questionId: 'Q_CLASSIFY_02',
    questionText: 'Tình trạng nổi mẩn ngứa / sẩn phù của bạn đã kéo dài bao lâu?',
    typeQuestion: 'radio',
    orderIndex: 2,
    options: [
      { optionText: 'Dưới 6 tuần (Mày đay cấp tính)', optionValue: 'ACUTE' },
      { optionText: 'Từ 6 tuần trở lên (Mày đay mạn tính)', optionValue: 'CHRONIC' },
    ],
  },
];

class Medrec01Service {
  /**
   * Đảm bảo dữ liệu câu hỏi sàng lọc mẫu tồn tại trong bảng questions & question_options (Sub DB)
   */
  async ensureSeedData() {
    const count = await prisma.classifyQuestion.count();
    if (count > 0) return;

    for (const q of DEFAULT_CLASSIFY_QUESTIONS) {
      await prisma.classifyQuestion.create({
        data: {
          questionId: q.questionId,
          questionText: q.questionText,
          typeQuestion: q.typeQuestion,
          orderIndex: q.orderIndex,
          options: {
            create: q.options,
          },
        },
      });
    }
  }

  /**
   * medrec01: Lấy danh sách câu hỏi phân loại bệnh án
   * Căn cứ: Slide 5 (trang 13-15) & Sheet GET apimedical_recordsclassify-
   */
  async getClassifyQuestions() {
    await this.ensureSeedData();

    const questions = await prisma.classifyQuestion.findMany({
      orderBy: { orderIndex: 'asc' },
      include: {
        options: {
          orderBy: { id: 'asc' },
        },
      },
    });

    return questions.map((q) => ({
      question_id: q.questionId,
      question_text: q.questionText,
      type_question: q.typeQuestion,
      options: q.options.map((opt) => ({
        id: opt.id,
        option_text: opt.optionText,
        option_value: opt.optionValue,
      })),
    }));
  }
}

module.exports = new Medrec01Service();

