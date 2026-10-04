# Sonraki işler — tek takip listesi

Bu liste, teslim edilen müşteri–iş–BOM–satınalma–teslim çekirdeğinden sonraki kapsamı ve teslim durumunu izler. Kod doğrulaması ile Windows'ta çalışan sürüm ayrı kaydedilir; planlanan maddeler çalışan özellik olarak sunulmaz.

## Yürütme sırası — 4 Ekim 2026

Kullanıcı önceliği değiştirirse bu sıra güncellenir. Ajan, eldeki yetki kapsamında sıradaki hazır işi buradan alır; kullanıcıdan planı yeniden aktarmasını istemez. Yeni modül eklenmeden önce tamamlanan işin kod ve doğrulama durumu kaydedilir. Bu liste sohbetler arasında kendiliğinden arka planda iş başlatmaz.

| Sıra | Teslim | Durum | Bitti sayılma ölçütü |
| --- | --- | --- | --- |
| W00 | Repo destekli kural haritası ve ortak geliştirme düzeni | Tamamlandı; `ec9836d` ile GitHub ve Windows'ta | Kaynak sürümleri, mevcut/hedef ayrımı, öncelikler ve ilk değişiklik senaryoları repoda |
| W01 | Operasyon hazırlık görünümü | GitHub'da doğrulandı; Windows bağlantısı bekleniyor | Eksik hazırlık bilgisi ve düzeltme bağlantısı; uygulanmamış denetim açık; şirket/rol, hata, kalıcılık ve mobil testleri geçti |
| W02 | Proje ekip ataması ve İSG/saha geçiş kuralları | Planlandı | Atanmış ekip saha tarihleriyle değerlendirilir; eksik/süresi dolan belge geçişi durdurur; geçmiş işler kontrollü sürüm geçişiyle korunur |
| W03 | Test, SAT/kabul ve teslim dosyası | Planlandı | Projeye özgü ölçüm kriteri ve sonuç, kritik kusur/düzeltme, onay ve belge revizyonu birlikte doğrulanır |
| W04 | Satınalma teslim fişi, iade ve tekrar güvenliği | Planlandı | Kısmi teslim/iade geçmişi korunur; aynı ağ isteği miktarı iki kez artırmaz |
| W05 | Proje bütçesi ve gerçekleşen maliyet | Planlandı | Malzeme, onaylı işçilik, masraf ve genel giderin dayanağı görünür; para birimleri ve tahmin/gerçek ayrılır |
| W06 | İK işe giriş/ayrılış, izin ve masraf akışları | Planlandı | Sorumlu/tarihli görevler, yetkili onay, geçmiş ve maliyete yansıma test edilir; yasal bordro kapsamı ayrıca tanımlanır |
| W07 | Fatura, tahsilat ve bakım takibi | Planlandı | Kısmi ödeme/vade, garanti/bakım sorumlusu ve takip işleri tek İş Dosyasına bağlıdır |

W01 uygulama paketi: `../openspec/changes/operation-readiness/`. Kurallar: `product/WORKFLOW_RULES.md`. Repo seçimi: `product/WORKFLOW_REPO_SUPPORT.md`.

### Doğrulanmış son Windows ürün teslimi

`7e7ce108103467fe94de67aec0ca20e805d71eb3`: Personel / İK ve onaylı puantaj maliyeti. 4 Ekim 2026 Windows güncellemesinde yedek alındı; mevcut 24 tablonun içeriği şema yükseltmesi öncesi/sonrası karşılaştırılarak korunduğu doğrulandı. Üretim derlemesi, mevcut yöneticiyle giriş, hazırlanan personel formu, maliyet ekranı ve mobil görünüm kontrolü başarılı. Bu sonuç W01 veya sonraki işlerin uygulandığı anlamına gelmez.

### W01 teslim kaydı — 4 Ekim 2026

İş Dosyası → Operasyon içindeki hazırlık kontrolü; sorumlu, tarihler, sonraki aksiyon ve zorunlu keşif maddelerini değerlendirir. Eksik kartları ilgili düzenleme alanına gider. İSG/ekip ve test/kabul için ayrı değerlendirme gerekliliği açıkça gösterilir. API sözleşmesi: `OPERATION_READINESS.md`.

- Kod: [PR #6](https://github.com/mcelik3737/BIEM-ONE/pull/6). Şema veya yeni bağımlılık yok.
- Doğrulanan ürün kodu: `06c3eb15a4c7ccb6aa9e44d6d3a59b8fd893bb92`. [CI 37169126234](https://github.com/mcelik3737/BIEM-ONE/actions/runs/37169126234) başarılı: build, lint, typecheck, mevcut veriyi koruyan personel şema yükseltme provası, 24 API ve 16 tarayıcı kabul grubu (8 çekirdek + 4 İK + 4 hazırlık). Testler ayrı CI veritabanındadır.
- Hazırlık doğrulaması: kategori/sorumlu/tarih/aksiyon düzeltmesi, müşteri ve iş sahibi bağlantılarının korunması, zorunlu keşif maddeleri, yenilemede kalıcılık, ağ hatası/tekrar deneme ve 390px görünüm. Masaüstü ve mobil ekran görüntüleri incelendi; test kanıtı CI'nin `browser-evidence` çıktısında.
- Windows: Desktop Commander çevrimdışı olduğu için W01 yerel kuruluma uygulanmadı. Son bilinen çalışma kopyası `ec9836d`; önceki Personel / İK teslimidir.
- Devam: cihaz bağlandığında çalışma kopyasının değişikliklerini kontrol et, doğrulanmış ana dalı fast-forward ile al, standart başlatıcıyla API/admin derlemesini güncelle ve mevcut veriyi değiştirmeden hazırlık görünümünü doğrula. Canlı veritabanında kabul testlerini veya test verisi oluşturmayı çalıştırma.

## Kalan kapsam ve ayrıntılar

- İSG ikinci faz: risk değerlendirmesi, saha izinleri, ekipman belgeleri, proje bazlı atama ve sahaya çıkış kontrolleri. Personel belge yükleme, kontrol ve geçerlilik takibi Personel / İK içinde eklendi.
- Test ve SAT/kabul: ölçüm kayıtları, kabul protokolleri, imza, teslim dosyası ve revizyon takibi.
- Finans: genel gider dağıtımı, maliyet–bütçe karşılaştırması, fatura, tahsilat, ödeme planı ve muhasebe entegrasyonu. Onaylı puantajdan gerçek işçilik maliyeti Personel / İK içinde eklendi; bordro değildir.
- DENİZ: görev/özet/hatırlatma asistanı, rol ve şirket sınırlarını koruyan onaylı araç erişimi.
- RF Planner / RF-Telsiz: bağlantı bütçesi, anten/feeder/kapsama/DAS hesapları, harita/ölçüm ve teknik revizyon modeli. Eklenen RF ajan profili bu modülü gerçekleştirmez.
- BIEM-EV, raylı sistemler ve acil haberleşme uzman çalışma alanları; tek İş Dosyası ve ProjectOperation bağlantısını koruyarak geliştirme.
- Belge/dosya depolama, bildirim, e-posta/WhatsApp ve tedarikçi/muhasebe entegrasyonları.
- Kullanıcı/rol düzenleme ekranı; şifre sıfırlama, oturum saklamayı HttpOnly cookie'ye taşıma, otomatik oturum yenileme ve giriş hız sınırlaması.
- Mobil Flutter istemcisini gerçek API akışlarına bağlama ve cihaz kabul testleri.
- Çok kullanıcılı üretim kurulumu: HTTPS, yedekleme/geri yükleme provası, sürümlü migration süreci, izleme ve kapasite testleri. Temiz veritabanı / API / tarayıcı doğrulaması için CI eklendi.
- Satınalma ikinci faz: sipariş formunda miktar/fiyat revizyonu, teslim fişleri ve iade, döviz dönüşümü, stok/depo ve idempotency anahtarıyla ağ tekrarlarının yönetimi.
- İK ikinci faz: kontrollü ücret düzeltmesi, resmi izin/bordro süreçleri, belge revizyon arşivi ve bildirimler. Kullanıcı hesabı açma ve rol yönetimi ayrı geliştirmedir; personel kartı mevcut hesaba bağlanabilir.
- BIEM-EV ve DENİZ dış servislerini sadeleştirme: `LOCAL_FIRST_ROADMAP.md` kaynak incelemesi ve geçiş tasarımıdır; henüz uygulanmadı.
