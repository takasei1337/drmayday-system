require('dotenv').config({ path: '../.env' });
const http = require('http');
const app = require('../src/app');

let passed = 0;
let failed = 0;
function assert(cond, label, detail = '') {
  if (cond) {
    passed++;
    console.log('PASS:', label);
  } else {
    failed++;
    console.error('FAIL:', label, detail);
  }
}

async function req(baseUrl, method, path, token = null, body = null) {
  const headers = { 'Content-Type': 'application/json' };
  if (token) headers['Authorization'] = `Bearer ${token}`;
  const res = await fetch(`${baseUrl}${path}`, {
    method,
    headers,
    body: body ? JSON.stringify(body) : undefined,
    signal: AbortSignal.timeout(20000),
  });
  const json = await res.json().catch(() => ({}));
  return { status: res.status, json };
}

(async () => {
  const server = http.createServer(app);
  await new Promise((resolve) => server.listen(0, '127.0.0.1', resolve));
  const { port } = server.address();
  const base = `http://127.0.0.1:${port}/api`;
  console.log('Listening on', base);

  let adminToken = null;
  let doctorToken = null;
  let createdBranchId = null;
  let createdDeptId = null;
  let createdRoomId = null;
  let createdRoleId = null;
  let createdPermId = null;
  let createdUserId = null;
  const tmplCode = `TMPL_VERIFY_${Date.now()}`;
  let createdSectionId = null;
  const createdQuestionId = `Q_VERIFY_${Date.now()}`;

  try {
    const unauth = await req(base, 'GET', '/admin/users');
    assert(unauth.json.code === '9998', 'Unauthenticated -> code "9998"', JSON.stringify(unauth));

    const badLogin = await req(base, 'POST', '/auth/login', null, { phone: '0900000001', password: 'wrong' });
    assert(badLogin.json.code === '9995', 'Wrong password -> code "9995"', JSON.stringify(badLogin));

    const admLogin = await req(base, 'POST', '/auth/login', null, { phone: '0900000001', password: 'Admin@123' });
    assert(
      admLogin.json.code === '1000' &&
        typeof admLogin.json.data?.token === 'string' &&
        typeof admLogin.json.data?.user_info?.user_id === 'string',
      'Admin login Sheet shape',
      JSON.stringify(admLogin)
    );
    adminToken = admLogin.json.data.token;

    const docLogin = await req(base, 'POST', '/auth/login', null, { phone: '0901000002', password: 'Doctor@123' });
    assert(docLogin.json.code === '1000' && docLogin.json.data?.token, 'Doctor login OK');
    doctorToken = docLogin.json.data.token;

    const forbidden = await req(base, 'GET', '/admin/users', doctorToken);
    assert(forbidden.json.code === '1009', 'Doctor accessing admin -> code "1009"', JSON.stringify(forbidden));

    // Slide 4: Topology
    const brMissing = await req(base, 'POST', '/branches', adminToken, { name: 'Missing addr' });
    assert(brMissing.json.code === '1002', 'POST /branches missing param -> "1002"', JSON.stringify(brMissing));

    const brCreate = await req(base, 'POST', '/branches', adminToken, { name: 'CN Verify Test', address: '123 Test', phone: '0249999888' });
    assert(brCreate.json.code === '1000' && typeof brCreate.json.data.id === 'number', 'POST /branches -> "1000" + id:int', JSON.stringify(brCreate));
    createdBranchId = brCreate.json.data.id;

    const brList = await req(base, 'GET', '/branches', adminToken);
    assert(brList.json.code === '1000' && Array.isArray(brList.json.data) && brList.json.data.some((b) => String(b.id) === String(createdBranchId)), 'GET /branches -> array');

    const brDetail = await req(base, 'GET', `/v1/branches/${createdBranchId}`, adminToken);
    assert(brDetail.json.code === '1000' && brDetail.json.data.name === 'CN Verify Test', 'GET /v1/branches/:id');

    const br404 = await req(base, 'GET', '/v1/branches/9999999', adminToken);
    assert(br404.json.code === '9992', 'GET /v1/branches/9999999 -> "9992"');

    const brUpd = await req(base, 'PUT', `/v1/branches/${createdBranchId}`, adminToken, { name: 'CN Verify Updated' });
    assert(brUpd.json.code === '1000' && brUpd.json.data.name === 'CN Verify Updated', 'PUT /v1/branches/:id');

    const dpCreate = await req(base, 'POST', '/departments', adminToken, { name: 'Khoa Verify', description: 'Desc', branch_id: createdBranchId });
    assert(dpCreate.json.code === '1000' && dpCreate.json.data.id, 'POST /departments', JSON.stringify(dpCreate));
    createdDeptId = Number(dpCreate.json.data.id);

    const dpList = await req(base, 'GET', `/departments?branch_id=${createdBranchId}`, adminToken);
    assert(dpList.json.code === '1000' && Array.isArray(dpList.json.data) && dpList.json.data.length >= 1, 'GET /departments');

    const dpDetail = await req(base, 'GET', `/v1/departments/${createdDeptId}`, adminToken);
    assert(dpDetail.json.code === '1000' && dpDetail.json.data.id === createdDeptId, 'GET /v1/departments/:id');

    const dpUpd = await req(base, 'PUT', `/v1/departments/${createdDeptId}`, adminToken, { name: 'Khoa Verify 2' });
    assert(dpUpd.json.code === '1000' && dpUpd.json.data.name === 'Khoa Verify 2', 'PUT /v1/departments/:id');

    const rmCreate = await req(base, 'POST', '/rooms', adminToken, { name: 'Phong Verify 1', description: 'Phong kham', department_id: createdDeptId });
    assert(rmCreate.json.code === '1000' && rmCreate.json.data.id, 'POST /rooms', JSON.stringify(rmCreate));
    createdRoomId = Number(rmCreate.json.data.id);

    const rmList = await req(base, 'GET', `/rooms?department_id=${createdDeptId}`, adminToken);
    assert(rmList.json.code === '1000' && Array.isArray(rmList.json.data) && rmList.json.data.length === 1, 'GET /rooms');

    const rmDetail = await req(base, 'GET', `/v1/rooms/${createdRoomId}`, adminToken);
    assert(rmDetail.json.code === '1000' && rmDetail.json.data.department_id === createdDeptId, 'GET /v1/rooms/:id');

    const rmUpd = await req(base, 'PUT', `/v1/rooms/${createdRoomId}`, adminToken, { name: 'Phong Verify 2' });
    assert(rmUpd.json.code === '1000' && rmUpd.json.data.name === 'Phong Verify 2', 'PUT /v1/rooms/:id');

    const brDelBlocked = await req(base, 'DELETE', `/v1/branches/${createdBranchId}`, adminToken);
    assert(brDelBlocked.json.code === '1009', 'DELETE /v1/branches/:id while in use -> "1009"', JSON.stringify(brDelBlocked));

    // Slide 3: Admin Users & RBAC
    const roleCreate = await req(base, 'POST', '/roles', adminToken, { name: `role_ver_${Date.now()}`, description: 'Test role', parent_role_id: 1 });
    assert(roleCreate.json.code === '1000' && typeof roleCreate.json.data.id === 'number', 'POST /roles', JSON.stringify(roleCreate));
    createdRoleId = roleCreate.json.data.id;

    const roleList = await req(base, 'GET', '/roles', adminToken);
    assert(roleList.json.code === '1000' && Array.isArray(roleList.json.data) && roleList.json.data.some((r) => r.id === createdRoleId), 'GET /roles');

    const permCreate = await req(base, 'POST', '/v1/permissions', adminToken, { name: `perm_ver_${Date.now()}`, description: 'Test perm' });
    assert(permCreate.json.code === '1000' && typeof permCreate.json.data.id === 'number', 'POST /v1/permissions', JSON.stringify(permCreate));
    createdPermId = permCreate.json.data.id;

    const permList = await req(base, 'GET', '/v1/permissions', adminToken);
    assert(permList.json.code === '1000' && Array.isArray(permList.json.data) && permList.json.data.some((p) => p.id === createdPermId), 'GET /v1/permissions');

    const permUpd = await req(base, 'PUT', `/v1/permissions/${createdPermId}`, adminToken, { description: 'Updated perm' });
    assert(permUpd.json.code === '1000' && permUpd.json.data.description === 'Updated perm', 'PUT /v1/permissions/:id');

    const rpAssign = await req(base, 'POST', '/role_permissions', adminToken, { role_id: createdRoleId, permissions: [createdPermId] });
    assert(rpAssign.json.code === '1000', 'POST /role_permissions', JSON.stringify(rpAssign));

    const rpList = await req(base, 'GET', `/role_permissions/${createdRoleId}`, adminToken);
    assert(rpList.json.code === '1000' && Array.isArray(rpList.json.data) && rpList.json.data.length === 1 && typeof rpList.json.data[0].role_permission_id === 'number', 'GET /role_permissions/:role_id', JSON.stringify(rpList));

    const randPhone = '098' + String(Math.floor(1000000 + Math.random() * 8999999));
    const uCreate = await req(base, 'POST', '/admin/users', adminToken, { full_name: 'Bac Si Verify', phone: randPhone, password: 'Password@123', gender: 'male', role_id: 2, is_active: 1 });
    assert(uCreate.json.code === '1000' && typeof uCreate.json.data.user_id === 'number' && uCreate.json.data.full_name === 'Bac Si Verify', 'POST /admin/users', JSON.stringify(uCreate));
    createdUserId = uCreate.json.data.user_id;

    const uDup = await req(base, 'POST', '/admin/users', adminToken, { full_name: 'Dup', phone: randPhone, password: 'Password@123', role_id: 2 });
    assert(uDup.json.code === '9996', 'POST /admin/users duplicate phone -> "9996"', JSON.stringify(uDup));

    const uList = await req(base, 'GET', '/admin/users?page=1&limit=10', adminToken);
    assert(uList.json.code === '1000' && Array.isArray(uList.json.data) && typeof uList.json.total === 'number', 'GET /admin/users with top-level total');

    const uDetail = await req(base, 'GET', `/admin/users/${createdUserId}`, adminToken);
    assert(uDetail.json.code === '1000' && uDetail.json.data.phone === randPhone, 'GET /admin/users/:id', JSON.stringify(uDetail));

    const uUpd = await req(base, 'PUT', `/admin/users/${createdUserId}`, adminToken, { full_name: 'Bac Si Verify 2', is_active: 1 });
    assert(uUpd.json.code === '1000' && uUpd.json.data.full_name === 'Bac Si Verify 2', 'PUT /admin/users/:id');

    const uAssign = await req(base, 'PUT', `/admin/users/${createdUserId}/assign`, adminToken, { branch_id: createdBranchId, department_id: createdDeptId, room_id: createdRoomId });
    assert(uAssign.json.code === '1000' && uAssign.json.data.room_id === createdRoomId, 'PUT /admin/users/:id/assign', JSON.stringify(uAssign));

    const rmDelBlocked = await req(base, 'DELETE', `/v1/rooms/${createdRoomId}`, adminToken);
    assert(rmDelBlocked.json.code === '1010', 'DELETE /v1/rooms/:id with staff -> "1010"', JSON.stringify(rmDelBlocked));

    // Slide 11: Templates
    const tCreate = await req(base, 'POST', '/templates', adminToken, { code_template: tmplCode, name: 'Template Verify', description: 'Desc', version: '1.0', is_active: '1' });
    assert(tCreate.json.code === '1000' && tCreate.json.data.code_template === tmplCode, 'POST /templates', JSON.stringify(tCreate));

    const tDup = await req(base, 'POST', '/templates', adminToken, { code_template: tmplCode, name: 'Dup' });
    assert(tDup.json.code === '9996', 'POST /templates duplicate -> "9996"');

    const tList = await req(base, 'GET', '/templates/all?page=1&limit=20', adminToken);
    assert(tList.json.code === '1000' && Array.isArray(tList.json.data) && tList.json.data.some((t) => t.code_template === tmplCode), 'GET /templates/all');

    const tUpd = await req(base, 'PUT', `/templates/${tmplCode}`, adminToken, { name: 'Template Verify 2', version: '2.0' });
    assert(tUpd.json.code === '1000' && tUpd.json.data.name === 'Template Verify 2', 'PUT /templates/:id');

    const sCreate = await req(base, 'POST', `/templates/${tmplCode}/sections`, adminToken, { title: 'Thong tin chung', order: '1', is_required: '1', filled_by: 'patient' });
    assert(sCreate.json.code === '1000' && sCreate.json.data.section_id && sCreate.json.data.filled_by === 'patient', 'POST /templates/:template_id/sections', JSON.stringify(sCreate));
    createdSectionId = sCreate.json.data.section_id;

    const sUpd = await req(base, 'PUT', `/templates/sections/${createdSectionId}`, adminToken, { title: 'Thong tin chung 2', filled_by: 'patdoc' });
    assert(sUpd.json.code === '1000' && sUpd.json.data.title === 'Thong tin chung 2', 'PUT /templates/sections/:id');

    const qCreate = await req(base, 'POST', `/templates/sections/${createdSectionId}/questions`, adminToken, {
      question_id: createdQuestionId,
      question_text: 'Muc do ngua?',
      type_question: 'radio',
      order: '1',
      is_required: '1',
      allow_image: '1',
      options: [
        { option_text: 'Nhe', option_value: 'MILD', order: '1' },
        { option_text: 'Nang', option_value: 'SEVERE', order: '2', trigger_image_upload: '1' },
      ],
    });
    assert(qCreate.json.code === '1000' && qCreate.json.data.question_id === createdQuestionId && qCreate.json.data.options?.length === 2, 'POST /templates/sections/:section_id/questions', JSON.stringify(qCreate));

    const qUpd = await req(base, 'PUT', `/templates/questions/${createdQuestionId}`, adminToken, {
      question_text: 'Muc do ngua (updated)?',
      options: [
        { id: qCreate.json.data.options[0].id, option_text: 'Rat nhe', option_value: 'VERY_MILD' },
        { option_text: 'Trung binh', option_value: 'MODERATE' },
      ],
    });
    assert(qUpd.json.code === '1000' && qUpd.json.data.options.length === 2 && qUpd.json.data.options[0].option_text === 'Rat nhe', 'PUT /templates/questions/:id', JSON.stringify(qUpd));

    const tDetail = await req(base, 'GET', `/templates/${tmplCode}`, adminToken);
    assert(tDetail.json.code === '1000' && tDetail.json.data.sections?.[0]?.questions?.[0]?.type_question === 'radio', 'GET /templates/:id tree', JSON.stringify(tDetail));

    // Deletes
    const qDel = await req(base, 'DELETE', `/templates/questions/${createdQuestionId}`, adminToken);
    assert(qDel.json.code === '1000', 'DELETE /templates/questions/:id');

    const sDel = await req(base, 'DELETE', `/templates/sections/${createdSectionId}`, adminToken);
    assert(sDel.json.code === '1000', 'DELETE /templates/sections/:id');

    const tDel = await req(base, 'DELETE', `/templates/${tmplCode}`, adminToken);
    assert(tDel.json.code === '1000', 'DELETE /templates/:id');

    const uDel = await req(base, 'DELETE', `/admin/users/${createdUserId}`, adminToken);
    assert(uDel.json.code === '1000', 'DELETE /admin/users/:id');
    createdUserId = null;

    const rpDel = await req(base, 'DELETE', `/role_permissions/${createdRoleId}/${createdPermId}`, adminToken);
    assert(rpDel.json.code === '1000', 'DELETE /role_permissions/:role_id/:permission_id');

    const permDel = await req(base, 'DELETE', `/v1/permissions/${createdPermId}`, adminToken);
    assert(permDel.json.code === '1000', 'DELETE /v1/permissions/:id');
    createdPermId = null;

    const dpDel = await req(base, 'DELETE', `/v1/departments/${createdDeptId}`, adminToken);
    assert(dpDel.json.code === '1000', 'DELETE /v1/departments/:id');
    createdDeptId = null;

    const rmAfterDeptDel = await req(base, 'GET', `/v1/rooms/${createdRoomId}`, adminToken);
    assert(rmAfterDeptDel.json.code === '1000' && rmAfterDeptDel.json.data.department_id === null, 'Room department_id SET NULL after dept delete', JSON.stringify(rmAfterDeptDel));

    const rmDel = await req(base, 'DELETE', `/v1/rooms/${createdRoomId}`, adminToken);
    assert(rmDel.json.code === '1000', 'DELETE /v1/rooms/:id');
    createdRoomId = null;

    const brDel = await req(base, 'DELETE', `/v1/branches/${createdBranchId}`, adminToken);
    assert(brDel.json.code === '1000', 'DELETE /v1/branches/:id');
    createdBranchId = null;
  } catch (err) {
    failed++;
    console.error('UNCAUGHT TEST ERROR:', err);
  } finally {
    const db = require('../src/config/db');
    const prisma = require('../src/config/prisma');
    if (createdRoleId) {
      await prisma.roleMeta.deleteMany({ where: { maVaiTro: BigInt(createdRoleId) } }).catch(() => {});
      await db.query('DELETE FROM public.vaitro WHERE ma_vai_tro = $1', [createdRoleId]).catch(() => {});
    }
    await prisma.$disconnect().catch(() => {});
    await db.pool.end().catch(() => {});
    server.close();
  }

  console.log(`\nVERIFICATION RESULT: ${passed} passed, ${failed} failed`);
  process.exit(failed > 0 ? 1 : 0);
})();
