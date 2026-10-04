# Operasyon hazırlık kontrolü — W01

Kazanılmış bir işin **İş Dosyası → Operasyon → Hazırlık kontrolü** alanında mevcut kayıtlar değerlendirilir. Eksik kartındaki düğme ilgili form alanını veya Kontrol Listesi bölümünü açar. Kaydetme, operasyon sekmesine dönüş ve sayfa yenilemesi sonrasında sunucudan yeni değerlendirme alınır.

Kategori düzeltmesi Teknik formundaki İş Kategorisi alanını açar. Bu kayıt isteği müşteri ve iş sahibi alanlarını içermez; mevcut bağlantılar korunur.

## Denetlenen bilgiler

- Operasyon sorumlusu aynı şirkette ve aktif olmalıdır.
- Planlanan başlangıç ve bitiş bulunmalıdır; bitiş başlangıçtan önce olamaz. Tarihlerin geçmişte olması tek başına eksik hazırlık değildir.
- Sonraki aksiyon boş olmamalı ve hedef tarihi bulunmalıdır.
- Geçerli iş kategorisinin zorunlu keşif maddeleri tamamlanmalıdır. Tanımsız kategori, boş liste, kısmen oluşturulmuş liste veya başka kategoriden kalan maddeler başarı sayılmaz. Kontrol Listesi bölümü açıldığında mevcut uygulama kategori şablonunu başlatır; hazırlık sorgusunun kendisi başlatmaz.

İSG/ekip ve test/kabul kartları **Ayrı kontrol gerekli** gösterir. Hazırlık özeti sahaya çıkış onayı değildir; W01 mevcut aşama geçişlerine yeni engel eklemez.

## API

`GET /api/v1/projects/:id/operation/readiness`

Mevcut projects okuma rolleri geçerlidir. Şirket oturumdan alınır. Oturumsuz istek 401; başka şirket, bulunamayan iş veya kazanılmamış/operasyonsuz iş 404 döner. Sonuç `Cache-Control: no-store` ile sunulur.

Yanıtın üst alanları: `policyVersion: "readiness-v1"`, `evaluatedAt` (ISO zaman), `advisoryOnly: true`, `checks`.

| Kontrol kodu | Düzeltme hedefi | Kontrol |
| --- | --- | --- |
| OPERATION_MANAGER | MANAGER | Aktif operasyon sorumlusu |
| PLANNED_DATES | SCHEDULE | Program tarihleri |
| NEXT_ACTION | NEXT_ACTION | Aksiyon ve hedef tarihi |
| DISCOVERY_CHECKLIST | CATEGORY veya CHECKLIST | Zorunlu keşif maddeleri |
| PROJECT_TEAM_SAFETY | null | Henüz denetlenmiyor |
| ACCEPTANCE_EVIDENCE | null | Henüz denetlenmiyor |

Her kart `code`, `label`, `status`, `description`, `target` içerir. Keşif kartında ayrıca eksik başlıklardan oluşan `missingItems` bulunur. Durumlar `COMPLETE`, `MISSING`, `NOT_IMPLEMENTED`. İstemci `target` için yalnız kendi tanımlı alanlarını kullanır; sunucudan URL çalıştırmaz.

Yanıta ücret, belge içeriği, indirme bağlantısı, kullanıcı nesnesi veya hesap bilgisi eklenmez. Hazırlık okumaları görev, kontrol maddesi veya zaman çizelgesi olayı oluşturmaz. Bağlantı hatasında eski başarılı kartlar kaldırılır; hata ve tekrar deneme gösterilir.

## Doğrulama ve dağıtım

`scripts/acceptance-readiness.mjs` ana API kabulüne bağlıdır. `pnpm test:readiness:browser`, bu testin oluşturduğu ayrı hazırlık işiyle kategori, sorumlu, tarih, aksiyon ve checklist düzeltmesini; yenilemede kalıcılığı; ağ hatasını ve mobil görünümü sınar. Bu testler canlı veritabanında çalıştırılmaz.

Şema veya uygulama bağımlılığı değişmedi. Dağıtım standart API/admin derlemesidir. Geri dönüş önceki uygulama sürümüdür; bu teslim için veritabanı göçü yoktur. Çalıştırılmış test kanıtı ve dağıtım sonucu `NEXT_WORK.md` içinde izlenir.
