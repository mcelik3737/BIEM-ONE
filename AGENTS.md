# BIEM ONE çalışma kuralları

- Ana proje bu klasördür. Eski `C:\Projects\BIEM-ONE` kurtarılan kaynak referansıdır; oradaki kullanıcı değişikliklerini silmeyin veya geri almayın.
- Kazanılan iş aynı Project kaydına bağlı, tekil ProjectOperation oluşturur. İkinci Project oluşturmayın.
- Tenant şirketini doğrulanmış oturumdan alın. Tüm kayıt erişimlerini şirketle sınırlayın.
- Finansal hesapları sunucuda Prisma.Decimal ile yapın. Teslimat ve sipariş durumunu aynı kilitli transaction içinde kontrol edin.
- reset --hard, git clean, force push, veritabanı reset, volume silme ve --accept-data-loss kullanmayın. Mevcut veritabanına şema uygulamadan önce farkı inceleyin.
- `.env`, müşteri verileri, yedekler, build/cache ve test çıktıları Git'e girmez. Lock dosyasını koruyun.
- RF, anten, mikrodalga, RF kapsama, DAS ve bağlantı bütçesi görevlerinde önce `.agents/skills/rf-microwave-engineer/SKILL.md` ve `.agents/profiles/rf-microwave-engineer/PROFILE.md` okuyun. Kaynak sürümü ve MIT lisansı aynı profil klasöründedir.
- RF profili ajan rehberidir; uygulamada RF Planner veya RF tasarım modülü bulunduğu anlamına gelmez. Diğer işler `docs/NEXT_WORK.md` içinde tutulur.
- İş akışı geliştirmesinde önce `docs/NEXT_WORK.md`, `docs/product/WORKFLOW_RULES.md` ve ilgili `openspec/changes/` paketini okuyun. Sırayı bu kayıttan izleyin; kullanıcıya aynı planı yeniden tarif ettirmeyin. Yeni yönlendirme varsa planı onunla güncelleyin.
- Her değişiklikte mevcut davranışı, hedef kuralı ve doğrulama kanıtını ayırın. Görevleri yalnız gerçek uygulama ve belirtilen kontrol tamamlandığında işaretleyin; plan dosyası veya repo kurulumu çalışan ürün özelliği sayılmaz.
- Kabul: `pnpm lint`, `pnpm build`, `pnpm typecheck`, çalışan API'ye karşı `pnpm test:acceptance`; tarayıcıda giriş ve kalıcılık kontrolü. Çalıştırılmamış kontrolleri geçmiş saymayın.
