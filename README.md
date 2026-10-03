# BIEM ONE v2

Müşteri → İş Dosyası → Kazanıldı → Operasyon → BOM → Tedarikçi → Satınalma → Kısmi / Tam Teslim.

## Başlatma (Windows)

Docker Desktop (Linux containers), Node.js 24 ve pnpm 11.7 gerekir. Ana klasör `C:\BIEM-ONE`.

```powershell
powershell -NoProfile -ExecutionPolicy Bypass -File C:\BIEM-ONE\START-BIEM-ONE.ps1
```

- Admin: http://localhost:3001
- API sağlık: http://localhost:3000/api/v1/health
- API belgeleri: http://localhost:3000/docs
- Giriş: yerel `.env` dosyasındaki `SEED_ADMIN_EMAIL` hesabı ve mevcut şifresi. Şifre kaynakta veya bu belgede bulunmaz; başlatıcı mevcut kullanıcı şifresini değiştirmez.
- İlk kez başka makinede kurulum için `.env.example` dosyasını `.env` olarak kopyalayıp yerel şifreleri ve `DATABASE_URL` değerini doldurun. `apps/api/.env` gerekiyorsa aynı veritabanını göstermelidir. Gerçek `.env` dosyaları Git dışında kalır.

Başlatıcı bağımlılıkları lock dosyasıyla kurar, Prisma istemcisini üretir, mevcut veritabanı ile şemayı **salt okunur** karşılaştırır, API image'ını ve admin'i derleyip başlatır. Mevcut şemada fark varsa otomatik uygulamak yerine durur. Yalnız tamamen boş `public` şeması ilk kurulumda oluşturulur ve seed edilir. Mevcut `docker_biem-one-postgres` volume'u korunur. Standart portlar: API 3000, admin 3001, PostgreSQL 5433, Redis 6379. Başka servis portu kullanıyorsa kullanıcı süreci sonlandırılmaz.

Admin arka planda çalışır; logu `.runtime/admin.log` içindedir. Başlatıcı, yalnız kendisinin oluşturduğu ve kaynakları değişen admin sürecini yeniler. Docker çalışmıyorsa önce Docker Desktop'ı açın. API logları: `docker logs --tail 100 biem-one-api`.

## Kullanım

1. **Müşteriler** ve **Tedarikçiler**: yeni kayıt, düzenleme, arama, aktif/pasif filtresi ve durum değiştirme.
2. **İşler → Yeni İş / Talep**: müşteri ve sorumlu seçin. İş Dosyası içinde aşamaları sırayla ilerletin.
3. **Kazanıldı** aynı Project'e tek ProjectOperation bağlar. İkinci iş oluşturmaz.
4. **Operasyon → BOM / Malzeme Listesi**: miktar, birim, para birimi ve tahmini maliyet girin.
5. **Satınalma**: BOM kalemlerini seçin, aynı para birimini ve aktif tedarikçiyi seçip KDV oranıyla sipariş oluşturun.
6. **Onaya Gönder → Onayla → Sipariş Verildi → Teslimat Gir**. Onay yalnız şirket yöneticisi/proje yöneticisi/super admin rolüne açıktır.
7. Teslimat alanına toplamı değil **yeni teslim alınan ek miktarı** girin. Örneğin 40, sonra 60. Fazla teslim reddedilir. İptal geçmişi ve teslim miktarlarını korur; siparişe bağlı BOM silinemez.
8. **Görevler**: işe bağlı görev oluşturun; sorumlu, termin, öncelik ve durumunu düzenleyin. Açık/geciken/tamamlanan görünümleri, arama ve iş/sorumlu filtreleri bulunur. Görevi tamamlayabilir, yeniden açabilir ve bağlı iş dosyasının Görevler sekmesine doğrudan gidebilirsiniz.
9. **Gösterge Paneli**: geciken görev kartı görev panosunu açar; diğer göstergeler ilgili kayıtları ve iş dosyası bağlantılarını gösterir. BOM ve sipariş bilgileri panel API'sinden gelir; taahhüt toplamları sunucuda para birimi bazında hesaplanır. Veri yüklenemediğinde hata ve tekrar deneme gösterilir.

Para hesapları sunucuda Prisma.Decimal ve iki ondalığa ROUND_HALF_UP ile yapılır. Şirket, doğrulanmış oturumdan alınır. Test verileri ayrı, açıkça KABUL TESTİ olarak adlandırılmış şirketlerde tutulur.

## Doğrulama

```powershell
pnpm build
pnpm lint
pnpm typecheck
pnpm test:acceptance
pnpm test:browser
```

Kabul testi çalışan API ve PostgreSQL gerektirir. Rastgele şifreli iki test şirketi ve test kullanıcıları oluşturur; mevcut müşteri kayıtlarını değiştirmez/silmez. Test şirketleri inceleme için kalır. Tarayıcı testi ayrıca çalışan admin ve Playwright Chromium gerektirir (`pnpm exec playwright install chromium`); önce API kabul testi çalıştırılır. Yerel `.env` yoksa testler ortam değişkenlerini kullanır.

GitHub Actions her PR ve `main` güncellemesinde boş PostgreSQL 16 veritabanında kurulum, derleme, lint, tip kontrolü, API kabulü ve tarayıcı kontrolünü çalıştırır. Tarayıcı kanıtları ilgili Actions çalışmasının `browser-evidence` çıktısında 7 gün tutulur; parola içeren test oturum dosyası yüklenmez. Ayrıntılar: [Windows kabul raporu](docs/ACCEPTANCE_V2.md), [bağımsız doğrulama ve oturum düzeltmesi](docs/RELEASE_VERIFICATION.md).

## Kaynaklar ve kapsam

- [Kaynak kurtarma kaydı](docs/SOURCE_RECOVERY.md): eski klasördeki commit edilmemiş 5A/5B/5B.1 çalışmaları kurtarıldı.
- RF/Microwave Engineer profili `.agents/skills/rf-microwave-engineer` içindedir. K-Dense kaynak commit'i ve MIT lisansı `.agents/profiles/rf-microwave-engineer` altında korunur. Bu ajan rehberidir; RF tasarım modülü değildir.
- Flutter mobil klasörü korunmuş başlangıç çalışmasıdır; bu teslimatın test edilmiş istemcisi web admin'dir.
- Ayarlar ve uzman çalışma alanları tamamlanmış modüller gibi gösterilmez. [Tek sonraki işler listesi](docs/NEXT_WORK.md).
