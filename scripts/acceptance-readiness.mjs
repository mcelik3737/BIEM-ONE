import assert from 'node:assert/strict';

// Called only by the acceptance suite against its explicitly isolated test company.
export async function checkReadiness({ db, request, token, engineerToken, otherToken, managerToken, admin, other, customer, companyA, user, pass, runId }) {
  const project = await request('/projects', token, 'POST', {
    name: `Hazırlık kabul ${runId}`, customerId: customer.id, ownerId: admin.id,
  }, 201);
  const path = `/projects/${project.id}`;
  const readiness = `${path}/operation/readiness`;
  await request(readiness, token, 'GET', undefined, 404);
  for (const stageCode of ['DEGERLENDIRME', 'COZUM_KESIF', 'TEKLIF_VERILDI', 'KARAR_BEKLENIYOR', 'KAZANILDI']) {
    await request(`${path}/stage`, token, 'PATCH', { stageCode });
  }
  await request(readiness, null, 'GET', undefined, 401);
  await request(readiness, otherToken, 'GET', undefined, 404);
  await request('/projects/nonexistent-readiness/operation/readiness', token, 'GET', undefined, 404);
  const check = (result, code) => result.checks.find(item => item.code === code);
  const snapshot = () => db.project.findUniqueOrThrow({ where: { id: project.id }, include: {
    operation: true, checklistItems: true, tasks: true, timelineEvents: true,
  } });
  const before = await snapshot();
  for (const reader of [token, engineerToken, managerToken]) {
    const data = await request(readiness, reader);
    assert.equal(data.policyVersion, 'readiness-v1');
    assert.equal(data.advisoryOnly, true);
    assert.ok(Number.isFinite(Date.parse(data.evaluatedAt)));
    assert.equal(check(data, 'DISCOVERY_CHECKLIST').status, 'MISSING');
    assert.equal(check(data, 'DISCOVERY_CHECKLIST').target, 'CATEGORY');
    assert.deepEqual(Object.keys(data).sort(), ['advisoryOnly', 'checks', 'evaluatedAt', 'policyVersion']);
    assert.doesNotMatch(JSON.stringify(data), /passwordHash|salary|monthlyEmployerCost|documentContent|accessToken|downloadUrl/);
    assert.ok(!JSON.stringify(data).includes(admin.email));
  }
  assert.deepEqual(await snapshot(), before, 'Hazırlık okuması veri veya olay oluşturdu');
  pass('Hazırlık API: 401/404, proje yöneticisi ve saha rolü, özel veri sızmaması, salt-okunur erişim');

  await request(`${path}/operation`, token, 'PATCH', { operationManagerId: null, plannedStartAt: '2030-01-05', plannedEndAt: '2030-01-01', nextAction: '  ', nextActionDueAt: null });
  let data = await request(readiness, token);
  for (const code of ['OPERATION_MANAGER', 'PLANNED_DATES', 'NEXT_ACTION']) assert.equal(check(data, code).status, 'MISSING');
  const inactive = await user(companyA, 'FIELD_ENGINEER', 'readiness-inactive');
  await request(`${path}/operation`, token, 'PATCH', { operationManagerId: inactive.id });
  await db.user.update({ where: { id: inactive.id }, data: { isActive: false } });
  assert.equal(check(await request(readiness, token), 'OPERATION_MANAGER').status, 'MISSING');
  // Simulate a corrupt historical association: a foreign manager cannot make readiness green.
  await db.projectOperation.update({ where: { projectId: project.id }, data: { operationManagerId: other.id } });
  assert.equal(check(await request(readiness, token), 'OPERATION_MANAGER').status, 'MISSING');
  await request(`${path}/operation`, token, 'PATCH', {
    operationManagerId: admin.id, plannedStartAt: '2000-01-01', plannedEndAt: '2000-01-02',
    nextAction: 'Saha planını hazırla', nextActionDueAt: '2030-01-01',
  });
  data = await request(readiness, token);
  for (const code of ['OPERATION_MANAGER', 'PLANNED_DATES', 'NEXT_ACTION']) assert.equal(check(data, code).status, 'COMPLETE');
  pass('Hazırlık eksikleri: pasif/yabancı sorumlu, ters tarih ve boş aksiyon; kayıt düzeltmesiyle güncel sonuç');

  // Create the missing-initialization case directly in this isolated fixture.
  await db.project.update({ where: { id: project.id }, data: { category: 'RADIO_COMMUNICATION' } });
  const emptyBefore = await snapshot();
  data = await request(readiness, token);
  assert.equal(check(data, 'DISCOVERY_CHECKLIST').status, 'MISSING');
  assert.equal(check(data, 'DISCOVERY_CHECKLIST').target, 'CHECKLIST');
  assert.deepEqual(await snapshot(), emptyBefore);
  const checklist = await request(`${path}/checklist/initialize`, token, 'POST', {}, 201);
  const required = checklist.filter(item => item.isRequired);
  assert.ok(required.length > 0);
  for (const item of required) await request(`${path}/checklist/${item.id}`, token, 'PATCH', { isCompleted: true });
  assert.equal(check(await request(readiness, token), 'DISCOVERY_CHECKLIST').status, 'COMPLETE');
  await db.projectChecklistItem.delete({ where: { id: required[0].id } });
  data = await request(readiness, token);
  assert.equal(check(data, 'DISCOVERY_CHECKLIST').status, 'MISSING');
  assert.ok(check(data, 'DISCOVERY_CHECKLIST').missingItems.includes(required[0].title));
  await db.project.update({ where: { id: project.id }, data: { category: 'EV_CHARGING' } });
  assert.equal(check(await request(readiness, token), 'DISCOVERY_CHECKLIST').status, 'MISSING');
  pass('Kontrol listesi: boş, kısmi ve eski kategori verisi başarı sayılmıyor; zorunlu madde başlıkları görünür');

  for (const code of ['PROJECT_TEAM_SAFETY', 'ACCEPTANCE_EVIDENCE']) {
    const item = check(data, code);
    assert.equal(item.status, 'NOT_IMPLEMENTED'); assert.equal(item.target, null);
  }
  const advanced = await request(`${path}/operation/advance`, token, 'POST', {}, 201);
  assert.equal(advanced.operationStage, 'SATINALMA', 'Bilgi kontrolü mevcut geçişi engellememeli');
  await request(`${path}/operation/revert`, token, 'POST', { reason: 'Hazırlık kabul testinin başlangıcına dön' }, 201);
  await request(`${path}/stage`, token, 'PATCH', { stageCode: 'KARAR_BEKLENIYOR', reason: 'Kazanılmamış işe hazırlık erişimi testi' });
  await request(readiness, token, 'GET', undefined, 404);
  await request(`${path}/stage`, token, 'PATCH', { stageCode: 'KAZANILDI' });
  pass('Hazırlık bilgi niteliğinde; İSG/kabul onayı üretmiyor, mevcut geçişleri koruyor');

  // Leave an intentionally incomplete fixture for real browser corrections.
  await request(`${path}/operation`, token, 'PATCH', { operationManagerId: null, plannedStartAt: null, plannedEndAt: null, nextAction: null, nextActionDueAt: null });
  await request(path, token, 'PATCH', { category: null });
  await db.projectChecklistItem.updateMany({ where: { projectId: project.id }, data: { isCompleted: false, completedAt: null, completedById: null } });
  return { readinessProjectId: project.id, readinessOwnerId: admin.id };
}
