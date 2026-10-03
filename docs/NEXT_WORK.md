# Sonraki işler — tek takip listesi

Bu liste, teslim edilen müşteri–iş–BOM–satınalma–teslim çekirdeğinden sonraki kapsamdır. Buradaki maddeler çalışan özellik olarak sunulmaz.

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
