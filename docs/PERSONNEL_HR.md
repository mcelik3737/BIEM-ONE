# Personel / İK

Personel kartı, mevcut bir kullanıcı hesabına isteğe bağlı olarak bağlanır. Hesabı olmayan çalışan da kaydedilir. Kartı pasife almak giriş hesabını kapatmaz. Aynı kullanıcı iki personele bağlanamaz. İşe giriş/ayrılma tarihi, bölüm, unvan, görev tanımı, e-posta ve telefon aynı karttadır.

## Erişim

Bu ilk sürümde bütün personel uçları ve belge indirme/yükleme yalnız COMPANY_ADMIN ve SUPER_ADMIN rollerine açıktır; şirket sınırı her kayıtta kontrol edilir. Proje yöneticisi ve saha kullanıcısı maaş veya personel belgelerini okuyamaz. İş dosyasındaki gerçek işçilik özeti de yalnız bu iki yönetici rolüne gösterilir. Genel kullanıcı, iş, dosya ve audit listelerine maaş ve belge içeriği eklenmez. Gerçek personel verileri veya dosyaları kaynak koduna girmez.

## Ücret ve maliyet

Her ücret dönemi için geçerlilik başlangıcı, net/brüt bilgisi, aylık maaş, toplam aylık işveren maliyeti, maliyet dağıtımında kullanılacak aylık saat kapasitesi ve para birimi girilir. Netten brüte, vergi, SGK veya yasal fazla mesai hesabı yapılmaz; işveren payları ve yan hakları içeren toplam kullanıcı tarafından belirlenir. Dönemler saklanır; aynı başlangıç tarihli ikinci dönem reddedilir.

İşçilik maliyeti = aylık işveren maliyeti / aylık maliyet kapasitesi × kaydedilen saat × maliyet katsayısı.

Hesap sunucuda Decimal ile yapılır; sonuç iki ondalığa yuvarlanır. Örnek: 60.000 TRY / 200 saat × 8 saat × 1 = 2.400 TRY. Saat kapasitesi mevzuat kabulü değildir. Proje çalışması bir iş dosyasına bağlanır; idari çalışma ve izin ayrı maliyet gruplarıdır. İzin için katsayı maliyet dağıtımını belirler, bordro/izin hakkı hesabı yapmaz.

Puantaj taslak olarak girilir. Çalışma tarihindeki ücret dönemiyle onaylanınca saat maliyeti, toplam ve para birimi kayda sabitlenir; sonraki ücret dönemi geçmiş onaylı maliyeti değiştirmez. Gelecek günün kaydı onaylanamaz. Günlük aktif kayıtlar toplamı 24 saati aşamaz; eşzamanlı istekler personel kilidiyle sıralanır. Hatalı kayıt gerekçeyle iptal edilip doğrusu girilir. İptal geçmişi korunur, tutar rapordan düşer. Farklı para birimleri toplanmaz; taslakların sayısı gösterilir. İş dosyasında onaylı işçilik ayrı gösterilir; BOM işçilik tahminiyle otomatik toplanarak iki kez sayılmaz.

## İSG belgeleri

Görev ve saha için gereken belgeler yönetici tarafından tanımlanır; evrensel veya otomatik bir hukuki uygunluk listesi varsayılmaz. Başlık, zorunluluk, tarih gereksinimi, düzenlenme/bitiş tarihi ve not bulunur. Hiç gereklilik tanımlanmamış personel uygun gösterilmez; listede ayrıca belirtilir.

PDF/PNG/JPEG en fazla 5 MB olarak yüklenir. Dosya içerik tipi denetlenir; içerik veritabanında özel saklanır ve yalnız yetkili indirme ucundan ek olarak sunulur. Dosya yüklemek tek başına uygunluk onayı değildir. Eksik dosya/tarih, süresi dolan, henüz geçerli olmayan, kontrol bekleyen, 30 gün içinde dolan ve kontrol edilmiş belgeler ayrılır. Dosya veya belge metadatası değişince kontrol onayı sıfırlanır. Tarihler gün bazında; bugün Europe/Istanbul saat dilimine göre hesaplanır. Belge gereklilikleri ve tarihlerinin doğruluğu kayıtları yöneten ekibe aittir.

## Mevcut veritabanını yükseltme

`prisma/upgrades/20261004_personnel.sql` dört yeni tablo, indeks ve yabancı anahtar ekler; mevcut tablolardaki satırları değiştirmez veya silmez. Transaction içinde bir kez uygulanır. Başlatıcı şema farklı olduğunda halen durur; canlı veritabanına otomatik schema push yapılmaz.

Mevcut veritabanının yedeği ve bağlantı hedefi kontrol edildikten sonra, ana klasörde:

```powershell
pnpm db:generate
pnpm db:upgrade:personnel
```

Bağlantı `apps/api` için kullanılan DATABASE_URL olmalıdır. Yükseltme zaten uygulanmışsa SQL yeniden çalıştırılmaz. Sonrasında standart başlatıcı API ve admin'i yeni kaynakla derler. Bu komutların kullanıcının Windows bilgisayarında çalıştırıldığı iddia edilmez.

CI, boş ve geçici `biem_release_test` üzerinde önce önceki şemayı oluşturur, bir örnek kaydı ekler, bu SQL'i uygular ve kaydın korunduğunu/yeni şemanın birebir eşleştiğini doğrular. Ardından API kabulü, eski tarayıcı akışı ve `pnpm test:personnel:browser` çalışır. Testler yalnız açıkça adlandırılmış ayrı test şirketlerini kullanır; sonuç için ilgili GitHub Actions çalışması esas alınır.

## Sonraki kapsam

Kullanıcı hesabı oluşturma/rol yönetimi, bordro ve resmi izin hakları, ücret dönemini kontrollü düzeltme, proje bazlı İSG ataması, sahaya çıkışı durduran kurallar, e-posta/telefon bildirimi ve belge revizyon arşivi bu ilk sürümün parçası değildir. Mevcut belge dosyası yenisiyle değiştirilir; değişiklik olayı kaydedilir, eski dosya sürümü saklanmaz.
