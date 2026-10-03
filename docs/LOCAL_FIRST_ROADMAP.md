# BIEM-EV ve DENİZ: dış servis bağımlılıklarını azaltma

4 Ekim 2026 tarihli kaynak incelemesi. Bu bir geçiş tasarımıdır; BIEM-EV/DENİZ kodu veya canlı servisleri bu çalışmada değiştirilmedi. İncelenen depolar: mcelik3737/biem-ev ve mcelik3737/deniz-assistant-v2.

## Kaynakta görülen bağımlılıklar

| Uygulama | Kanıt | Bağımlılık |
| --- | --- | --- |
| BIEM-EV | src/auth/supabaseAuth.js, server/_supabase.js | Giriş, kullanıcı profili ve API yetkilendirmesi Supabase'e bağlı. |
| BIEM-EV | server/_workspaceData.js | Müşteri, iş, keşif, teklif ve fiyat listeleri Supabase tablolarından okunup yazılıyor. |
| BIEM-EV | api/tcmb.js, api/address-search.js, api/route-distance.js | Güncel kur, adres ve rota hizmetleri ayrı dış bağlantılar. |
| BIEM-EV | vercel.json, package.json | Vite/React ve Vercel API dağıtımı; package.json'da AI Gateway bağımlılığı yok. |
| DENİZ | api/chat.js, README_TR.md | Giriş/bağlam Supabase'e; sohbet AI Gateway tabanlı modele bağlı. |
| DENİZ | api/speech.js, api/realtime-token.js | Ses üretimi OpenAI/Gateway, gerçek zamanlı ses Gateway üzerinden. |
| DENİZ | lib/amplitude-ai.js | Amplitude telemetrisi ve ajan izleme. |
| DENİZ | lib/live-tools.js, lib/google.js, lib/mail.js, supabase/ | Araştırma (Tavily/TCMB/web), Google/e-posta, zamanlama ve bildirim bağlantıları. |

Bu tablo kod bağımlılıklarını gösterir; canlı kaynak sayısı, faturalar veya abonelik tutarı denetimi değildir.

## Önerilen hedef

BIEM ONE + BIEM-EV aynı işletme çekirdeğini ve yerel/ofis sunucusundaki tek PostgreSQL'i kullanır. Personel, kullanıcı, müşteri, iş, görev ve maliyet ortak kayıtlardır; EV keşif/hesap/teklif verileri aynı veritabanında ayrı tablolarla korunur. Tek uygulama API'si sürer; dış bir platform olmadan oturum, kayıt ve hesaplar çalışır. Ofis ağı veya güvenli uzak bağlantı üzerinden web erişimi devam edebilir. Kullanıcı bilgisayarında ya da ofis sunucusunda kurulabilir; iPhone'dan uzaktan erişim için çalışan sunucu ve ağ erişimi gerekir.

DENİZ çekirdeği görev, not, ajanda ve özet bağlamını bu sistemden alır. Model, konuşma, e-posta, takvim, araştırma ve bildirim sağlayıcıları ayrı bağlantı katmanları olur. Çevrimiçi özellik kapalı veya servis erişilemezken kayıt ekranı açılmalıdır. Yerel model/ses seçeneğinin hız ve kalitesi mevcut bilgisayarda ölçülmeden eşdeğer deneyim vaat edilmez. Personel maaşları ve belge içerikleri varsayılan asistan bağlamına konmaz.

## Geçiş sırası ve kabul ölçütü

1. Supabase verileri, kullanıcı eşlemeleri, dosyalar, zamanlanmış işler ve roller envantere alınır; geri dönüş için dışa aktarma doğrulanır.
2. Kendi oturum ve kayıt API'si eklenir; mevcut müşteri/iş kimlikleri eşleme tablosuyla taşınır. Yerel giriş ve şirket/rol sınırları test edilir.
3. BIEM-EV hesap motoru, fiyat kataloğu, keşif ve teklif işlemleri bu API'ye bağlanır. Kur elle girilebilir veya son güncelleme tarihiyle saklanır. Adres/rota bağlantısı yokken elle konum/mesafe girişi sağlanır.
4. DENİZ veri erişimi taşınır; model/ses bağlantıları seçilebilir olur. Telemetri isteğe bağlı yapılır. Dış e-posta/takvim ve güncel web araştırması, internet gerektiren açıkça belirtilmiş özellikler olarak kalır.
5. İnternet kesilerek açılış, oturum, kayıt oluşturma, yeniden başlatma sonrası kalıcılık, teklif hesapları ve veri geri yükleme sınanır.
6. Eski servis ancak kayıt sayıları, dosyalar, izinler ve temel akışlar eşleştirildikten sonra ayrı kapatma işlemiyle bırakılır. Mevcut çalışan hizmetler geçiş doğrulanmadan kaldırılmaz.

Supabase'i bütün servisleriyle yerelde çalıştırmak da teknik bir yol olsa da bu tasarımın hedefi daha az bileşen olduğu için ilk öneri değildir. SQLite tek kullanıcılı bir DENİZ kurulumu için değerlendirilebilir; ortak ve çok kullanıcılı BIEM çekirdeği için mevcut PostgreSQL'i korumak daha az dönüşüm gerektirir.
