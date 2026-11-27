const prisma = require('../../config/prisma');

const DEFAULT_TEMPLATES = [
  {
    codeTemplate: 'TMPL_URTICARIA_ACUTE',
    title: 'Mẫu bệnh án Mày đay Cấp tính',
    description: 'Bệnh án dành cho bệnh nhân có triệu chứng mày đay kéo dài dưới 6 tuần',
    sections: [
      {
        sectionName: 'Thông tin chung & Khởi phát',
        orderIndex: 1,
        questions: [
          {
            questionCode: 'ACUTE_DURATION_DAYS',
            questionText: 'Thời gian xuất hiện đợt mày đay hiện tại (số ngày)',
            questionType: 'NUMBER',
            isRequired: true,
            filledBy: 'patient',
            orderIndex: 1,
          },
          {
            questionCode: 'ACUTE_SUSPECTED_TRIGGER',
            questionText: 'Yếu tố nghi ngờ khởi phát (thức ăn, thuốc, côn trùng, nhiễm trùng...)',
            questionType: 'MULTI_SELECT',
            options: ['Thức ăn', 'Thuốc', 'Nhiễm trùng hô hấp/tiêu hóa', 'Côn trùng đốt', 'Tiếp xúc / Thời tiết', 'Không rõ'],
            isRequired: true,
            filledBy: 'patient',
            orderIndex: 2,
          },
          {
            questionCode: 'ACUTE_ANGIOEDEMA',
            questionText: 'Có kèm phù mạch (sưng môi, mí mắt, mặt, bàn tay/chân) không?',
            questionType: 'RADIO',
            options: ['Có', 'Không', 'Không rõ'],
            isRequired: true,
            filledBy: 'patient',
            orderIndex: 3,
          },
        ],
      },
      {
        sectionName: 'Tiền sử dị ứng & Bệnh lý kèm theo',
        orderIndex: 2,
        questions: [
          {
            questionCode: 'ALLERGY_DRUG',
            questionText: 'Tiền sử dị ứng thuốc trước đây',
            questionType: 'TEXT',
            isRequired: false,
            filledBy: 'both',
            orderIndex: 1,
          },
          {
            questionCode: 'INFECTION_SIGN',
            questionText: 'Có dấu hiệu nhiễm trùng gần đây (sốt, viêm họng, rối loạn tiêu hóa)?',
            questionType: 'RADIO',
            options: ['Có', 'Không'],
            isRequired: true,
            filledBy: 'both',
            orderIndex: 2,
          },
        ],
      },
    ],
  },
  {
    codeTemplate: 'TMPL_URTICARIA_CHRONIC_INIT',
    title: 'Mẫu bệnh án Mày đay Mạn tính - Khám lần đầu',
    description: 'Bệnh án dành cho bệnh nhân có triệu chứng mày đay kéo dài từ 6 tuần trở lên',
    sections: [
      {
        sectionName: 'Đặc điểm đợt bệnh mạn tính',
        orderIndex: 1,
        questions: [
          {
            questionCode: 'CHRONIC_DURATION_WEEKS',
            questionText: 'Tổng thời gian mắc mày đay đến hiện tại (tuần)',
            questionType: 'NUMBER',
            isRequired: true,
            filledBy: 'patient',
            orderIndex: 1,
          },
          {
            questionCode: 'CHRONIC_FREQUENCY',
            questionText: 'Tần suất xuất hiện sẩn phù trong tuần',
            questionType: 'SELECT',
            options: ['Hàng ngày', '4-6 ngày/tuần', '2-3 ngày/tuần', 'Dưới 2 ngày/tuần'],
            isRequired: true,
            filledBy: 'patient',
            orderIndex: 2,
          },
          {
            questionCode: 'CHRONIC_WHEAL_DURATION',
            questionText: 'Mỗi nốt sẩn phù tồn tại bao lâu thì lặn hoàn toàn?',
            questionType: 'SELECT',
            options: ['Dưới 1 giờ', '1 - 24 giờ', 'Trên 24 giờ (nghi viêm mạch)'],
            isRequired: true,
            filledBy: 'both',
            orderIndex: 3,
          },
          {
            questionCode: 'CHRONIC_INDUCIBLE_TRIGGER',
            questionText: 'Có xuất hiện khi gặp kích thích vật lý (gãi, lạnh, nóng, ánh nắng, tì đè, vận động)?',
            questionType: 'MULTI_SELECT',
            options: ['Vẽ nổi da (gãi/ma sát)', 'Lạnh', 'Nhiệt/Cholinergic', 'Tì đè muộn', 'Ánh sáng mặt trời', 'Nước', 'Không có (Tự phát CSU)'],
            isRequired: false,
            filledBy: 'both',
            orderIndex: 4,
          },
        ],
      },
      {
        sectionName: 'Điều trị trước đây & Bệnh nền',
        orderIndex: 2,
        questions: [
          {
            questionCode: 'PRIOR_ANTIHISTAMINE',
            questionText: 'Đã từng điều trị bằng thuốc kháng Histamin H1 chưa? Đáp ứng thế nào?',
            questionType: 'SELECT',
            options: ['Chưa điều trị', 'Liều chuẩn có đáp ứng', 'Tăng liều gấp 2-4 lần mới đỡ', 'Không đáp ứng'],
            isRequired: false,
            filledBy: 'both',
            orderIndex: 1,
          },
          {
            questionCode: 'THYROID_AUTOIMMUNE',
            questionText: 'Tiền sử bệnh lý tuyến giáp hoặc bệnh tự miễn?',
            questionType: 'RADIO',
            options: ['Có', 'Không', 'Chưa từng tầm soát'],
            isRequired: false,
            filledBy: 'both',
            orderIndex: 2,
          },
        ],
      },
    ],
  },
  {
    codeTemplate: 'TMPL_URTICARIA_FOLLOWUP',
    title: 'Mẫu phiếu Tái khám Mày đay',
    description: 'Phiếu theo dõi đáp ứng điều trị, điểm UCT/UAS7 và tác dụng phụ giữa các lần tái khám',
    sections: [
      {
        sectionName: 'Đánh giá đáp ứng điều trị',
        orderIndex: 1,
        questions: [
          {
            questionCode: 'FOLLOWUP_MED_ADHERENCE',
            questionText: 'Mức độ tuân thủ đơn thuốc trong đợt vừa qua',
            questionType: 'RADIO',
            options: ['Uống đều đúng chỉ định', 'Quên vài ngày', 'Tự ý ngưng thuốc'],
            isRequired: true,
            filledBy: 'patient',
            orderIndex: 1,
          },
          {
            questionCode: 'FOLLOWUP_SYMPTOM_CHANGE',
            questionText: 'Triệu chứng hiện tại so với lần khám trước',
            questionType: 'SELECT',
            options: ['Hết hoàn toàn', 'Giảm rõ rệt', 'Giảm ít', 'Không đổi', 'Nặng hơn'],
            isRequired: true,
            filledBy: 'patient',
            orderIndex: 2,
          },
          {
            questionCode: 'FOLLOWUP_SIDE_EFFECTS',
            questionText: 'Ghi nhận tác dụng không mong muốn (buồn ngủ, khô miệng, chóng mặt...)',
            questionType: 'TEXT',
            isRequired: false,
            filledBy: 'both',
            orderIndex: 3,
          },
        ],
      },
    ],
  },
];

let seededOnce = false;

async function ensureDefaultTemplatesSeeded() {
  if (seededOnce) {
    const existingCount = await prisma.template.count();
    if (existingCount >= DEFAULT_TEMPLATES.length) return;
  }

  for (const tpl of DEFAULT_TEMPLATES) {
    const existing = await prisma.template.findUnique({
      where: { codeTemplate: tpl.codeTemplate },
    });
    if (!existing) {
      await prisma.template.create({
        data: {
          codeTemplate: tpl.codeTemplate,
          title: tpl.title,
          description: tpl.description,
          isActive: true,
          version: 1,
          sections: {
            create: tpl.sections.map((sec) => ({
              sectionName: sec.sectionName,
              orderIndex: sec.orderIndex,
              questions: {
                create: sec.questions.map((q) => ({
                  questionCode: q.questionCode,
                  questionText: q.questionText,
                  questionType: q.questionType,
                  options: q.options || undefined,
                  isRequired: Boolean(q.isRequired),
                  filledBy: q.filledBy || 'both',
                  orderIndex: q.orderIndex,
                })),
              },
            })),
          },
        },
      });
    }
  }
  seededOnce = true;
}

const CODE_ALIAS_MAP = {
  URTICARIA_ACUTE: 'TMPL_URTICARIA_ACUTE',
  TMPL_URT_ACUTE: 'TMPL_URTICARIA_ACUTE',
  CAP: 'TMPL_URTICARIA_ACUTE',
  ACUTE: 'TMPL_URTICARIA_ACUTE',
  URTICARIA_CHRONIC_INIT: 'TMPL_URTICARIA_CHRONIC_INIT',
  TMPL_URT_CHRONIC: 'TMPL_URTICARIA_CHRONIC_INIT',
  MAN: 'TMPL_URTICARIA_CHRONIC_INIT',
  CHRONIC: 'TMPL_URTICARIA_CHRONIC_INIT',
  URTICARIA_FOLLOWUP: 'TMPL_URTICARIA_FOLLOWUP',
  TMPL_URT_FOLLOWUP: 'TMPL_URTICARIA_FOLLOWUP',
  FOLLOWUP: 'TMPL_URTICARIA_FOLLOWUP',
  TAI_KHAM: 'TMPL_URTICARIA_FOLLOWUP',
};

async function listTemplates(query = {}) {
  await ensureDefaultTemplatesSeeded();
  const page = Math.max(1, parseInt(query.page || 1, 10) || 1);
  const limit = Math.min(100, Math.max(1, parseInt(query.limit || 50, 10) || 50));
  return prisma.template.findMany({
    where: { isActive: true },
    orderBy: { id: 'asc' },
    skip: (page - 1) * limit,
    take: limit,
    include: {
      sections: {
        orderBy: { orderIndex: 'asc' },
        include: {
          questions: { orderBy: { orderIndex: 'asc' } },
        },
      },
    },
  });
}

function formatTemplateListItem(t) {
  return {
    code_template: t.codeTemplate,
    name: t.title,
    description: t.description ?? null,
    version: String(t.version ?? 1),
    is_active: t.isActive ? '1' : '0',
    created_at: t.createdAt ? new Date(t.createdAt).toISOString() : null,
  };
}

function formatTemplateDetail(t) {
  return {
    code_template: t.codeTemplate,
    name: t.title,
    sections: (t.sections || []).map((s) => ({
      section_id: String(s.id),
      title: s.sectionName,
      questions: (s.questions || []).map((q) => {
        const opts = Array.isArray(q.options) ? q.options : [];
        return {
          question_id: q.questionCode || String(q.id),
          question_text: q.questionText,
          type_question: String(q.questionType || 'text').toLowerCase(),
          options: opts.map((opt, idx) => {
            if (typeof opt === 'string') {
              return { id: String(idx + 1), option_text: opt, option_value: opt };
            }
            return {
              id: String(opt.id || idx + 1),
              option_text: opt.option_text || opt.label || String(opt.value || ''),
              option_value: opt.option_value || opt.value || opt.label || '',
            };
          }),
        };
      }),
    })),
  };
}

async function getTemplateByIdOrCode(idOrCode) {
  await ensureDefaultTemplatesSeeded();
  const raw = String(idOrCode || '').trim();
  const numeric = /^\d+$/.test(raw) ? parseInt(raw, 10) : null;

  const includeTree = {
    sections: {
      orderBy: { orderIndex: 'asc' },
      include: {
        questions: { orderBy: { orderIndex: 'asc' } },
      },
    },
  };

  if (numeric !== null) {
    const byId = await prisma.template.findUnique({
      where: { id: numeric },
      include: includeTree,
    });
    if (byId) return byId;

    // Fallback nếu bảng templates trước đó đã từng có seed khác ID 1/2/3
    const all = await prisma.template.findMany({ orderBy: { id: 'asc' }, include: includeTree });
    if (numeric >= 1 && numeric <= all.length) return all[numeric - 1];
    return null;
  }

  const mappedCode = CODE_ALIAS_MAP[raw.toUpperCase()] || raw;
  return prisma.template.findUnique({
    where: { codeTemplate: mappedCode },
    include: includeTree,
  });
}

module.exports = {
  ensureDefaultTemplatesSeeded,
  listTemplates,
  getTemplateByIdOrCode,
  formatTemplateListItem,
  formatTemplateDetail,
  CODE_ALIAS_MAP,
};

