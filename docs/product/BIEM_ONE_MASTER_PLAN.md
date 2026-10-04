# BIEM ONE Master Plan

## Güncel uygulama kaydı — 4 Ekim 2026

Hedef: müşteri talebi, satış, teknik çalışma, satınalma, saha, personel, gerçek maliyet ve teslim/bakımı tek İş Dosyasında izlemek. Çalışan sürüm `7e7ce10`; Personel / İK güncellemesi Windows üzerinde doğrulandı.

- [Sıralı teslim listesi ve durum](../NEXT_WORK.md)
- [İşleyiş diyagramı, geçiş kuralları ve mevcut eksikler](WORKFLOW_RULES.md)
- [Repo kaynakları ve seçim gerekçesi](WORKFLOW_REPO_SUPPORT.md)
- [İlk uygulama: operasyon hazırlık görünümü](../../openspec/changes/operation-readiness/proposal.md)

Güncel uygulama önceliği NEXT_WORK.md içindedir. Aşağıdaki ilk vizyon ve fazlar ürünün kapsam referansıdır; tamamlanmış özellik veya ayrı bir görev listesi değildir.

## Product Vision

BIEM ONE is the operational system for Biem Teknoloji. It should centralize customer management, project delivery, field activity, maintenance workflows, task coordination, documents, notifications, workflow automation, and AI-assisted analysis.

## Core Product Areas

1. Identity and access
   - JWT authentication
   - Refresh token lifecycle
   - Role-based authorization
2. Customer and contact management
   - Customer records
   - Contact directory
   - Relationship to active and historical projects
3. Project operations
   - Standard BIEM project stages
   - Milestones, delivery history, and timeline events
   - Site-level execution visibility
4. Task and field coordination
   - Personal task queues
   - Team assignment
   - Mobile-first field workflow
5. Documents and notifications
   - File metadata and document links
   - User notifications and reminders
6. Intelligence and automation
   - Workflow triggers
   - AI risk summaries
   - Delivery and maintenance insights

## Delivery Phases

### Phase 1: Foundation

- Monorepo setup
- Auth and RBAC skeleton
- Core database models
- Admin and mobile shell applications
- Dockerized local infrastructure

### Phase 2: Operational CRUD

- Customers CRUD
- Contacts CRUD
- Projects CRUD
- Tasks CRUD
- Project stage transitions
- Timeline event generation

### Phase 3: Collaboration and files

- File upload pipeline
- Document categories
- Notification delivery rules
- Activity feeds and audit history

### Phase 4: Workflow automation

- Stage-based automations
- Maintenance reminders
- Approval flows
- Redis-backed background processing

### Phase 5: AI-assisted operations

- Project health summaries
- Delay and risk analysis
- Document extraction
- Suggested next actions

## Success Metrics

- Faster project stage tracking
- Lower coordination delay between office and field teams
- Better visibility into maintenance and follow-up work
- Reduced time spent searching for documents and status updates
- Clear audit trail for operational decisions
