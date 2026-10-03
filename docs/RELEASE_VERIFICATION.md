# Kurtarılan sürümün bağımsız doğrulaması

Temel kaynak PR #2, `9af430a1e10ce501c8bdcbb91d8f85afac6459f0`. Bu kaynak Windows'taki mevcut çalışmayı kurtarır. PR #1 farklı bir veritabanı şeması kullandığından iki dal doğrudan birleştirilmemiştir. Mevcut Windows veritabanı ve yerel dosyaları bu kontrolde erişilen veya değiştirilen kaynaklar değildir.

## Bulunan ve giderilen hata

Gerçek tarayıcı testinde sayfa geçişi sırasında iptal edilen `/auth/me` isteği, geçerli oturumu silebiliyordu. Arayüz bütün bağlantı hatalarını oturumun geçersizliği olarak ele alıyordu. Artık yalnız API'nin 401 yanıtı oturumu geçersiz kılar. Bağlantı hatasında mevcut oturum korunur ve **Tekrar Dene** gösterilir. Eski sayfanın tamamlanan isteği yeni sayfanın oturumunu değiştirmez.

Tarayıcı testinde bağlantı hatası özellikle oluşturulur; kullanıcının yeniden şifre girmeden devam ettiği kontrol edilir. Ayrıca kökteki `db:generate`, `db:migrate`, `db:seed` komutları pnpm 11 için `exec` kullanacak şekilde düzeltildi.

## Bu ortamda çalıştırılan kontroller

- Linux, Node 24, PostgreSQL 16; yeni `biem_release_test` veritabanı, yalnız test hesapları.
- Lock dosyasıyla kurulum; Prisma generate; tamamen boş test veritabanında schema push ve seed başarılı. Bu, Windows başlatıcısının çalıştırıldığı anlamına gelmez.
- `pnpm build`, `pnpm lint`, `pnpm typecheck`: başarılı. Arayüz düzeltmesinden sonra admin build ve lint yeniden çalıştırıldı.
- `pnpm test:acceptance`: 11 grup başarılı. Müşteri/tedarikçi işlemleri, tek iş/operasyon, Decimal hesap, rol/şirket sınırları, 40+60 teslim, fazla teslim reddi ve eşzamanlı teslim kontrolü dahil.
- `pnpm test:browser`: 6 kontrol başarılı. Gerçek giriş/çıkış, geçici ağ hatasından kurtarma, boş e-posta ile müşteri/tedarikçi ekleme, kayıtların yenilemede korunması ve 1.200 USD / 100 metre tamamlanmış siparişin ekranda görülmesi dahil. JavaScript hatası yok.
- Yerelde Playwright 1.62.1, mevcut Chromium 134 yürütülebilir dosyasıyla çalıştırıldı. CI kendi Playwright Chromium sürümünü kurar.

## Tekrarlanabilir kontrol

`.github/workflows/ci.yml` yalnız geçici PostgreSQL hizmetinde çalışır; Windows verisine erişmez. PR ve main güncellemelerinde kurulumdan tarayıcıya kadar aynı zinciri çalıştırır. Son GitHub sonucunun kaynağı ilgili Actions çalışmasıdır; bu belge gelecekteki çalışmaları geçmiş saymaz.

`scripts/browser-smoke.mjs`, API kabulünün oluşturduğu ayrı test şirketini kullanır. Parolalı `.runtime/acceptance-session.json` Git ve Actions çıktıları dışındadır; yalnız `.runtime/browser/` altındaki ekran görüntüleri ve sonuç özeti yüklenir.

## Teslim sınırı

Kodun GitHub'a alınması kullanıcının Windows klasörünü güncellemez, yerel servislerini başlatmaz ve internete yayın yapmaz. Windows kabul raporu, önceki yerel Codex çalışmasının kanıtıdır; bu oturumdan kullanıcının çalışan ekranına erişim yoktur. RF Planner, mobil istemci ve uzman modüller için `NEXT_WORK.md` geçerlidir.
