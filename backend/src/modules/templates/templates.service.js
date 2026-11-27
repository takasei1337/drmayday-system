const prisma = require('../../config/prisma');
const { createSheetError } = require('../../common/response');

const ALLOWED_FILLED_BY = new Set(['patient', 'doctor', 'patdoc', 'both']);
const MAX_INT32 = 2147483647;

function isPositiveInt32(val) {
  const str = String(val).trim();
  if (!/^\d+$/.test(str)) return false;
  const num = Number(str);
  return Number.isSafeInteger(num) && num > 0 && num <= MAX_INT32;
}

function parseBoolFlag(value, defaultValue = false, fieldName = 'flag') {
  if (value === undefined || value === null || value === '') {
    return defaultValue;
  }
  if (typeof value === 'boolean') return value;
  if (typeof value === 'number') {
    if (value === 1) return true;
    if (value === 0) return false;
  }
  if (typeof value === 'string') {
    const normalized = value.trim().toLowerCase();
    if (normalized === '1' || normalized === 'true') return true;
    if (normalized === '0' || normalized === 'false') return false;
  }
  throw createSheetError(`Giá trị ${fieldName} không hợp lệ (chỉ nhận "0" hoặc "1")`, 1004, 400);
}

function parseNonNegativeInt(value, fieldName) {
  if (value === undefined || value === null || String(value).trim() === '') {
    throw createSheetError(`Thiếu tham số bắt buộc: ${fieldName}`, 1002, 400);
  }
  if (typeof value === 'boolean' || typeof value === 'object') {
    throw createSheetError(`Kiểu dữ liệu ${fieldName} không hợp lệ`, 1003, 400);
  }
  const str = String(value).trim();
  if (!/^-?\d+$/.test(str)) {
    throw createSheetError(`Giá trị ${fieldName} phải là số nguyên`, 1004, 400);
  }
  const num = Number(str);
  if (!Number.isSafeInteger(num) || num < 0 || num > MAX_INT32) {
    throw createSheetError(`Giá trị ${fieldName} không hợp lệ`, 1004, 400);
  }
  return num;
}

function parseVersionInput(versionInput, defaultText = '1.0') {
  if (versionInput === undefined || versionInput === null || String(versionInput).trim() === '') {
    return { versionText: defaultText, versionInt: 1 };
  }
  if (typeof versionInput === 'object' || typeof versionInput === 'boolean') {
    throw createSheetError('Kiểu dữ liệu version không hợp lệ', 1003, 400);
  }
  const versionText = String(versionInput).trim();
  const normalized = versionText.replace(/^v/i, '');
  if (!/^\d+(\.\d+)*$/.test(normalized)) {
    throw createSheetError('Giá trị version không hợp lệ (VD: "1.0")', 1004, 400);
  }
  const major = parseInt(normalized.split('.')[0], 10);
  const versionInt = Number.isSafeInteger(major) && major > 0 && major <= MAX_INT32 ? major : 1;
  return { versionText, versionInt };
}

function parseFilledBy(value, defaultValue = 'patient') {
  if (value === undefined || value === null || String(value).trim() === '') {
    return defaultValue;
  }
  if (typeof value !== 'string') {
    throw createSheetError('Kiểu dữ liệu filled_by không hợp lệ', 1003, 400);
  }
  const normalized = value.trim().toLowerCase();
  if (!ALLOWED_FILLED_BY.has(normalized)) {
    throw createSheetError(
      'Giá trị filled_by không hợp lệ (chỉ nhận: patient, doctor, patdoc, both)',
      1004,
      400
    );
  }
  return normalized;
}

function serializeShowIfAnswer(value) {
  if (value === undefined) return undefined;
  if (value === null || value === '') return null;
  if (typeof value === 'string') return value;
  if (typeof value === 'object') return JSON.stringify(value);
  return String(value);
}

function formatStoredOptions(rawOptions) {
  if (!Array.isArray(rawOptions)) return [];
  return rawOptions.map((opt, idx) => ({
    id: String(opt.id ?? idx + 1),
    option_text: opt.option_text ?? '',
    option_value: opt.option_value ?? '',
    order: String(opt.order ?? idx + 1),
    trigger_image_upload: parseBoolFlag(opt.trigger_image_upload, false, 'trigger_image_upload')
      ? '1'
      : '0',
  }));
}

function mapPrismaKnownError(err) {
  if (err && err.code === 'P2002') {
    throw createSheetError('Dữ liệu đã tồn tại', 9996, 409);
  }
  if (err && err.code === 'P2025') {
    throw createSheetError('Không tìm thấy dữ liệu', 9992, 404);
  }
  throw err;
}

async function resolveTemplate(idOrCode, includeTree = false) {
  const key = idOrCode !== undefined && idOrCode !== null ? String(idOrCode).trim() : '';
  if (!key) {
    throw createSheetError('Thiếu mã định danh mẫu phiếu khám', 1002, 400);
  }

  const where = isPositiveInt32(key)
    ? { OR: [{ codeTemplate: key }, { id: Number(key) }] }
    : { codeTemplate: key };

  const include = includeTree
    ? {
        sections: {
          orderBy: [{ orderIndex: 'asc' }, { id: 'asc' }],
          include: {
            questions: {
              orderBy: [{ orderIndex: 'asc' }, { id: 'asc' }],
            },
          },
        },
      }
    : undefined;

  const tmpl = await prisma.template.findFirst({ where, include });
  if (!tmpl) {
    throw createSheetError('Mẫu phiếu khám không tồn tại', 9992, 404);
  }
  return tmpl;
}

async function resolveSection(sectionIdParam) {
  const key =
    sectionIdParam !== undefined && sectionIdParam !== null ? String(sectionIdParam).trim() : '';
  if (!key) {
    throw createSheetError('Thiếu section_id', 1002, 400);
  }
  if (!isPositiveInt32(key)) {
    throw createSheetError('Section không tồn tại', 9992, 404);
  }

  const section = await prisma.templateSection.findUnique({
    where: { id: Number(key) },
    include: { template: true },
  });
  if (!section) {
    throw createSheetError('Section không tồn tại', 9992, 404);
  }
  return section;
}

async function resolveQuestion(idOrCode) {
  const key = idOrCode !== undefined && idOrCode !== null ? String(idOrCode).trim() : '';
  if (!key) {
    throw createSheetError('Thiếu mã định danh câu hỏi', 1002, 400);
  }

  const where = isPositiveInt32(key)
    ? { OR: [{ questionCode: key }, { id: Number(key) }] }
    : { questionCode: key };

  const question = await prisma.templateQuestion.findFirst({
    where,
    include: { section: { include: { template: true } } },
  });
  if (!question) {
    throw createSheetError('Câu hỏi không tồn tại', 9992, 404);
  }
  return question;
}

class TemplatesService {
  /**
   * 1. GET /templates/all
   */
  async listTemplates(query = {}) {
    const pageRaw = query.page !== undefined && query.page !== '' ? query.page : '1';
    const limitRaw = query.limit !== undefined && query.limit !== '' ? query.limit : '20';

    const page = Number(pageRaw);
    const limit = Number(limitRaw);
    if (!Number.isInteger(page) || page < 1) {
      throw createSheetError('Tham số page không hợp lệ', 1004, 400);
    }
    if (!Number.isInteger(limit) || limit < 1 || limit > 100) {
      throw createSheetError('Tham số limit không hợp lệ (1-100)', 1004, 400);
    }

    const where = {};
    if (query.is_active !== undefined && query.is_active !== '') {
      where.isActive = parseBoolFlag(query.is_active, true, 'is_active');
    }

    const skip = (page - 1) * limit;
    const templates = await prisma.template.findMany({
      where,
      orderBy: [{ createdAt: 'desc' }, { id: 'asc' }],
      skip,
      take: limit,
    });

    const ids = templates.map((t) => t.id);
    const versionMetas =
      ids.length > 0
        ? await prisma.templateVersionMeta.findMany({ where: { templateId: { in: ids } } })
        : [];
    const versionMap = new Map(versionMetas.map((m) => [m.templateId, m.versionText]));

    return templates.map((t) => ({
      code_template: t.codeTemplate,
      name: t.title,
      description: t.description ?? null,
      version: versionMap.get(t.id) || String(t.version),
      is_active: t.isActive ? '1' : '0',
      created_at: t.createdAt.toISOString(),
    }));
  }

  /**
   * 2. GET /templates/:id
   */
  async getTemplateDetail(idOrCode) {
    const tmpl = await resolveTemplate(idOrCode, true);

    const sectionIds = tmpl.sections.map((s) => s.id);
    const allQuestions = tmpl.sections.flatMap((s) => s.questions);
    const questionIds = allQuestions.map((q) => q.id);

    const [sectionMetas, questionMetas] = await Promise.all([
      sectionIds.length > 0
        ? prisma.templateSectionMeta.findMany({ where: { sectionId: { in: sectionIds } } })
        : [],
      questionIds.length > 0
        ? prisma.templateQuestionMeta.findMany({ where: { questionId: { in: questionIds } } })
        : [],
    ]);

    const sectionMetaMap = new Map(sectionMetas.map((m) => [m.sectionId, m]));
    const questionMetaMap = new Map(questionMetas.map((m) => [m.questionId, m]));
    const questionIdToCodeMap = new Map(
      allQuestions.map((q) => [q.id, q.questionCode || String(q.id)])
    );

    return {
      code_template: tmpl.codeTemplate,
      name: tmpl.title,
      sections: tmpl.sections.map((sec) => {
        const sMeta = sectionMetaMap.get(sec.id);
        return {
          section_id: String(sec.id),
          title: sec.sectionName,
          order: String(sec.orderIndex),
          is_required: sMeta?.isRequired ?? '0',
          filled_by: sMeta?.filledBy ?? 'patient',
          questions: sec.questions.map((q) => {
            const qMeta = questionMetaMap.get(q.id);
            const parentCode =
              qMeta?.parentQuestionId ??
              (q.parentQuestionId
                ? questionIdToCodeMap.get(q.parentQuestionId) || String(q.parentQuestionId)
                : null);

            return {
              question_id: q.questionCode || String(q.id),
              question_text: q.questionText,
              type_question: String(q.questionType || '').toLowerCase(),
              placeholder: qMeta?.placeholder ?? null,
              order: String(q.orderIndex),
              is_required: q.isRequired ? '1' : '0',
              parent_question_id: parentCode,
              show_if_answer: q.showIfAnswer ?? null,
              help_text: qMeta?.helpText ?? null,
              allow_image: qMeta?.allowImage ?? '0',
              options: formatStoredOptions(q.options),
            };
          }),
        };
      }),
    };
  }

  /**
   * 3. POST /templates
   */
  async createTemplate(body = {}) {
    const { code_template, name, description, version, is_active } = body;

    if (code_template === undefined || code_template === null || name === undefined || name === null) {
      throw createSheetError('Thiếu trường bắt buộc: code_template, name', 1002, 400);
    }
    if (typeof code_template !== 'string' || typeof name !== 'string') {
      throw createSheetError('Kiểu dữ liệu code_template hoặc name không hợp lệ', 1003, 400);
    }

    const codeTemplate = code_template.trim();
    const title = name.trim();
    if (!codeTemplate || !title) {
      throw createSheetError('Thiếu trường bắt buộc: code_template, name', 1002, 400);
    }

    if (description !== undefined && description !== null && typeof description !== 'string') {
      throw createSheetError('Kiểu dữ liệu description không hợp lệ', 1003, 400);
    }

    const existing = await prisma.template.findUnique({ where: { codeTemplate } });
    if (existing) {
      throw createSheetError('Mã mẫu phiếu khám đã tồn tại', 9996, 409);
    }

    const { versionText, versionInt } = parseVersionInput(version, '1.0');
    const isActive = parseBoolFlag(is_active, true, 'is_active');

    try {
      const created = await prisma.$transaction(async (tx) => {
        const tmpl = await tx.template.create({
          data: {
            codeTemplate,
            title,
            description: description !== undefined ? description : null,
            isActive,
            version: versionInt,
          },
        });
        await tx.templateVersionMeta.create({
          data: {
            templateId: tmpl.id,
            versionText,
          },
        });
        return tmpl;
      });

      return {
        code_template: created.codeTemplate,
        name: created.title,
        description: created.description ?? null,
        version: versionText,
        is_active: created.isActive ? '1' : '0',
        created_at: created.createdAt.toISOString(),
        updated_at: created.updatedAt.toISOString(),
      };
    } catch (err) {
      mapPrismaKnownError(err);
    }
  }

  /**
   * 4. PUT /templates/:id
   */
  async updateTemplate(idOrCode, body = {}) {
    const tmpl = await resolveTemplate(idOrCode);
    const { name, description, version, is_active } = body;

    const updateData = {};
    if (name !== undefined) {
      if (typeof name !== 'string') {
        throw createSheetError('Kiểu dữ liệu name không hợp lệ', 1003, 400);
      }
      const trimmedName = name.trim();
      if (!trimmedName) {
        throw createSheetError('Tên mẫu phiếu khám không được rỗng', 1004, 400);
      }
      updateData.title = trimmedName;
    }

    if (description !== undefined) {
      if (description !== null && typeof description !== 'string') {
        throw createSheetError('Kiểu dữ liệu description không hợp lệ', 1003, 400);
      }
      updateData.description = description;
    }

    let versionTextToSave = null;
    if (version !== undefined) {
      const parsed = parseVersionInput(version);
      updateData.version = parsed.versionInt;
      versionTextToSave = parsed.versionText;
    }

    if (is_active !== undefined) {
      updateData.isActive = parseBoolFlag(is_active, tmpl.isActive, 'is_active');
    }

    try {
      const result = await prisma.$transaction(async (tx) => {
        const updated =
          Object.keys(updateData).length > 0
            ? await tx.template.update({ where: { id: tmpl.id }, data: updateData })
            : tmpl;

        let finalVersionText;
        if (versionTextToSave !== null) {
          const meta = await tx.templateVersionMeta.upsert({
            where: { templateId: tmpl.id },
            update: { versionText: versionTextToSave },
            create: { templateId: tmpl.id, versionText: versionTextToSave },
          });
          finalVersionText = meta.versionText;
        } else {
          const meta = await tx.templateVersionMeta.findUnique({ where: { templateId: tmpl.id } });
          finalVersionText = meta?.versionText || String(updated.version);
        }

        return { updated, finalVersionText };
      });

      return {
        code_template: result.updated.codeTemplate,
        name: result.updated.title,
        version: result.finalVersionText,
        is_active: result.updated.isActive ? '1' : '0',
      };
    } catch (err) {
      mapPrismaKnownError(err);
    }
  }

  /**
   * 5. DELETE /templates/:id
   */
  async deleteTemplate(idOrCode) {
    const tmpl = await resolveTemplate(idOrCode);

    const usageCount = await prisma.medicalRecordMeta.count({
      where: { templateId: tmpl.id },
    });
    if (usageCount > 0) {
      throw createSheetError('Mẫu bệnh án đang được sử dụng, không thể xóa', 1010, 409);
    }

    const sections = await prisma.templateSection.findMany({
      where: { templateId: tmpl.id },
      select: { id: true, questions: { select: { id: true } } },
    });
    const sectionIds = sections.map((s) => s.id);
    const questionIds = sections.flatMap((s) => s.questions.map((q) => q.id));

    await prisma.$transaction(async (tx) => {
      if (questionIds.length > 0) {
        await tx.templateQuestionMeta.deleteMany({
          where: { questionId: { in: questionIds } },
        });
      }
      if (sectionIds.length > 0) {
        await tx.templateSectionMeta.deleteMany({
          where: { sectionId: { in: sectionIds } },
        });
      }
      await tx.templateVersionMeta.deleteMany({
        where: { templateId: tmpl.id },
      });
      await tx.template.delete({
        where: { id: tmpl.id },
      });
    });

    return {};
  }

  /**
   * 6. POST /templates/:template_id/sections
   */
  async createSection(templateIdOrCode, body = {}) {
    const tmpl = await resolveTemplate(templateIdOrCode);
    const { title, order, is_required, filled_by } = body;

    if (title === undefined || title === null) {
      throw createSheetError('Thiếu trường bắt buộc: title, order', 1002, 400);
    }
    if (typeof title !== 'string') {
      throw createSheetError('Kiểu dữ liệu title không hợp lệ', 1003, 400);
    }
    const sectionName = title.trim();
    if (!sectionName) {
      throw createSheetError('Thiếu trường bắt buộc: title, order', 1002, 400);
    }

    const orderIndex = parseNonNegativeInt(order, 'order');
    const isRequiredStr = parseBoolFlag(is_required, false, 'is_required') ? '1' : '0';
    const filledBy = parseFilledBy(filled_by, 'patient');

    const created = await prisma.$transaction(async (tx) => {
      const section = await tx.templateSection.create({
        data: {
          templateId: tmpl.id,
          sectionName,
          orderIndex,
        },
      });
      await tx.templateSectionMeta.create({
        data: {
          sectionId: section.id,
          isRequired: isRequiredStr,
          filledBy,
        },
      });
      return section;
    });

    return {
      section_id: String(created.id),
      template_id: tmpl.codeTemplate,
      title: created.sectionName,
      order: String(created.orderIndex),
      is_required: isRequiredStr,
      filled_by: filledBy,
    };
  }

  /**
   * 7. PUT /templates/sections/:id
   */
  async updateSection(sectionIdParam, body = {}) {
    const section = await resolveSection(sectionIdParam);
    const existingMeta = await prisma.templateSectionMeta.findUnique({
      where: { sectionId: section.id },
    });

    const { title, order, is_required, filled_by } = body;
    const updateData = {};

    if (title !== undefined) {
      if (typeof title !== 'string') {
        throw createSheetError('Kiểu dữ liệu title không hợp lệ', 1003, 400);
      }
      const trimmedTitle = title.trim();
      if (!trimmedTitle) {
        throw createSheetError('Tiêu đề section không được rỗng', 1004, 400);
      }
      updateData.sectionName = trimmedTitle;
    }

    if (order !== undefined) {
      updateData.orderIndex = parseNonNegativeInt(order, 'order');
    }

    const nextIsRequired =
      is_required !== undefined
        ? parseBoolFlag(is_required, false, 'is_required')
          ? '1'
          : '0'
        : existingMeta?.isRequired ?? '0';

    const nextFilledBy =
      filled_by !== undefined
        ? parseFilledBy(filled_by, existingMeta?.filledBy ?? 'patient')
        : existingMeta?.filledBy ?? 'patient';

    const result = await prisma.$transaction(async (tx) => {
      const updated =
        Object.keys(updateData).length > 0
          ? await tx.templateSection.update({ where: { id: section.id }, data: updateData })
          : section;

      const meta = await tx.templateSectionMeta.upsert({
        where: { sectionId: section.id },
        update: { isRequired: nextIsRequired, filledBy: nextFilledBy },
        create: { sectionId: section.id, isRequired: nextIsRequired, filledBy: nextFilledBy },
      });

      return { updated, meta };
    });

    return {
      section_id: String(result.updated.id),
      template_id: section.template.codeTemplate,
      title: result.updated.sectionName,
      order: String(result.updated.orderIndex),
      is_required: result.meta.isRequired,
      filled_by: result.meta.filledBy,
    };
  }

  /**
   * 8. DELETE /templates/sections/:id
   */
  async deleteSection(sectionIdParam) {
    const section = await resolveSection(sectionIdParam);

    const questions = await prisma.templateQuestion.findMany({
      where: { sectionId: section.id },
      select: { id: true, questionCode: true },
    });
    const questionIds = questions.map((q) => q.id);
    const questionCodes = questions.map((q) => q.questionCode).filter(Boolean);

    await prisma.$transaction(async (tx) => {
      if (questionIds.length > 0) {
        // Detach child questions in other sections referencing questions being deleted
        await tx.templateQuestion.updateMany({
          where: { parentQuestionId: { in: questionIds } },
          data: { parentQuestionId: null },
        });

        const parentRefs = [
          ...questionCodes,
          ...questionIds.map((id) => String(id)),
        ];
        if (parentRefs.length > 0) {
          await tx.templateQuestionMeta.updateMany({
            where: { parentQuestionId: { in: parentRefs } },
            data: { parentQuestionId: null },
          });
        }

        await tx.templateQuestionMeta.deleteMany({
          where: { questionId: { in: questionIds } },
        });
      }

      await tx.templateSectionMeta.deleteMany({
        where: { sectionId: section.id },
      });

      await tx.templateSection.delete({
        where: { id: section.id },
      });
    });

    return {};
  }

  /**
   * 9. POST /templates/sections/:section_id/questions
   */
  async createQuestion(sectionIdParam, body = {}) {
    const section = await resolveSection(sectionIdParam);
    const sectionMeta = await prisma.templateSectionMeta.findUnique({
      where: { sectionId: section.id },
    });

    const {
      question_id,
      question_text,
      type_question,
      placeholder,
      order,
      is_required,
      parent_question_id,
      show_if_answer,
      help_text,
      allow_image,
      options,
    } = body;

    if (
      question_id === undefined ||
      question_id === null ||
      question_text === undefined ||
      question_text === null ||
      type_question === undefined ||
      type_question === null
    ) {
      throw createSheetError(
        'Thiếu trường bắt buộc: question_id, question_text, type_question, order',
        1002,
        400
      );
    }

    if (
      typeof question_id !== 'string' ||
      typeof question_text !== 'string' ||
      typeof type_question !== 'string'
    ) {
      throw createSheetError('Kiểu dữ liệu question_id, question_text hoặc type_question không hợp lệ', 1003, 400);
    }

    const questionCode = question_id.trim();
    const questionText = question_text.trim();
    const questionType = type_question.trim().toLowerCase();

    if (!questionCode || !questionText || !questionType) {
      throw createSheetError(
        'Thiếu trường bắt buộc: question_id, question_text, type_question, order',
        1002,
        400
      );
    }

    const orderIndex = parseNonNegativeInt(order, 'order');
    const isRequired = parseBoolFlag(is_required, false, 'is_required');
    const allowImageStr = parseBoolFlag(allow_image, false, 'allow_image') ? '1' : '0';

    if (placeholder !== undefined && placeholder !== null && typeof placeholder !== 'string') {
      throw createSheetError('Kiểu dữ liệu placeholder không hợp lệ', 1003, 400);
    }
    if (help_text !== undefined && help_text !== null && typeof help_text !== 'string') {
      throw createSheetError('Kiểu dữ liệu help_text không hợp lệ', 1003, 400);
    }

    // Check duplicate questionCode within the same template
    const duplicate = await prisma.templateQuestion.findFirst({
      where: {
        questionCode,
        section: { templateId: section.templateId },
      },
    });
    if (duplicate) {
      throw createSheetError('Mã câu hỏi đã tồn tại trong mẫu phiếu này', 9996, 409);
    }

    let parentQuestionIntId = null;
    let parentQuestionCode = null;
    if (parent_question_id !== undefined && parent_question_id !== null && String(parent_question_id).trim() !== '') {
      const parentKey = String(parent_question_id).trim();
      const parentWhere = isPositiveInt32(parentKey)
        ? {
            section: { templateId: section.templateId },
            OR: [{ questionCode: parentKey }, { id: Number(parentKey) }],
          }
        : {
            section: { templateId: section.templateId },
            questionCode: parentKey,
          };
      const parentQ = await prisma.templateQuestion.findFirst({ where: parentWhere });
      parentQuestionIntId = parentQ ? parentQ.id : null;
      parentQuestionCode = parentQ?.questionCode || parentKey;
    }

    let normalizedOptions = [];
    if (options !== undefined && options !== null) {
      if (!Array.isArray(options)) {
        throw createSheetError('options phải là một mảng', 1003, 400);
      }
      normalizedOptions = options.map((opt, idx) => {
        if (!opt || typeof opt !== 'object') {
          throw createSheetError('Phần tử trong options không hợp lệ', 1003, 400);
        }
        if (
          opt.option_text === undefined ||
          opt.option_text === null ||
          String(opt.option_text).trim() === '' ||
          opt.option_value === undefined ||
          opt.option_value === null ||
          String(opt.option_value).trim() === ''
        ) {
          throw createSheetError('Mỗi lựa chọn cần có option_text và option_value', 1002, 400);
        }
        const optOrder =
          opt.order !== undefined && opt.order !== null && String(opt.order).trim() !== ''
            ? String(parseNonNegativeInt(opt.order, 'options.order'))
            : String(idx + 1);
        return {
          id: String(idx + 1),
          option_text: String(opt.option_text),
          option_value: String(opt.option_value),
          order: optOrder,
          trigger_image_upload: parseBoolFlag(opt.trigger_image_upload, false, 'trigger_image_upload')
            ? '1'
            : '0',
        };
      });
    }

    const showIfAnswerStr = serializeShowIfAnswer(show_if_answer) ?? null;

    const created = await prisma.$transaction(async (tx) => {
      const question = await tx.templateQuestion.create({
        data: {
          sectionId: section.id,
          questionCode,
          questionText,
          questionType,
          options: normalizedOptions.length > 0 ? normalizedOptions : null,
          isRequired,
          parentQuestionId: parentQuestionIntId,
          showIfAnswer: showIfAnswerStr,
          filledBy: sectionMeta?.filledBy || 'both',
          orderIndex,
        },
      });

      await tx.templateQuestionMeta.create({
        data: {
          questionId: question.id,
          placeholder: placeholder ?? null,
          helpText: help_text ?? null,
          allowImage: allowImageStr,
          parentQuestionId: parentQuestionCode,
        },
      });

      return question;
    });

    return {
      question_id: created.questionCode || String(created.id),
      section_id: String(created.sectionId),
      question_text: created.questionText,
      type_question: created.questionType,
      options: normalizedOptions.map((opt) => ({
        id: opt.id,
        option_text: opt.option_text,
        option_value: opt.option_value,
      })),
    };
  }

  /**
   * 10. PUT /templates/questions/:id
   */
  async updateQuestion(idOrCode, body = {}) {
    const question = await resolveQuestion(idOrCode);
    const existingMeta = await prisma.templateQuestionMeta.findUnique({
      where: { questionId: question.id },
    });

    const {
      question_text,
      type_question,
      placeholder,
      order,
      is_required,
      parent_question_id,
      show_if_answer,
      help_text,
      allow_image,
      options,
    } = body;

    const updateData = {};
    const metaUpdate = {};

    if (question_text !== undefined) {
      if (typeof question_text !== 'string') {
        throw createSheetError('Kiểu dữ liệu question_text không hợp lệ', 1003, 400);
      }
      const trimmedText = question_text.trim();
      if (!trimmedText) {
        throw createSheetError('Nội dung câu hỏi không được rỗng', 1004, 400);
      }
      updateData.questionText = trimmedText;
    }

    if (type_question !== undefined) {
      if (typeof type_question !== 'string') {
        throw createSheetError('Kiểu dữ liệu type_question không hợp lệ', 1003, 400);
      }
      const trimmedType = type_question.trim().toLowerCase();
      if (!trimmedType) {
        throw createSheetError('type_question không được rỗng', 1004, 400);
      }
      updateData.questionType = trimmedType;
    }

    if (order !== undefined) {
      updateData.orderIndex = parseNonNegativeInt(order, 'order');
    }

    if (is_required !== undefined) {
      updateData.isRequired = parseBoolFlag(is_required, question.isRequired, 'is_required');
    }

    if (show_if_answer !== undefined) {
      updateData.showIfAnswer = serializeShowIfAnswer(show_if_answer);
    }

    if (placeholder !== undefined) {
      if (placeholder !== null && typeof placeholder !== 'string') {
        throw createSheetError('Kiểu dữ liệu placeholder không hợp lệ', 1003, 400);
      }
      metaUpdate.placeholder = placeholder;
    }

    if (help_text !== undefined) {
      if (help_text !== null && typeof help_text !== 'string') {
        throw createSheetError('Kiểu dữ liệu help_text không hợp lệ', 1003, 400);
      }
      metaUpdate.helpText = help_text;
    }

    if (allow_image !== undefined) {
      metaUpdate.allowImage = parseBoolFlag(allow_image, false, 'allow_image') ? '1' : '0';
    }

    if (parent_question_id !== undefined) {
      if (parent_question_id === null || String(parent_question_id).trim() === '') {
        updateData.parentQuestionId = null;
        metaUpdate.parentQuestionId = null;
      } else {
        const parentKey = String(parent_question_id).trim();
        if (parentKey === question.questionCode || parentKey === String(question.id)) {
          throw createSheetError('Câu hỏi không thể tự tham chiếu chính mình làm câu hỏi cha', 1004, 400);
        }
        const parentWhere = isPositiveInt32(parentKey)
          ? {
              section: { templateId: question.section.templateId },
              OR: [{ questionCode: parentKey }, { id: Number(parentKey) }],
            }
          : {
              section: { templateId: question.section.templateId },
              questionCode: parentKey,
            };
        const parentQ = await prisma.templateQuestion.findFirst({ where: parentWhere });
        updateData.parentQuestionId = parentQ ? parentQ.id : null;
        metaUpdate.parentQuestionId = parentQ?.questionCode || parentKey;
      }
    }

    let finalOptions = formatStoredOptions(question.options);
    if (options !== undefined) {
      if (options === null) {
        finalOptions = [];
        updateData.options = null;
      } else {
        if (!Array.isArray(options)) {
          throw createSheetError('options phải là một mảng', 1003, 400);
        }

        const existingMap = new Map(finalOptions.map((o) => [String(o.id), o]));
        const usedIds = new Set();
        let maxNumericId = 0;

        for (const existingOpt of finalOptions) {
          const num = Number(existingOpt.id);
          if (Number.isInteger(num) && num > maxNumericId) maxNumericId = num;
        }
        for (const incomingOpt of options) {
          if (incomingOpt && incomingOpt.id !== undefined && incomingOpt.id !== null && String(incomingOpt.id).trim() !== '') {
            const idStr = String(incomingOpt.id).trim();
            usedIds.add(idStr);
            const num = Number(idStr);
            if (Number.isInteger(num) && num > maxNumericId) maxNumericId = num;
          }
        }

        finalOptions = options.map((opt, idx) => {
          if (!opt || typeof opt !== 'object') {
            throw createSheetError('Phần tử trong options không hợp lệ', 1003, 400);
          }

          const hasId = opt.id !== undefined && opt.id !== null && String(opt.id).trim() !== '';
          let optId;
          if (hasId) {
            optId = String(opt.id).trim();
          } else {
            do {
              maxNumericId += 1;
            } while (usedIds.has(String(maxNumericId)));
            optId = String(maxNumericId);
            usedIds.add(optId);
          }

          const existingOpt = existingMap.get(optId);
          const optionText =
            opt.option_text !== undefined ? String(opt.option_text) : existingOpt?.option_text;
          const optionValue =
            opt.option_value !== undefined ? String(opt.option_value) : existingOpt?.option_value;

          if (!optionText || !String(optionText).trim() || !optionValue || !String(optionValue).trim()) {
            throw createSheetError('Mỗi lựa chọn cần có option_text và option_value', 1002, 400);
          }

          const optOrder =
            opt.order !== undefined && opt.order !== null && String(opt.order).trim() !== ''
              ? String(parseNonNegativeInt(opt.order, 'options.order'))
              : existingOpt?.order ?? String(idx + 1);

          const triggerImg =
            opt.trigger_image_upload !== undefined
              ? parseBoolFlag(opt.trigger_image_upload, false, 'trigger_image_upload')
                ? '1'
                : '0'
              : existingOpt?.trigger_image_upload ?? '0';

          return {
            id: optId,
            option_text: String(optionText),
            option_value: String(optionValue),
            order: optOrder,
            trigger_image_upload: triggerImg,
          };
        });

        updateData.options = finalOptions;
      }
    }

    const updated = await prisma.$transaction(async (tx) => {
      const q =
        Object.keys(updateData).length > 0
          ? await tx.templateQuestion.update({
              where: { id: question.id },
              data: updateData,
            })
          : question;

      const nextPlaceholder =
        metaUpdate.placeholder !== undefined
          ? metaUpdate.placeholder
          : existingMeta?.placeholder ?? null;
      const nextHelpText =
        metaUpdate.helpText !== undefined ? metaUpdate.helpText : existingMeta?.helpText ?? null;
      const nextAllowImage =
        metaUpdate.allowImage !== undefined
          ? metaUpdate.allowImage
          : existingMeta?.allowImage ?? '0';
      const nextParentCode =
        metaUpdate.parentQuestionId !== undefined
          ? metaUpdate.parentQuestionId
          : existingMeta?.parentQuestionId ?? null;

      await tx.templateQuestionMeta.upsert({
        where: { questionId: question.id },
        update: {
          placeholder: nextPlaceholder,
          helpText: nextHelpText,
          allowImage: nextAllowImage,
          parentQuestionId: nextParentCode,
        },
        create: {
          questionId: question.id,
          placeholder: nextPlaceholder,
          helpText: nextHelpText,
          allowImage: nextAllowImage,
          parentQuestionId: nextParentCode,
        },
      });

      return q;
    });

    return {
      question_id: updated.questionCode || String(updated.id),
      section_id: String(updated.sectionId),
      question_text: updated.questionText,
      type_question: String(updated.questionType || '').toLowerCase(),
      options: finalOptions.map((opt) => ({
        id: opt.id,
        option_text: opt.option_text,
        option_value: opt.option_value,
      })),
    };
  }

  /**
   * 11. DELETE /templates/questions/:id
   */
  async deleteQuestion(idOrCode) {
    const question = await resolveQuestion(idOrCode);

    const templateQuestions = await prisma.templateQuestion.findMany({
      where: { section: { templateId: question.section.templateId } },
      select: { id: true },
    });
    const templateQuestionIds = templateQuestions.map((q) => q.id);

    await prisma.$transaction(async (tx) => {
      await tx.templateQuestion.updateMany({
        where: { parentQuestionId: question.id },
        data: { parentQuestionId: null },
      });

      const parentRefs = [question.questionCode, String(question.id)].filter(Boolean);
      if (templateQuestionIds.length > 0 && parentRefs.length > 0) {
        await tx.templateQuestionMeta.updateMany({
          where: {
            questionId: { in: templateQuestionIds },
            parentQuestionId: { in: parentRefs },
          },
          data: { parentQuestionId: null },
        });
      }

      await tx.templateQuestionMeta.deleteMany({
        where: { questionId: question.id },
      });

      await tx.templateQuestion.delete({
        where: { id: question.id },
      });
    });

    return {};
  }
}

module.exports = new TemplatesService();
