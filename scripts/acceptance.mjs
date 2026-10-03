import assert from 'node:assert/strict';
import { createRequire } from 'node:module';
import { randomBytes } from 'node:crypto';
import { existsSync, mkdirSync, writeFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
const root = fileURLToPath(new URL('../', import.meta.url));
process.chdir(root);
// CI supplies its disposable database settings directly, without a local .env.
if (existsSync('.env')) process.loadEnvFile('.env');
const require = createRequire(new URL('../apps/api/package.json', import.meta.url));
const { PrismaClient } = require('@prisma/client');
const { hash } = require('bcryptjs');
const db = new PrismaClient();
const base = process.env.ACCEPTANCE_API_URL || 'http://localhost:3000/api/v1';
const runId = `kabul-${Date.now()}`;
const password = randomBytes(24).toString('base64url');
const checks = [];
function pass(name) { checks.push(name); console.log(`PASS ${name}`); }
async function request(path, token, method = 'GET', body, expected = 200) {
  const response = await fetch(`${base}${path}`, { method, headers: { 'Content-Type': 'application/json', ...(token ? { Authorization: `Bearer ${token}` } : {}) }, body: body === undefined ? undefined : JSON.stringify(body) });
  const data = await response.json();
  assert.equal(response.status, expected, `${method} ${path}: beklenen ${expected}, gelen ${response.status}; ${JSON.stringify(data.message || '')}`);
  return data;
}
async function login(email, secret = password) { return request('/auth/login', null, 'POST', { email, password: secret }, 201); }
try {
  await request('/health'); pass('API health');
  await login(process.env.SEED_ADMIN_EMAIL, process.env.SEED_ADMIN_PASSWORD); pass('Yapılandırılmış yönetici hesabıyla giriş');
  const passwordHash = await hash(password, 10);
  for (const code of ['COMPANY_ADMIN', 'FIELD_ENGINEER']) await db.role.upsert({ where: { code }, update: {}, create: { code, name: code } });
  const companyA = await db.company.create({ data: { name: `KABUL TESTİ A ${runId}`, slug: `${runId}-a` } });
  const companyB = await db.company.create({ data: { name: `KABUL TESTİ B ${runId}`, slug: `${runId}-b` } });
  async function user(company, role, suffix) {
    return db.user.create({ data: { companyId: company.id, email: `${runId}-${suffix}@example.test`, fullName: `Kabul ${suffix}`, passwordHash, roles: { create: { role: { connect: { code: role } } } } } });
  }
  const admin = await user(companyA, 'COMPANY_ADMIN', 'admin');
  const engineer = await user(companyA, 'FIELD_ENGINEER', 'engineer');
  const other = await user(companyB, 'COMPANY_ADMIN', 'other');
  const token = (await login(admin.email)).tokens.accessToken;
  const engineerToken = (await login(engineer.email)).tokens.accessToken;
  const otherToken = (await login(other.email)).tokens.accessToken;
  const customer = await request('/customers', token, 'POST', { name: `Kabul RF Müşteri ${runId}`, email: '' }, 201);
  const supplier = await request('/suppliers', token, 'POST', { name: `Kabul RF Tedarikçi ${runId}`, email: '' }, 201);
  for (const [path, value] of [['customers', customer], ['suppliers', supplier]]) {
    const updated = await request(`/${path}/${value.id}`, token, 'PATCH', { name: value.name + ' Güncel' });
    assert.equal(updated.name, value.name + ' Güncel');
    assert.equal((await request(`/${path}/${value.id}/active`, token, 'PATCH', { isActive: false })).isActive, false);
    assert.equal((await request(`/${path}/${value.id}/active`, token, 'PATCH', { isActive: true })).isActive, true);
    await request(`/${path}/${value.id}`, otherToken, 'PATCH', { name: 'Erişim reddedilmeli' }, 404);
  }
  await request('/customers', token, 'POST', { name: 'Yetkisiz şirket ataması', companyId: companyB.id }, 400);
  pass('Müşteri/tedarikçi oluşturma, düzenleme, aktif/pasif ve companyId enjeksiyon engeli');
  const project = await request('/projects', token, 'POST', { name: `RF feeder kabul ${runId}`, customerId: customer.id, estimatedValue: 1000, currency: 'USD' }, 201);
  const projectPath = `/projects/${project.id}`;
  for (const stageCode of ['DEGERLENDIRME', 'COZUM_KESIF', 'TEKLIF_VERILDI', 'KARAR_BEKLENIYOR', 'KAZANILDI']) await request(`${projectPath}/stage`, token, 'PATCH', { stageCode });
  const operation = await request(`${projectPath}/operation`, token);
  assert.equal(operation.projectId, project.id);
  await request(`${projectPath}/stage`, token, 'PATCH', { stageCode: 'KAZANILDI' });
  assert.equal(await db.project.count({ where: { companyId: companyA.id } }), 1);
  assert.equal(await db.projectOperation.count({ where: { projectId: project.id } }), 1);
  pass('İş aşamaları ve tek Project → tek ProjectOperation');
  const prefix = `${projectPath}/operation`;
  const bom = await request(`${prefix}/bom`, token, 'POST', { itemType: 'MALZEME', description: 'RF feeder', quantity: '100', unit: 'metre', currency: 'USD', estimatedUnitCost: '10' }, 201);
  assert.equal(bom.estimatedTotalCost, '1000');
  assert.equal((await request(`${prefix}/bom`, token)).totals.USD, '1000.00');
  pass('BOM formuyla aynı metin girdisi: 100 metre × 10 USD = 1.000 USD');
  const orderInput = { supplierId: supplier.id, currency: 'USD', items: [{ bomItemId: bom.id, description: 'RF feeder', quantity: 100, unit: 'metre', unitPrice: 10, taxRate: 20 }] };
  const order = await request(`${prefix}/purchase-orders`, token, 'POST', orderInput, 201);
  assert.equal(order.subtotal, '1000'); assert.equal(order.taxTotal, '200'); assert.equal(order.grandTotal, '1200');
  pass('Sunucu Decimal hesapları: %20 KDV ile 1.200 USD');
  const orderPath = `${prefix}/purchase-orders/${order.id}`;
  await request(`${prefix}/purchase-orders`, token, 'POST', { ...orderInput, currency: 'EUR' }, 400);
  await request(`${prefix}/bom/${bom.id}`, token, 'DELETE', undefined, 400);
  await request(`${orderPath}/status`, token, 'POST', { status: 'ONAY_BEKLIYOR' }, 201);
  await request(`${orderPath}/approve`, engineerToken, 'POST', {}, 403);
  await request(`${orderPath}/status`, engineerToken, 'POST', { status: 'ONAYLANDI' }, 400);
  await request(`${orderPath}/approve`, token, 'POST', {}, 201);
  await request(`${orderPath}/status`, token, 'POST', { status: 'SIPARIS_VERILDI' }, 201);
  pass('Rol kontrollü onay; bağlı BOM silme ve para birimi uyuşmazlığı engeli');
  const receive = (quantity, expected = 201) => request(`${orderPath}/receive`, token, 'POST', { itemId: order.items[0].id, quantity }, expected);
  let delivery = await receive(40);
  assert.equal(delivery.status, 'KISMI_TESLIM'); assert.equal(delivery.items[0].receivedQuantity, '40');
  await receive(61, 400);
  delivery = await receive(60);
  assert.equal(delivery.status, 'TESLIM_ALINDI'); assert.equal(delivery.items[0].receivedQuantity, '100');
  await receive(1, 400);
  pass('40 + 60 metre kısmi/tam teslim; 61 ve ek 1 metre fazla teslim reddi');
  for (const path of [projectPath, `${prefix}/bom`, `${prefix}/purchase-orders`, orderPath]) await request(path, otherToken, 'GET', undefined, 404);
  await request(`${orderPath}/receive`, otherToken, 'POST', { itemId: order.items[0].id, quantity: 1 }, 404);
  for (const path of ['/customers', '/suppliers', '/projects', '/tasks', '/contacts', '/files', '/timeline-events', '/audit-logs']) assert.equal((await request(path, otherToken)).length, 0, path);
  assert.deepEqual((await request('/users', otherToken)).map(u => u.id), [other.id]);
  await request(`/users/${admin.id}`, otherToken, 'GET', undefined, 404);
  pass('Başka şirketin kayıtlarına ve genel liste uçlarına erişim izolasyonu');
  // A separate order checks concurrent delivery and cancellation without disturbing the 40+60 proof.
  const concurrent = await request(`${prefix}/purchase-orders`, token, 'POST', orderInput, 201);
  const cp = `${prefix}/purchase-orders/${concurrent.id}`;
  await request(`${cp}/status`, token, 'POST', { status: 'ONAY_BEKLIYOR' }, 201);
  await request(`${cp}/approve`, token, 'POST', {}, 201);
  await request(`${cp}/status`, token, 'POST', { status: 'SIPARIS_VERILDI' }, 201);
  const results = await Promise.all([60, 60].map(quantity => fetch(`${base}${cp}/receive`, { method: 'POST', headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` }, body: JSON.stringify({ itemId: concurrent.items[0].id, quantity }) })));
  assert.deepEqual(results.map(r => r.status).sort(), [201, 400]);
  const cancelled = await request(`${cp}/status`, token, 'POST', { status: 'IPTAL' }, 201);
  assert.equal(cancelled.items[0].receivedQuantity, '60');
  assert.equal((await request(cp, token)).status, 'IPTAL');
  await request(`${cp}/receive`, token, 'POST', { itemId: concurrent.items[0].id, quantity: 1 }, 400);
  await request(`${prefix}/bom/${bom.id}`, token, 'DELETE', undefined, 400);
  pass('Eşzamanlı 60+60 teslimden biri reddedildi; iptalde kalem/teslim geçmişi korundu');
  const persisted = await db.purchaseOrder.findUniqueOrThrow({ where: { id: order.id }, include: { items: true } });
  assert.equal(persisted.items[0].receivedQuantity.toString(), '100');
  assert.equal((await request(orderPath, token)).grandTotal, '1200');
  pass('Veritabanından ve yeni HTTP isteğinden kalıcılık doğrulandı');
  mkdirSync('.runtime', { recursive: true });
  writeFileSync('.runtime/acceptance-session.json', JSON.stringify({ email: admin.email, password, projectId: project.id, orderId: order.id, customerId: customer.id, supplierId: supplier.id, runId }));
  writeFileSync('.runtime/acceptance-results.json', JSON.stringify({ date: new Date().toISOString(), runId, checks, projectId: project.id }, null, 2));
  console.log(`Tamamlandı: ${checks.length} kabul grubu. Ayrı test şirketleri korundu; kimlik bilgileri yalnızca .runtime içinde.`);
} finally { await db.$disconnect(); }
