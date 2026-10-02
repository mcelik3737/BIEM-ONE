# BIEM ONE

BIEM Teknoloji için müşteri, iş dosyası, operasyon, BOM ve satınalma yönetimi.

Bu sürümde yönetim paneli gerçek NestJS API'sine ve PostgreSQL kayıtlarına bağlıdır. Flutter uygulaması hâlâ başlangıç iskeletidir.

## Windows'ta başlatma

Gereksinim: Docker Desktop çalışır durumda, Docker Compose v2 güncel. Bu daldaki dosyaları aldıktan sonra PowerShell'de:

```powershell
cd C:\BIEM-ONE
powershell -ExecutionPolicy Bypass -File .\scripts\Start-Biem.ps1
```

İlk çalıştırmada yönetici e-posta adresi ve en az 12 karakterlik parola sorulur. Rastgele veritabanı/JWT anahtarları oluşturulur. İmajlar derlenir, migrasyon ve ilk kullanıcı kurulumu tamamlanır; tarayıcı **http://localhost:3001** adresinde açılır. Sonraki çalıştırmalar mevcut ayarları ve verileri korur.

Bu kurulum `biem-one-core` adlı ayrı Compose projesi ve yeni kalıcı veritabanı kullanır. Eski `biem-one-postgres` volume'una dokunmaz ve mevcut kayıtları otomatik taşımaz. Mevcut veritabanı için [güvenli geçiş](docs/operations/DATABASE_UPGRADE.md) belgesini kullanın.

`.env.quickstart` parola içerir; paylaşmayın. Otomatik oluşturulan dosya Git ve Docker derleme bağlamından dışlanmıştır. Varsayılan yönetici parolası yoktur. Seed yeniden çalıştırıldığında mevcut kullanıcıların parolaları/yetkileri değiştirilmez.

Log ve durum:

```powershell
docker compose --env-file .env.quickstart -f infrastructure/docker/compose.quickstart.yml ps
docker compose --env-file .env.quickstart -f infrastructure/docker/compose.quickstart.yml logs --tail 100 api admin migrate
```

Durdurmak için `up` yerine `stop` kullanın. Kalıcı volume'u silmeyin.

## İlk işinizi tamamlayın

1. Müşteriler ve Tedarikçiler ekranlarında firma ekleyin.
2. İş dosyası açın, müşteriyi seçin. Satış aşamalarını güncelleyin.
3. Aşamayı **Kazanıldı** yapın: aynı iş dosyasına tek bir operasyon açılır.
4. Malzeme listesine ad, miktar, birim, fiyat ve TRY/USD/EUR ekleyin. Ondalıklı miktar desteklenir.
5. Satınalma sekmesinde BOM kalemlerini ve tedarikçiyi seçin; taslak oluşturun.
6. Onaya gönderin. Şirket yöneticisi onaylasın; ardından sipariş verildi olarak işaretleyin.
7. Kısmi veya tam teslimatları kaydedin. Fazla teslimat reddedilir; işlem geçmişi korunur.

Kabul örneği: **100 m × 10 USD = 1.000 USD; %20 KDV ile 1.200 USD.** Önce 40 m, sonra 60 m teslim alın. Kalan miktar sıfır olunca sipariş tamamlanır.

## Yetkiler ve kayıt kuralları

| İşlem | Şirket yöneticisi | Proje yöneticisi | Saha mühendisi |
|---|---|---|---|
| Şirket kayıtlarını görme | Evet | Evet | Evet |
| Firma, iş dosyası, BOM, sipariş oluşturma | Evet | Evet | Hayır |
| Sipariş onaylama | Evet | Hayır | Hayır |
| Teslimat kaydetme | Evet | Evet | Evet |

İş uçlarında SUPER_ADMIN de kendi şirketiyle sınırlıdır. Pasif firmalar yeni iş/siparişte seçilemez. Siparişe bağlanan BOM değiştirilmez/silinmez. Siparişler fiziksel silinmez; teslimat başlamadan iptal edilebilir. İptal edilen miktar yeniden siparişe açılır. Para birimleri ayrı hesaplanır. Parasal değerler ve miktarlar API'de string, PostgreSQL'de Decimal olarak saklanır.

## Geliştirme

Node.js 24, pnpm 11.7.0 ve PostgreSQL 16 kullanın. Ortam dosyalarını örneklerden oluşturup kendi bağlantı/anahtarlarınızı girin:

```bash
pnpm install --frozen-lockfile --ignore-scripts
pnpm db:generate
# DATABASE_URL boş bir geliştirme veritabanına veya doğrulanmış geçiş hedefine işaret etmeli.
pnpm db:deploy
pnpm db:seed
pnpm dev:api
# İkinci terminal:
pnpm dev:admin
```

API `.env` dosyası: `apps/api/.env`; panel `.env.local` dosyası: `apps/admin/.env.local`. API tabanı `http://localhost:3000/api/v1`, Swagger `http://localhost:3000/docs`. Panel `API_INTERNAL_URL` üzerinden sunucudan API'ye erişir; tokenlar HTTP-only çerezlerde tutulur. APP_ORIGIN tarayıcıdaki origin ile birebir aynı olmalı. HTTPS origin'de çerezler Secure olur.

```bash
pnpm build
pnpm lint
# Yalnız ayrı, adı _test ile biten veritabanında:
DATABASE_URL=postgresql://.../biem_test pnpm test:acceptance
```

Test öncesi test DB'sine `pnpm db:deploy` uygulayın. Testler kendi firmalarını oluşturur; mevcut kayıtları silmez. GitHub Actions aynı build/lint/gerçek PostgreSQL ve tarayıcı kabul kontrollerini çalıştırır. [Doğrulama kaydı](docs/operations/VALIDATION.md) mevcut kapsamı açıklar.

Tarayıcı testi için ayrı test hesabıyla API ve panel çalışır durumda olmalı. `pnpm exec playwright install chromium` sonrası `E2E_EMAIL`, `E2E_PASSWORD` ve panel origin'i için `E2E_ORIGIN` ortam değişkenlerini ayarlayıp `pnpm test:browser` çalıştırın. Test yeni müşteri, tedarikçi ve iş dosyası oluşturur; yalnız test çalışma alanında kullanın. Test otomasyonu `tests/browser-smoke.cjs` içindedir.

Bu quickstart yalnız yerel kullanım için localhost'a açılır. Çok sunuculu yayında paylaşılan giriş hız sınırı, HTTPS, yedekleme, izleme ve hesap/parola yönetimi ayrıca hazırlanmalıdır.

## Codex, Claude Code ve RF çalışmaları

`AGENTS.md` ve `CLAUDE.md` proje kurallarını yönlendirir. [BIEM RF iş akışı](docs/ai/BIEM_RF_WORKFLOW.md), K-Dense Scientific Agents'ın sabit sürümlü **RF/Microwave Engineer** profilini kullanır. Kaynak profil ve MIT lisansı [kaynak klasöründe](docs/ai/references/source.md) korunmuştur.

RF cihaz araştırması, TETRA/DMR, BDA, RF repeater, fiber repeater/RFoF, DAS, RF bütçeleri ve test planlarında bu talimatlar kullanılır. Bu dosyalar bir RF simülatörü veya çalışan RF Planner ekranı kurmaz. Tüm K-Dense deposu ve ilgisiz profiller kopyalanmamıştır.

## Sonraki işler

- Görev oluşturma/atama, kullanıcı yönetimi ve parola sıfırlama arayüzleri.
- RF cihaz kataloğu, tasarım revizyonları ve doğrulanmış hesap araçları.
- İSG / SAT, finans, DENİZ ve mobil uygulama bağlantıları.
- Çok kullanıcılı üretim operasyonu, büyük listeler için sayfalama ve gelişmiş raporlar.

Eski ürün vizyonu `docs/product/BIEM_ONE_MASTER_PLAN.md` içindedir; bu dosyada sayılan bütün modüller henüz uygulanmış değildir.
