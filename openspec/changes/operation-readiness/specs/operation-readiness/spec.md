# Operasyon hazırlığı

## Purpose

İş dosyasındaki mevcut kayıtların eksiklerini anlaşılır biçimde göstermek ve kullanıcıyı düzeltme alanına yönlendirmek; hesaplanmamış uygunluğu varmış gibi sunmamak.

## ADDED Requirements

### Requirement: Tenant-scoped readiness

The system SHALL show readiness only to an authenticated user permitted to read the operation in their own company.

#### Scenario: Another company's operation
- **WHEN** kullanıcı başka şirkete ait operasyonun hazırlığını ister
- **THEN** 404 döner ve sorumlu, belge veya personel bilgisi açıklanmaz.

#### Scenario: Missing session
- **WHEN** oturumsuz bir istek yapılır
- **THEN** 401 döner.

### Requirement: Evidence-based checks

The system SHALL evaluate the active operation manager, valid planned start/end dates, nonblank next action with due date, and initialized required discovery items from current stored data. Missing category or an empty checklist SHALL be unresolved, not successful.

#### Scenario: Missing preparation
- **WHEN** sorumlu yok, programın bitişi başlangıçtan önce veya sıradaki aksiyon eksikse
- **THEN** ilgili kontrol “Eksik” görünür ve düzeltilecek alan gösterilir.

#### Scenario: Required checklist item is incomplete
- **WHEN** başlatılmış kontrol listesindeki zorunlu bir keşif maddesi tamamlanmamışsa
- **THEN** madde başlığı eksikler içinde ve kontrol listesine bağlantıyla gösterilir.

#### Scenario: Category is undefined
- **WHEN** iş kategorisi veya kontrol listesi tanımlı değilse
- **THEN** “Kontrol listesi tanımlanmamış” gösterilir; sıfır eksik varsayılmaz.

### Requirement: Unsupported checks are explicit

The system SHALL distinguish completed current checks, missing input, and checks not yet implemented. It SHALL not show an overall field-safety or acceptance approval based on preparation data.

#### Scenario: Current preparation is complete
- **WHEN** mevcut hazırlık bilgileri tamam fakat proje ekip/İSG veya kabul denetimi uygulanmamışsa
- **THEN** tamamlanan maddeler görünür; uygulanmamış kontroller ayrı belirtilir ve “Sahaya çıkış onayı değildir” açıklaması korunur.

### Requirement: Preserve existing behavior and private information

The system SHALL calculate readiness without modifying projects, checklists, personnel records, or current stage permissions. Responses SHALL exclude salaries, document contents, and document download links.

#### Scenario: Project manager reads readiness
- **WHEN** proje yöneticisi hazırlık kontrolünü açar
- **THEN** hazırlık özetini görür; ücretleri ve özel İK dosyalarını okuyamaz.

#### Scenario: Readiness is requested twice
- **WHEN** aynı hazırlık görünümü iki kez açılır
- **THEN** yeni görev, kontrol maddesi veya zaman çizelgesi olayı üretilmez.

#### Scenario: Category correction preserves business relationships
- **WHEN** kullanıcı hazırlık kartından iş kategorisini düzeltir
- **THEN** Teknik form açılır; kayıt isteği müşteri ve iş sahibi alanlarına yazmaz ve mevcut bağlantılar korunur.

### Requirement: Recovery and accessible presentation

The system SHALL show loading and retryable failures explicitly, offer correction links for missing input, and fit a 390px viewport. Refresh SHALL recompute checks from persisted data.

#### Scenario: Read fails
- **WHEN** API isteği başarısız olur
- **THEN** “Hazırlık kontrolü yüklenemedi” ve tekrar deneme gösterilir; başarılı veya boş sonuç gösterilmez.

#### Scenario: User corrects missing data
- **WHEN** kullanıcı yönlendirildiği alanda eksik bilgiyi kaydeder ve hazırlığa döner veya sayfayı yeniler
- **THEN** güncel kayıt değerlendirilir ve sonuç yatay taşma olmadan görünür.
