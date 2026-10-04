# İş akışları için repo desteği

İnceleme: 4 Ekim 2026. BIEM-ONE başlangıç sürümü: `7e7ce108103467fe94de67aec0ca20e805d71eb3`.

## Seçim

| Kaynak | BIEM-ONE'da yararlanılacak bölüm | Kullanım şekli | Lisans |
| --- | --- | --- | --- |
| [Fission-AI/OpenSpec](https://github.com/Fission-AI/OpenSpec) | Değişiklik önerisi, davranış kuralları, senaryolar, tasarım ve takip edilen görevler | `openspec/` altında proje bağlamı ve ilk değişiklik paketi. Uygulamanın çalışması buna bağlı değil. | MIT |
| [frappe/erpnext](https://github.com/frappe/erpnext) | Aşama/rol/geçiş koşulları; satınalma, proje, görev ve gerçek maliyet ilişkisi | Süreç referansı. İş kuralları mevcut NestJS/Prisma çekirdeğinde geliştirilecek. | GPL-3.0 |
| [frappe/hrms](https://github.com/frappe/hrms) | İşe giriş görevleri, personel yaşam döngüsü, izin/masraf onay sorumluları | İK ikinci fazının süreç referansı. Türkiye bordrosu veya İSG uygunluğu hazır kabul edilmeyecek. | GPL-3.0 |
| [K-Dense-AI/scientific-agents](https://github.com/K-Dense-AI/scientific-agents) | RF/mikrodalga uzman profili | Zaten seçili RF profili ve lisansı repoda mevcut; teknik araştırmada kullanılacak. | MIT |

ERPNext ve HRMS kaynak kodu bu değişiklikte kopyalanmadı veya çalıştırılmadı. Yeni ERP sunucusu, veritabanı, ücretli API veya bağlayıcı eklenmedi. OpenSpec klasörleri eldeki projeye göre yazılmıştır; CLI/ajan komutlarının global kurulumu yapılmış sayılmaz.

[github/spec-kit](https://github.com/github/spec-kit), MIT lisanslı alternatif olarak incelendi. Mevcut projeye katılım rehberi var. Bu çalışma için tek değişiklik paketi düzeni seçildi: OpenSpec. İki ayrı plan/task kaynağı oluşturulmayacak. Bu seçim, Spec Kit'in mevcut projelerde kullanılamadığı anlamına gelmez.

## İncelenen kaynak sürümleri

Bu tablo araştırmanın sabit referansıdır; sürümlerin otomatik olarak güncel kalacağı varsayılmaz. GitHub API incelemesinde beş depo da arşivlenmemişti.

| Repo | İncelenen dal | Commit |
| --- | --- | --- |
| OpenSpec | main | `2500d6da971336167548b53731a35b2127df35ac` |
| Spec Kit | main | `ae5ade7234be5cb1d975f736c4e06dd46d1326d6` |
| ERPNext | develop | `16d30e08b57c9213561baa9e481d6615430351d6` |
| Frappe HR | develop | `82209719ae54d85c3a5ced1591c82c6933a594b5` |
| Scientific Agents | main | `98c7fae46648724e1a43a1f2b207b0c82fcc462e` |

OpenSpec kaynak `package.json` sürümü `1.14.0`, Node gereksinimi `>=20.19.0`. ERPNext/HRMS develop dalları yalnız inceleme referansıdır; üretime kurulum sürümü olarak seçilmedi.

## Somut kaynak → karar eşlemesi

- [OpenSpec mevcut projeler rehberi](https://github.com/Fission-AI/OpenSpec/blob/2500d6da971336167548b53731a35b2127df35ac/docs/existing-projects.md): ilk paket yalnız operasyon hazırlık görünümünü kapsar. Bütün uygulamaya geriye dönük spec yazılmaz.
- [OpenSpec özelleştirme](https://github.com/Fission-AI/OpenSpec/blob/2500d6da971336167548b53731a35b2127df35ac/docs/customization.md): teknoloji, veri koruma ve test kuralları `openspec/config.yaml` içindedir.
- [ERPNext Workflows](https://docs.frappe.io/erpnext/workflows): durum, yetkili rol, koşul ve geri dönüş ayrılır. BIEM kural tablosu bu yapıyla hazırlanmıştır.
- [ERPNext Project Costing](https://docs.frappe.io/erpnext/project-costing): görev/puantajın gerçek proje maliyetine bağlanması referans alındı; BIEM'de onaylı puantaj maliyeti zaten vardır.
- [Frappe Employee Onboarding](https://docs.frappe.io/hr/employee-onboarding): işe girişte sorumlu ve zaman içeren görev şablonu İK ikinci fazına alınır.
- [Frappe Employee](https://docs.frappe.io/hr/employee) ve [Expense Claim](https://docs.frappe.io/hr/expense-claim): personel kaydı, onay sorumlusu ve masrafın projeye yansıması ayrı işlemlerdir.
- RF profilinin kaynak, lisans ve dosya hash kayıtları: `.agents/profiles/rf-microwave-engineer/SOURCE.json`.

## Uygulama düzeni

Sıra `docs/NEXT_WORK.md` içindedir. İlk işin neden/kural/tasarım/görev paketi `openspec/changes/operation-readiness/` altındadır. Tamamlanma kanıtı uygulama testleri ve çalışan ekran sonucudur. Yeni sohbette veya başka kodlama ajanında aynı dosyalar devam noktasıdır.

İlk paket, geçici CLI çalıştırmasıyla OpenSpec 1.14.0 `validate operation-readiness --strict` kontrolünden geçti. Telemetri bu çalıştırmada kapalıydı; global kurulum ve uygulama bağımlılığı eklenmedi. Bu doğrulama spec biçimini sınar, henüz yazılmamış ürün kodunu test etmez.
