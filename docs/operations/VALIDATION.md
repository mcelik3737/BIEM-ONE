# Doğrulama kaydı

Temel: `8eb64b72cd1a6e631b6a0f20614b7f11d22f3603`.
Ortam: Node 24, Next.js 15, Prisma 6, PostgreSQL 16. Geçici ve boş bir test DB'si kullanılır; Windows klasörüne veya kullanıcının eski DB'sine erişilmez.

Otomatik kabul testi `apps/api/test/acceptance.test.cjs` içinde:

- Gerçek HTTP giriş, kimlik doğrulaması, hatalı parola, aktif kullanıcı kontrolü.
- Müşteri/tedarikçi oluşturma, güncelleme, arama, aktif/pasif ve rol kısıtları.
- Başka tenant'a ait liste/ID/ilişki erişiminin reddi; SUPER_ADMIN dahil.
- Tek Project ve tekrar güvenli tek ProjectOperation.
- Decimal miktar/fiyat; geçersiz miktar hassasiyetinin reddi.
- 100 × 10 USD, %20 vergi, 1.200 USD toplam.
- Sipariş tekrar istek koruması ve BOM miktar rezervasyonu.
- Şirket yöneticisi onayı, geçersiz aşamaların reddi.
- 40 + 60 teslimat; tekrar gönderimde çift kayıt olmaması; fazla teslimat engeli.
- Eşzamanlı iki 60 teslimattan yalnız birinin kabul edilmesi.
- İptalde geçmişin korunması ve miktarın yeniden siparişe açılması.
- Refresh token rotasyonu, yeniden kullanım ve çıkışta yenilemenin reddi.

Doğrulandı: API ve panel üretim derlemesi; `pnpm lint`; gerçek PostgreSQL üzerinde 12 test sonucu (11 alt senaryo + üst kabul testi).

`tests/browser-smoke.cjs` gerçek Chromium ile geçti: giriş/dashboard, müşteri ve tedarikçi oluşturma, iş kazanma/operasyon, BOM, 1.200 USD sipariş, onay ve 40+60 teslimat, yenileme sonrası kalıcılık, 390 px mobil genişlik, farklı origin isteğinin reddi ve çıkış/HTTP-only çerez temizliği. Tarayıcı JavaScript hatası oluşmadı. Yerel ağdaki indirme sınırlaması nedeniyle Chromium 134 kullanıldı; CI sabit Playwright bağımlılığının kendi Chromium sürümünü indirir.

Sınırlar: Docker Desktop / PowerShell bu Linux ortamında çalıştırılmadı. Windows quickstart dosyaları ve Docker tarifleri kaynak üzerinden kontrol edildi. Mevcut kullanıcı DB'sinin baseline uyumu bilinmiyor; geçiş belgesindeki inceleme uygulanmalıdır. Yük, dış yayın, parola sıfırlama ve üretim felaket kurtarma testi bu teslimin parçası değildir.
