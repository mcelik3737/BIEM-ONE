import assert from 'node:assert/strict';
import { mkdirSync, readFileSync, writeFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { chromium } from 'playwright';

process.chdir(fileURLToPath(new URL('../', import.meta.url)));
const fixture = JSON.parse(readFileSync('.runtime/acceptance-session.json', 'utf8'));
const origin = process.env.BROWSER_ORIGIN || 'http://localhost:3001';
const output = '.runtime/browser';
mkdirSync(output, { recursive: true });
const browser = await chromium.launch({
  executablePath: process.env.PLAYWRIGHT_EXECUTABLE_PATH || undefined,
});
const page = await browser.newPage({ viewport: { width: 1440, height: 1000 } });
page.setDefaultTimeout(20_000);
const errors = [];
const checks = [];
const browserRunId = Date.now();
page.on('pageerror', error => errors.push(error.message));
page.on('requestfailed', request => {
  if (request.url().includes('/api/v1/')) console.log(`API request failed ${new URL(request.url()).pathname}: ${request.failure()?.errorText}`);
});
page.on('response', response => {
  if (response.url().includes('/api/v1/') && response.status() >= 400) {
    console.log(`API ${response.status()} ${new URL(response.url()).pathname}`);
  }
});
function pass(name) { checks.push(name); console.log(`PASS ${name}`); }

async function openCompletedOrder() {
  await page.goto(`${origin}/projects`);
  await page.locator('.work-card').filter({ hasText: `RF feeder kabul ${fixture.runId}` }).click();
  const drawer = page.getByRole('dialog');
  await drawer.getByRole('button', { name: 'Operasyon', exact: true }).click();
  await drawer.getByRole('button', { name: 'Satınalma', exact: true }).click();
  const order = drawer.locator('.purchase-order-list article').filter({ hasText: 'Teslim Alındı' });
  await order.getByText('RF feeder · 100/100 metre', { exact: true }).waitFor();
  assert.match(await order.innerText(), /1\.200,00/);
  assert.match(await order.innerText(), /USD|\$/);
  await order.scrollIntoViewIfNeeded();
}

try {
  await page.goto(`${origin}/dashboard`);
  await page.waitForURL('**/login');
  await page.getByLabel('E-posta', { exact: true }).fill(fixture.email);
  await page.getByLabel('Şifre', { exact: true }).fill(fixture.password);
  await page.getByRole('button', { name: 'Giriş Yap', exact: true }).click();
  await page.waitForURL('**/dashboard');
  await page.getByRole('button', { name: 'Çıkış Yap', exact: true }).waitFor();
  await page.getByRole('link', { name: /^Geciken görevler:/ }).waitFor();
  await page.screenshot({ path: `${output}/dashboard.png`, fullPage: true });
  pass('Korumalı sayfa girişe yönlendiriyor; gerçek giriş ve gösterge paneli açılıyor');

  await page.getByRole('link', { name: /^Geciken görevler:/ }).click();
  await page.waitForURL('**/tasks?view=overdue');
  const taskRow = page.locator('.task-record').filter({ has: page.locator(`#task-${fixture.taskId}`) });
  await taskRow.getByRole('button', { name: 'Tamamla', exact: true }).click();
  await taskRow.waitFor({ state: 'hidden' });
  await page.getByRole('link', { name: 'Tamamlananlar', exact: true }).click();
  await page.waitForURL('**/tasks?view=done');
  await page.reload();
  await taskRow.getByRole('button', { name: 'Yeniden Aç', exact: true }).click();
  await taskRow.waitFor({ state: 'hidden' });
  await page.getByRole('link', { name: 'Gecikenler', exact: true }).click();
  await page.waitForURL('**/tasks?view=overdue');
  await taskRow.getByRole('button', { name: 'Düzenle', exact: true }).click();
  const editedTitle = `Düzenlenmiş saha kontrolü ${browserRunId}`;
  await page.getByLabel('Görev başlığı', { exact: true }).fill(editedTitle);
  await page.getByRole('button', { name: 'Kaydet', exact: true }).click();
  await taskRow.getByRole('heading', { name: editedTitle, exact: true }).waitFor();
  await taskRow.getByRole('link').click();
  await page.getByRole('dialog').locator('.task-row').getByText(editedTitle, { exact: true }).waitFor();
  await page.reload();
  await page.getByRole('dialog').locator('.task-row').getByText(editedTitle, { exact: true }).waitFor();
  pass('Geciken görev kartı → görev panosu → tamamlama/yeniden açma/düzenleme → ilgili iş dosyası ve yenileme');

  await page.goto(`${origin}/tasks`);
  await page.getByRole('button', { name: '+ Yeni Görev', exact: true }).click();
  const newTaskTitle = `Tarayıcı görevi ${browserRunId}`;
  await page.getByLabel('Görev başlığı', { exact: true }).fill(newTaskTitle);
  await page.getByRole('combobox', { name: /^Bağlı iş/ }).selectOption(fixture.projectId);
  await page.getByLabel('Termin', { exact: true }).fill('2000-01-02');
  await page.getByRole('button', { name: 'Kaydet', exact: true }).click();
  await page.locator('.task-board-form').waitFor({ state: 'hidden' });
  await page.reload();
  await page.getByRole('heading', { name: newTaskTitle, exact: true }).waitFor();
  await page.getByLabel('Görev veya iş ara', { exact: true }).fill(newTaskTitle);
  assert.equal(await page.locator('.task-record').count(), 1);
  await page.setViewportSize({ width: 390, height: 844 });
  await page.locator('.task-record').scrollIntoViewIfNeeded();
  assert.equal(await page.evaluate(() => document.documentElement.scrollWidth <= window.innerWidth), true, 'Görev panosu mobil ekranda taşıyor');
  await page.screenshot({ path: `${output}/tasks-mobile.png`, fullPage: true });
  await page.setViewportSize({ width: 1440, height: 1000 });
  pass('Panodan yeni görev oluşturma, arama, kalıcılık ve 390px mobil görünüm');

  // A failed session check is a connection problem, not proof of an invalid login.
  await page.route('**/api/v1/auth/me', route => route.abort('failed'), { times: 1 });
  await page.goto(`${origin}/customers`);
  await page.getByRole('button', { name: 'Tekrar Dene', exact: true }).waitFor();
  assert.equal(new URL(page.url()).pathname, '/customers');
  assert.equal(await page.evaluate(() => Boolean(localStorage.getItem('biem-one.access-token'))), true);
  await page.getByRole('button', { name: 'Tekrar Dene', exact: true }).click();
  await page.getByRole('button', { name: '+ Yeni Müşteri', exact: true }).waitFor();
  pass('Geçici bağlantı hatası oturumu silmiyor; yeniden şifre girmeden tekrar denenebiliyor');

  for (const [path, label] of [['customers', 'Müşteri'], ['suppliers', 'Tedarikçi']]) {
    const name = `Tarayıcı ${label} ${fixture.runId} ${browserRunId}`;
    await page.goto(`${origin}/${path}`);
    await page.getByRole('button', { name: `+ Yeni ${label}`, exact: true }).click();
    const modal = page.getByRole('dialog');
    await modal.getByLabel('Firma / Unvan *', { exact: true }).fill(name);
    await modal.getByRole('button', { name: 'Kaydet', exact: true }).click();
    await modal.waitFor({ state: 'hidden' });
    await page.reload();
    await page.getByRole('searchbox').fill(name);
    await page.locator('.master-list').getByRole('button').filter({ hasText: name }).waitFor();
    pass(`${label}: boş e-posta ile ekleme, arama ve yenileme sonrası kalıcılık`);
  }

  await openCompletedOrder();
  await page.screenshot({ path: `${output}/purchase-delivered.png`, fullPage: true });
  await page.reload();
  await openCompletedOrder();
  pass('API kabul testinin 1.200 USD / 100 metre siparişi gerçek ekranda ve yenilemeden sonra doğrulandı');

  await page.getByRole('dialog').getByRole('button', { name: 'Kapat', exact: true }).click();
  await page.getByRole('button', { name: 'Çıkış Yap', exact: true }).click();
  await page.waitForURL('**/login');
  await page.goto(`${origin}/dashboard`);
  await page.waitForURL('**/login');
  assert.deepEqual(errors, [], 'Tarayıcı JavaScript hataları');
  pass('Çıkış sonrası korumalı sayfa açılmıyor; JavaScript hatası yok');
  writeFileSync(`${output}/results.json`, JSON.stringify({ date: new Date().toISOString(), checks }, null, 2));
} catch (error) {
  await page.screenshot({ path: `${output}/failure.png`, fullPage: true });
  throw error;
} finally {
  await browser.close();
}
