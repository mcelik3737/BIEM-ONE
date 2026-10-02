# Mevcut PostgreSQL verisini koruyarak geçiş

Yeni quickstart ayrı bir veritabanı kullanır. Aşağıdaki işlem yalnız eski BIEM ONE veritabanını yükseltmek içindir; boş DB'de yalnız `prisma migrate deploy` yeterlidir.

1. Veritabanının yedeğini alın ve geri yüklenebildiğini ayrı bir kopyada doğrulayın. Uygulama yazmalarını bakım aralığında durdurun.
2. Önce kopya DB'de inceleme yapın. Canlı hedef URL'sini kontrol edin. `.env` veya yedeği Git'e koymayın.
3. Eski depoda migrasyon geçmişi bulunmuyordu. `20260924000000_baseline` ilk commit'in şemasının tam SQL karşılığıdır; `20261002000000_usable_core` yalnız yeni enum/tablo/kolon ve kısıt ekler. Eski tablo/kolon silmez.
4. Mevcut DB'nin gerçekten ilk commit şemasıyla eşleştiğini kontrol edin. PowerShell örneği (`DATABASE_URL` ortamda tanımlı olmalı):

```powershell
$baseline = Join-Path $env:TEMP 'biem-baseline.prisma'
git show 8eb64b72cd1a6e631b6a0f20614b7f11d22f3603:apps/api/prisma/schema.prisma | Set-Content -Encoding utf8 $baseline
pnpm --filter @biem-one/api exec prisma migrate diff --from-url "$env:DATABASE_URL" --to-schema-datamodel "$baseline" --exit-code
```

Çıkış 0 ise şema eşleşir. Çıkış 2 fark vardır demektir: farkları inceleyin; bu durumda baseline uygulanmış gibi işaretlemeyin. Bağlantı/komut hatası da geçişe izin vermez. Yerelde 5A/5B gibi ilave modeller varsa bunlar ayrıca uzlaştırılmalıdır.

5. Yalnız eşleşen eski DB'de baseline'ı uygulanmış olarak kaydedin ve ek migrasyonu uygulayın:

```powershell
pnpm --filter @biem-one/api exec prisma migrate resolve --applied 20260924000000_baseline
pnpm db:deploy
pnpm db:generate
```

Bu adımı zaten migrasyon geçmişi olan DB'de tekrar çalıştırmayın; önce `prisma migrate status` inceleyin. `migrate reset`, `db push --accept-data-loss`, volume silme veya SQL tablo düşürme kullanmayın.

6. `pnpm db:seed` yalnız eksik rol kayıtlarını ve e-posta adresi henüz yoksa açıkça tanımlanan ilk yöneticiyi ekler. Mevcut kullanıcıların parolası ve rolü korunur.
7. Eski Project kayıtlarının `stageId` ilişkisi korunur. Yeni `salesStatus` alanı varsayılan REVIEW (Değerlendirme) olur. Eski aşamayı incelemeden işleri topluca kazanılmış saymayın. Uygun işi arayüzde Kazanıldı yaparak 1:1 operasyonu açın.
8. Eski bcrypt ile saklanmış refresh tokenları yeni SHA-256 eşleştirmesine uymaz; kullanıcılar yeniden giriş yapar. Veriler silinmez.

Geri dönüş için uygulama sürümünü ve doğrulanmış DB yedeğini birlikte planlayın. Yeni kolonlar/tables için otomatik ters migrasyon sunulmaz.
