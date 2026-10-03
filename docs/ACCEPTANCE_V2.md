# BIEM ONE v2 kabul raporu — 2 Ekim 2026

## Gerçek ortam

Windows üzerinde ana kaynak `C:\BIEM-ONE`; API Docker/NestJS, PostgreSQL 16 mevcut volume, Next.js 15.5.20 admin (production build), Prisma 6.19.3, Node 24.18.0/pnpm 11.7.0. Health HTTP 200; gerçek yerel yönetici hesabı ile `/auth/login` başarılı. Şifre/token çıktıya veya repoya eklenmedi.

`START-BIEM-ONE.ps1` gerçekten çalıştırıldı. Admin http://localhost:3001, API http://localhost:3000/api/v1. Prisma read-only diff: `No difference detected`. Mevcut veritabanına migration/db push/reset uygulanmadı. Yalnız ayrı kabul şirketleri ve test verileri eklendi. Yeni, tamamen boş veritabanı kurulum dalı bu makinede denenmedi.

## API kabul testi

`pnpm test:acceptance` son uygulama koduna karşı çalıştırıldı; 11 kontrol grubu geçti. Kaynak: `scripts/acceptance.mjs`. Test kullanıcı şifreleri rastgele üretilir; iki ayrı şirket, şirket yöneticisi ve saha mühendisi kullanılır.

| Kontrol | Sonuç |
| --- | --- |
| Health ve mevcut yönetici girişi | HTTP 200 / 201 |
| Müşteri ve tedarikçi oluşturma, düzenleme, aktif/pasif | Geçti; boş isteğe bağlı e-posta form girdisi de denendi |
| İstek gövdesinden companyId atama | HTTP 400 |
| İşin tüm ileri aşamaları → Kazanıldı | Geçti; Project sayısı 1, ProjectOperation sayısı 1 |
| BOM 100 metre RF feeder × 10 USD | estimatedTotalCost 1000, para birimi toplamı 1000.00 |
| %20 KDV sipariş | subtotal 1000, taxTotal 200, grandTotal 1200 |
| Saha mühendisi onayı / status yoluyla onay atlama | HTTP 403 / 400 |
| Bağlı BOM silme / farklı para birimi | HTTP 400 / 400 |
| İlk teslim 40 | KISMI_TESLIM, receivedQuantity 40 |
| İkinci teslimden önce 61 denemesi | HTTP 400; miktar değişmedi |
| Son teslim 60 | TESLIM_ALINDI, receivedQuantity 100 |
| Tam teslim sonrası ek 1 | HTTP 400 |
| Başka şirketin iş/BOM/sipariş/teslim kaydı | HTTP 404 |
| Genel liste uçları | Yalnız kendi şirketi; yabancı kayıt yok |
| Eşzamanlı iki 60 metre teslim (ayrı test siparişi) | Biri 201, diğeri 400 |
| Kısmi teslim edilmiş siparişin iptali | Sipariş ve 60 metre teslim bilgisi korundu; yeni teslim reddedildi |
| Yeni HTTP isteği ve doğrudan Prisma okuması | Kayıtlar kalıcı |

## Tarayıcı kabulü

agent-browser/Chrome ile gerçek ekrandan:

1. Türkçe giriş formuna test hesabı girildi, dashboard açıldı.
2. Müşteri araması denendi; bulunmayan sorguda boş liste gösterildi.
3. E-posta boş bırakılarak müşteri ve tedarikçi oluşturuldu; tam sayfa yenilemesinde ikisi de kaldı. İlk denemede bulunan boş e-posta validasyon hatası düzeltildi ve yeniden test edildi.
4. Kazanılmış İş Dosyası → Operasyon → BOM formundan **Tarayıcı RF feeder, 100 metre, 10 USD** eklendi.
5. BOM seçimi ve tedarikçiyle **%20 KDV / 1.200 USD** sipariş oluşturuldu; Onaya Gönder → Onayla → Sipariş Verildi adımları tıklandı.
6. Teslimat Gir ile 40 girildi; Kısmi Teslim ve 40/100 görüldü. 61 denemesinde `Teslim alınan miktar sipariş miktarını aşamaz.` görüldü. Ardından 60 girildi; Teslim Alındı / 100/100 görüldü.
7. Admin ve API yeniden başlatıldıktan sonra sayfa tam yeniden açıldı, aynı İş Dosyası / Satınalma bölümünde **1.200 USD ve 100/100 metre** korundu. Son tarayıcı hata çıktısı boştu.

Yerel ekran görüntüleri `.runtime/dashboard.png`, `.runtime/purchase-delivered.png`, `.runtime/purchase-after-reload.png` altındadır ve Git dışındadır. Tarayıcı testi elle yönlendirilmiş otomasyondur; ayrı bir kalıcı browser test paketi oluşturulmadı.

## Build ve kapsam

- `pnpm build`: API ve Next.js production derlemeleri geçti.
- `pnpm typecheck`: API ve admin geçti.
- `pnpm lint`: API ve admin geçti.
- Docker API image güncel kaynaklardan başarıyla derlendi; başlatıcı admin'i arka planda açtı.
- Mobil/Flutter build veya cihaz testi yapılmadı. Mobil sürüm tamamlandı olarak raporlanmıyor.
- RF profili lisans ve sabit kaynak commit'iyle eklendi; RF hesap modülü testi yapılmadı çünkü bu modül kapsamda değil.
- İSG, SAT, finans, DENİZ ve diğer entegrasyonlar `NEXT_WORK.md` içinde; bu çekirdek akış için açık engel bulunmuyor.

## Yayın kontrolü

Ana deponun mevcut Git geçmişi ve eski kaynak klasörünün geçmişi Gitleaks ile tarandı: bulgu yok. Gönderim indeksi ayrıca taranır; `.env`, test kimlikleri, veritabanı verisi/yedeği, node_modules, build/cache ve yerel araç depoları dışarıda tutulur. Örnek env ve pnpm lock korunur. Yasaklanan reset/clean/force push/volume silme işlemleri kullanılmadı.
