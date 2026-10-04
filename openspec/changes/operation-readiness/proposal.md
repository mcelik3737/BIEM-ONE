# W01 — Operasyon hazırlığını görünür kılma

## Why

Operasyon ekranında aşama sırası var, fakat kullanıcı bir sonraki adıma geçmeden eksiklerini topluca göremiyor. `ProjectsService.advanceOperation` yalnız sıradaki aşamayı kaydediyor. Kontrol listeleri ve Personel / İK verileri, saha hazırlığı denetimiyle eşdeğer değil.

## What Changes

- İş Dosyası / Operasyon içine “Hazırlık kontrolü” alanı eklenir.
- Mevcut sorumlu, program tarihleri, sıradaki aksiyon ve keşif kontrol listesinden eksikler hesaplanır; her eksik ilgili düzenleme alanına bağlanır.
- Projeye ekip/İSG ataması ve kabul kanıtı henüz denetlenemiyorsa açıkça “Bu kontrol henüz uygulanmıyor” gösterilir.
- İlk teslim bilgi sağlar. Mevcut aşama geçişlerini zorunlu kuralla değiştirmez; uygulamada “Sahaya çıkış onayı değildir” açıklaması bulunur.

## Capabilities

### New Capabilities

- `operation-readiness`: mevcut veriye dayalı hazırlık kontrolü ve eksiklere yönlendirme.

### Modified Capabilities

Yok. Mevcut aşama geçişleri, İK erişimi ve satınalma işlemleri korunur.

## Impact

API projects modülü, yönetim arayüzünün operasyon paneli, API ve tarayıcı kabul senaryoları. Şema/veri göçü veya yeni çalışma zamanı bağımlılığı gerekmez. Referanslar `docs/product/WORKFLOW_REPO_SUPPORT.md` içindedir.

Durum: **ürün kodu uygulandı ve izole ortamda doğrulandı; Windows kurulumu bağlantı bekliyor**. Güncel kanıt ve açık teslim adımı `tasks.md` ve `docs/NEXT_WORK.md` içindedir.
