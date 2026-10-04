# W01 tasarımı

## Context

Başlangıç `7e7ce10`. İşler şirket kapsamıyla okunuyor. Operasyon aşaması, sorumlu ve tarihler mevcut. `getChecklist` kontrol listesi başlatabildiğinden hazırlık okumasında çağrılmamalı; doğrudan mevcut checklist ilişkisi okunmalı. İK uçları yalnız şirket/süper yöneticiye açık.

## Decisions

1. Yeni salt-okunur `GET /projects/:id/operation/readiness` ucu, mevcut operasyon okuma yetkisiyle çalışır. Kazanılmamış/operasyonu olmayan veya farklı şirketteki iş için 404 döner.
2. Sunucu `{ policyVersion: 'readiness-v1', evaluatedAt, advisoryOnly: true, checks: [...] }` üretir. Her kontrolün sabit `code`, Türkçe `label`, `status` (`COMPLETE`, `MISSING`, `NOT_IMPLEMENTED`), açıklama ve sınırlı `target` anahtarı bulunur. Rastgele URL kabul edilmez.
3. Kontroller: aktif operasyon sorumlusu; iki program tarihi ve doğru sıralama; dolu sonraki aksiyon ve vadesi; tanımlı kategori ve başlatılmış zorunlu keşif maddeleri. Geçmiş program tarihi tek başına hazırlık hatası değildir; gecikme mevcut panelin sorumluluğudur.
4. `PROJECT_TEAM_SAFETY` ve `ACCEPTANCE_EVIDENCE` sonucu bu teslimde `NOT_IMPLEMENTED` olur. Başka modüllerin mevcut belge sayısından saha uygunluğu türetilmez.
5. Rol/şirket sınırı mevcut projects denetiminden alınır. İK tablosuna sorgu gerekmez. Hazırlık cevabında operasyonun tamamı veya iç içe kullanıcı/personel nesnesi dönmez.
6. Arayüz, mevcut Operasyon ve Kontrol Listesi alanlarına gider. Yeni platform veya grafik iş akışı motoru eklenmez. Mobil görünümde kontroller dikey listelenir.
7. `advanceOperation`, satınalma onayı ve mevcut veritabanı şeması bu teslimde değişmez. Zorunlu geçiş denetimi W02'de sürümlü etkinleştirme ile ele alınır.

## Risks and rollout

- Hazırlık özeti onay gibi anlaşılabilir: toplam “uygun” rozeti yok; bilgi niteliği ve geliştirilmemiş kontroller açık.
- Okuma sırasında checklist oluşturma riski: ayrı salt-okunur sorgu ve satır sayısı/olay değişmezliği testi.
- Dağıtım: API + arayüz standart derleme. Geri dönüş: W01 kodunu önceki sürüme almak; şema/veri geri yüklemesi gerektirmez.
- Doğrulama: mevcut API kabulüne yeni anlamlı senaryolar, tarayıcıda eksik düzeltme/yenileme ve hata toparlama. Test şirketleri yalnız ayrı test veritabanında.
