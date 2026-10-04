import assert from 'node:assert/strict';
import { mkdirSync, readFileSync, writeFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { chromium } from 'playwright';

process.chdir(fileURLToPath(new URL('../', import.meta.url)));
const fixture = JSON.parse(readFileSync('.runtime/acceptance-session.json', 'utf8'));
assert.ok(fixture.readinessProjectId, 'Önce izole API kabulü çalıştırılmalı.');
const origin = process.env.BROWSER_ORIGIN || 'http://localhost:3001';
const output = '.runtime/browser';
mkdirSync(output, { recursive: true });
const browser = await chromium.launch({ executablePath: process.env.PLAYWRIGHT_EXECUTABLE_PATH || undefined });
const page = await browser.newPage({ viewport: { width: 1440, height: 1100 } });
page.setDefaultTimeout(20_000);
const errors = [], checks = [];
page.on('pageerror', error => errors.push(error.message));
const pass = name => { checks.push(name); console.log(`PASS ${name}`); };
const drawer = page.getByRole('dialog');
const panel = page.getByRole('region', { name: 'Hazırlık kontrolü', exact: true });
const operationForm = drawer.locator('.operation-form');
const checkRow = code => panel.locator(`[data-check="${code}"]`);
const projectUrl = `${origin}/projects?project=${fixture.readinessProjectId}&tab=operation`;

try {
  await page.goto(`${origin}/login`);
  await page.getByLabel('E-posta', { exact: true }).fill(fixture.email);
  await page.getByLabel('Şifre', { exact: true }).fill(fixture.password);
  await page.getByRole('button', { name: 'Giriş Yap', exact: true }).click();
  await page.waitForURL('**/dashboard');
  await page.goto(projectUrl);
  await panel.getByRole('button', { name: 'Kategori seç', exact: true }).click();
  assert.equal(await page.evaluate(() => document.activeElement?.getAttribute('name')), 'category');
  await drawer.locator('select[name="category"]').selectOption('RADIO_COMMUNICATION');
  await drawer.getByRole('button', { name: 'Kaydet', exact: true }).click();
  await drawer.locator('.drawer-edit-form').waitFor({ state: 'hidden' });
  await drawer.getByRole('button', { name: 'Operasyon', exact: true }).click();
  await checkRow('DISCOVERY_CHECKLIST').getByText('Eksik', { exact: true }).waitFor();
  await panel.getByRole('button', { name: 'Tarihleri düzenle', exact: true }).click();
  assert.equal(await page.evaluate(() => document.activeElement?.getAttribute('name')), 'plannedStartAt');
  await operationForm.getByRole('button', { name: 'Vazgeç', exact: true }).click();
  await panel.getByRole('button', { name: 'Aksiyonu düzenle', exact: true }).click();
  assert.equal(await page.evaluate(() => document.activeElement?.getAttribute('name')), 'nextAction');
  await operationForm.getByRole('button', { name: 'Vazgeç', exact: true }).click();
  await panel.getByRole('button', { name: 'Sorumlu ata', exact: true }).click();
  assert.equal(await page.evaluate(() => document.activeElement?.getAttribute('name')), 'operationManagerId');
  await operationForm.getByLabel('Operasyon Sorumlusu', { exact: true }).selectOption(fixture.readinessOwnerId);
  await operationForm.getByLabel('Planlanan Başlangıç', { exact: true }).fill('2030-01-01');
  await operationForm.getByLabel('Planlanan Bitiş', { exact: true }).fill('2030-01-05');
  await operationForm.getByLabel('Sonraki Aksiyon', { exact: true }).fill('Saha hazırlığını kontrol et');
  await operationForm.getByLabel('Sonraki Aksiyon Tarihi', { exact: true }).fill('2030-01-02');
  await operationForm.getByRole('button', { name: 'Kaydet', exact: true }).click();
  await operationForm.waitFor({ state: 'hidden' });
  for (const code of ['OPERATION_MANAGER', 'PLANNED_DATES', 'NEXT_ACTION']) await checkRow(code).getByText('Tamam', { exact: true }).waitFor();
  pass('Hazırlık eksiklerinden kategori/sorumlu/tarih/aksiyon alanına odaklanma ve kayıt sonrası güncel sonuç');

  await panel.getByRole('button', { name: 'Kontrol listesini aç', exact: true }).click();
  const required = drawer.locator('.checklist-row').filter({ hasText: 'Zorunlu' });
  await required.first().waitFor();
  const count = await required.count();
  assert.ok(count > 0);
  for (let index = 0; index < count; index++) {
    const saved = page.waitForResponse(response => response.url().includes(`/projects/${fixture.readinessProjectId}/checklist/`) && response.request().method() === 'PATCH');
    await required.nth(index).getByRole('checkbox').check();
    assert.equal((await saved).status(), 200);
  }
  await drawer.getByRole('button', { name: 'Operasyon', exact: true }).click();
  await checkRow('DISCOVERY_CHECKLIST').getByText('Tamam', { exact: true }).waitFor();
  await page.reload();
  for (const code of ['OPERATION_MANAGER', 'PLANNED_DATES', 'NEXT_ACTION', 'DISCOVERY_CHECKLIST']) await checkRow(code).getByText('Tamam', { exact: true }).waitFor();
  assert.equal(await panel.getByText('Ayrı kontrol gerekli', { exact: true }).count(), 2);
  await panel.getByText(/Sahaya çıkış onayı değildir/).waitFor();
  await panel.scrollIntoViewIfNeeded();
  await page.screenshot({ path: `${output}/readiness-desktop.png`, fullPage: true });
  pass('Zorunlu keşif maddeleri, yenilemede kalıcılık ve İSG/kabul için ayrı değerlendirme açıklaması');

  const routePattern = `**/projects/${fixture.readinessProjectId}/operation/readiness`;
  await page.route(routePattern, route => route.abort('failed'));
  await panel.getByRole('button', { name: 'Kontrolü yenile', exact: true }).click();
  await panel.getByRole('alert').getByText('Hazırlık kontrolü yüklenemedi.', { exact: true }).waitFor();
  assert.equal(await panel.locator('.readiness-item').count(), 0);
  await page.unroute(routePattern);
  await panel.getByRole('button', { name: 'Tekrar dene', exact: true }).click();
  await checkRow('PLANNED_DATES').getByText('Tamam', { exact: true }).waitFor();
  pass('Ağ hatasında eski başarı gösterilmiyor; tekrar denemeyle oturum korunarak toparlanıyor');

  await page.setViewportSize({ width: 390, height: 844 });
  await panel.scrollIntoViewIfNeeded();
  assert.equal(await page.evaluate(() => document.documentElement.scrollWidth <= window.innerWidth), true, 'Mobil sayfa yatay taşıyor');
  assert.equal(await drawer.evaluate(element => element.scrollWidth <= element.clientWidth), true, 'Mobil iş dosyası yatay taşıyor');
  await page.screenshot({ path: `${output}/readiness-mobile.png`, fullPage: true });
  assert.deepEqual(errors, []);
  pass('390px mobil görünüm ve JavaScript hatası olmadan hazırlık listesi');
  writeFileSync(`${output}/readiness-results.json`, JSON.stringify({ time: new Date().toISOString(), checks }, null, 2));
} catch (error) {
  await page.screenshot({ path: `${output}/readiness-failure.png`, fullPage: true }).catch(() => {});
  console.error(error.message);
  process.exitCode = 1;
} finally {
  await browser.close();
}
