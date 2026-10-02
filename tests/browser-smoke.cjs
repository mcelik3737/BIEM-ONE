const { chromium } = require(process.env.PLAYWRIGHT_MODULE || "playwright");
const assert = require("node:assert/strict");
if (!process.env.E2E_EMAIL || !process.env.E2E_PASSWORD)
  throw new Error(
    "E2E_EMAIL and E2E_PASSWORD must identify a disposable test account.",
  );
(async () => {
  const browser = await chromium.launch({
    executablePath: process.env.PLAYWRIGHT_EXECUTABLE_PATH,
    headless: true,
    args: ["--no-sandbox"],
  });
  const context = await browser.newContext({
    viewport: { width: 1440, height: 1000 },
    locale: "tr-TR",
  });
  const page = await context.newPage();
  page.setDefaultTimeout(10000);
  const errors = [];
  page.on("pageerror", (e) => errors.push(e.message));
  const base = process.env.E2E_ORIGIN || "http://127.0.0.1:3001";
  const suffix = Date.now();
  const customer = `Tarayıcı müşteri ${suffix}`,
    supplier = `Tarayıcı tedarikçi ${suffix}`,
    project = `RF saha testi ${suffix}`;
  try {
    await page.goto(base);
    await page.getByLabel("E-posta").fill(process.env.E2E_EMAIL);
    await page.getByLabel("Parola").fill(process.env.E2E_PASSWORD);
    await page.getByRole("button", { name: "Çalışma alanına gir →" }).click();
    await page.waitForURL("**/dashboard");
    await page.getByRole("heading", { name: "Genel bakış" }).waitFor();
    console.log("PASS login/dashboard");
    const cookies = await context.cookies();
    assert.ok(cookies.find((c) => c.name === "biem_access")?.httpOnly);
    assert.ok(cookies.find((c) => c.name === "biem_refresh")?.httpOnly);
    for (const [url, label, name] of [
      ["customers", "Müşteri", customer],
      ["suppliers", "Tedarikçi", supplier],
    ]) {
      await page.goto(`${base}/${url}`);
      await page.getByRole("button", { name: `+ ${label} ekle` }).click();
      await page.getByLabel("Firma unvanı *", { exact: true }).fill(name);
      await page.getByLabel("Yetkili kişi").fill("Test Yetkilisi");
      await page.getByRole("button", { name: "Kaydet", exact: true }).click();
      await page.locator("dialog").waitFor({ state: "detached" });
      await page.getByText(name, { exact: true }).waitFor();
      console.log(`PASS ${url} create`);
    }
    await page.goto(`${base}/projects`);
    await page.getByRole("button", { name: "+ İş dosyası aç" }).click();
    await page.getByLabel("İş adı *", { exact: true }).fill(project);
    await page
      .getByLabel("Müşteri *", { exact: false })
      .selectOption({ label: customer });
    await page.getByRole("button", { name: "İş dosyasını oluştur" }).click();
    await page.locator("dialog").waitFor({ state: "detached" });
    await page.getByRole("link", { name: project, exact: true }).click();
    await page
      .getByLabel("Satış aşaması", { exact: false })
      .selectOption("WON");
    await page.getByLabel("Operasyon aşaması").waitFor();
    console.log("PASS project win/operation");
    await page.getByRole("button", { name: /^Malzeme listesi \(/ }).click();
    await page.getByRole("button", { name: "+ Malzeme ekle" }).click();
    await page.getByLabel("Malzeme adı *", { exact: true }).fill("RF Kablo");
    await page.getByLabel("Miktar *", { exact: true }).fill("100");
    await page.getByLabel("Birim *", { exact: true }).fill("m");
    await page.getByLabel("Birim fiyat *", { exact: true }).fill("10");
    await page.getByLabel("Para birimi", { exact: false }).selectOption("USD");
    await page.getByRole("button", { name: "Malzemeyi kaydet" }).click();
    await page.locator("dialog").waitFor({ state: "detached" });
    await page.getByText("RF Kablo", { exact: true }).waitFor();
    console.log("PASS decimal BOM");
    await page.getByRole("button", { name: /^Satınalma \(/ }).click();
    await page.getByRole("button", { name: "+ Sipariş oluştur" }).click();
    await page
      .getByLabel("Tedarikçi *", { exact: false })
      .selectOption({ label: supplier });
    await page.getByRole("checkbox", { name: /RF Kablo/ }).check();
    await page.getByRole("button", { name: "Taslak sipariş oluştur" }).click();
    await page.locator("dialog").waitFor({ state: "detached" });
    await page.getByText("Taslak", { exact: true }).waitFor();
    assert.match(await page.locator("body").innerText(), /1\.200,00/);
    console.log("PASS PO $1200");
    for (const text of [
      "Onaya gönder",
      "Siparişi onayla",
      "Sipariş verildi olarak işaretle",
    ]) {
      await page.getByRole("button", { name: text, exact: true }).click();
    }
    await page.getByLabel("RF Kablo teslimat miktarı").fill("40");
    await page.getByRole("button", { name: "Teslimatı kaydet" }).click();
    await page.getByText("Kısmi teslim", { exact: true }).waitFor();
    await page.getByLabel("RF Kablo teslimat miktarı").fill("60");
    await page.getByRole("button", { name: "Teslimatı kaydet" }).click();
    await page.getByText("Teslim alındı", { exact: true }).waitFor();
    console.log("PASS approve/order/40+60 receipt");
    await page.reload();
    await page.getByRole("button", { name: /^Satınalma \(/ }).click();
    await page.getByText("Teslim alındı", { exact: true }).waitFor();
    console.log("PASS persistence after reload");
    await page.goto(`${base}/dashboard`);
    await page.getByRole("heading", { name: "Genel bakış" }).waitFor();
    await page.getByText(project, { exact: true }).first().waitFor();
    if (process.env.E2E_SCREENSHOT_DIR)
      await page.screenshot({
        path: require("node:path").join(
          process.env.E2E_SCREENSHOT_DIR,
          "dashboard.png",
        ),
        fullPage: true,
      });
    await page.setViewportSize({ width: 390, height: 844 });
    if (process.env.E2E_SCREENSHOT_DIR)
      await page.screenshot({
        path: require("node:path").join(
          process.env.E2E_SCREENSHOT_DIR,
          "mobile.png",
        ),
        fullPage: true,
      });
    assert.equal(
      await page.evaluate(
        () => document.documentElement.scrollWidth <= window.innerWidth,
      ),
      true,
    );
    console.log("PASS mobile width 390");
    const csrf = await context.request.post(`${base}/api/session/logout`, {
      headers: { Origin: "https://different.example" },
    });
    assert.equal(csrf.status(), 403);
    console.log("PASS cross-origin request blocked");
    await page.getByRole("button", { name: "Çıkış", exact: true }).click();
    await page.waitForURL("**/login");
    const remain = await context.cookies();
    assert.ok(
      !remain.some(
        (c) => c.name === "biem_access" || c.name === "biem_refresh",
      ),
    );
    assert.deepEqual(errors, []);
    console.log("PASS logout/cookies/no JS errors");
  } catch (e) {
    if (process.env.E2E_SCREENSHOT_DIR)
      await page.screenshot({
        path: require("node:path").join(
          process.env.E2E_SCREENSHOT_DIR,
          "failure.png",
        ),
        fullPage: true,
      });
    console.error("PAGE", await page.locator("body").innerText());
    throw e;
  } finally {
    await browser.close();
  }
})().catch((e) => {
  console.error(e);
  process.exitCode = 1;
});
