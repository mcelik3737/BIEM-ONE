# W01 uygulama görevleri

Durum: API ve arayüz uygulandı; izole API ve tarayıcı kabulü geçti. Windows cihazı çevrimdışı; yerel teslim henüz yapılmadı.

## 1. Salt-okunur hazırlık API'si
- [x] 1.1 Şirket sınırlarıyla korunan hazırlık ucunu ve sabit kontrol sonucunu ekle; API kabulünde eksik/tam/kategori yok senaryolarını doğrula.
- [x] 1.2 401, farklı şirket için 404, İK alanlarının dışarı çıkmaması ve iki okumada veri/olay oluşturmama senaryolarını ayrı test veritabanında doğrula.
- [x] 1.3 API davranışını ve bilgi niteliğini belgele; cevap örneğinin çalışan uçla uyuştuğunu kontrol et.

## 2. İş Dosyası arayüzü
- [x] 2.1 Operasyon paneline hazırlık listesini, eksik alan bağlantılarını ve uygulanmamış kontrolleri ekle; tarayıcıda görünür metin ve doğru alan geçişini doğrula.
- [x] 2.2 Yükleme/hata/tekrar deneme durumlarını ekle; bağlantı hatasında sahte başarı olmadığını tarayıcıda doğrula.
- [x] 2.3 Bilgi düzeltme sonrası yeni değerlendirmeyi ve 390px görünümü doğrula; sayfa yenilemede kalıcı kayıt sonucunu kontrol et.

## 3. Teslim
- [x] 3.1 AGENTS.md kabul zincirini izole test ortamında çalıştır; mevcut satınalma, görev ve İK kabulünün korunduğunu sonuçlarıyla kaydet.
- [ ] 3.2 GitHub sürümü ile Windows çalışma kopyasını eşleştir; çalışan ekranda salt-okunur kontrol yap, sürüm ve test kanıtını NEXT_WORK.md içine işle.

## Doğrulama kanıtı

4 Ekim 2026, ürün kodu `06c3eb15a4c7ccb6aa9e44d6d3a59b8fd893bb92`: [CI 37169126234](https://github.com/mcelik3737/BIEM-ONE/actions/runs/37169126234) başarılı. Build/lint/typecheck, personel yükseltme koruma provası, 24 API ve 16 tarayıcı kabul grubu geçti. Masaüstü ve 390px üst/alt hazırlık ekranları incelendi. Kategori düzeltmesinin müşteri ve iş sahibi alanlarına yazmadığı ve bağlantıları koruduğu tarayıcıda ayrıca doğrulandı.

3.2 açık: Desktop Commander çevrimdışı. Windows'taki W01 çalışması doğrulanmış sayılmaz. Bu adım tamamlanana kadar uygulama paketi arşivlenmez.

## Workflow follow-up
- Kod ve doğrulama tamamlandığında değişikliği arşivle, geçerli spec'i güncelle ve W02'yi ayrıntılandır.
- Kullanıcıdan dosyayı başka bir ajana taşımasını isteme; sürümlü repo devam kaydıdır.
