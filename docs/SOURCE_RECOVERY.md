# Kaynak kurtarma — 2 Ekim 2026

Ana klasör `C:\BIEM-ONE`, GitHub tabanı `8eb64b72cd1a6e631b6a0f20614b7f11d22f3603` idi. Başlangıçta temizdi; yalnız `main` dalı vardı. Kök/üst klasörlerde AGENTS.md bulunmadı; bağımsız araç depolarındaki kurallar kendi kapsamlarında korundu.

`C:\Projects\BIEM-ONE` içinde farklı kök commit `f6b3d28` ve commit edilmemiş gelişmiş çalışmalar bulundu. Bu klasörün Git geçmişi, dalları, dosyaları ve değişiklikleri korundu. Yeni uygulama veya bağımsız ikinci ürün kurulmadı; kaynak dosyaları ana projenin mevcut mimarisine aktarıldı. İlgisiz Git geçmişi birleştirilmedi.

Bulunan kanıtlar:

- `apps/api/src/modules/procurement/procurement.service.ts`
- `apps/admin/components/procurement-panel.tsx`
- `apps/admin/components/entity-master-page.tsx`
- `apps/admin/components/business-entity-modal.tsx`
- `docs/WORKFLOW_V2_PACKAGE5B1_REPORT.md`
- 5A ve 5B raporları, ProjectOperation/BOM/Supplier/PurchaseOrder modelleri, giriş istemcisi ve iş dosyası ekranı.

Aktarım kaynak, yapılandırma, lock ve gerekli scriptlerle sınırlı tutuldu. Eski günlükler, not defterleri, yedekler, bağımlılıklar ve build çıktıları yayımlanmadı. Yerel çalışma ayarları yalnız ignore edilen `.env` dosyalarına kopyalandı; değerler raporlanmadı.

Çalışan konteynerlerin eski klasörden kurulduğu tespit edildi. Ana projedeki güncel şema ile mevcut PostgreSQL arasında `prisma migrate diff` fark bulmadı. Mevcut veritabanına şema uygulanmadı, reset yapılmadı, volume silinmedi. API ana kaynaklardan yeniden derlendi; mevcut PostgreSQL volume'u kullanıldı.

Ek düzeltmeler: boş e-posta form hatası, BOM sayısal alan dönüşümü, sipariş/teslim transaction kilitleri, Decimal yuvarlama, para birimi/birim kontrolü, genel liste uçlarında tenant filtreleri, güncel kullanıcı/rol doğrulaması, Türkçe hata ve giriş metinleri, kaydı koruyan iptal düğmesi ve güvenli başlatıcı.
