import { BadRequestException, Injectable, NotFoundException } from '@nestjs/common';
import { OperationStage, Prisma } from '@prisma/client';
import { AuthenticatedUser } from '../../common/interfaces/authenticated-user.interface';
import { safeUserSelect } from '../../common/selectors/safe-user.select';
import { PrismaService } from '../../database/prisma.service';
import { CreateProjectDto } from './dto/create-project.dto';
import { AddProjectNoteDto } from './dto/add-project-note.dto';
import { ChangeProjectStageDto, WorkflowStageCode } from './dto/change-project-stage.dto';
import { CreateProjectTaskDto } from './dto/create-project-task.dto';
import { UpdateProjectDto } from './dto/update-project.dto';
import { UpdateChecklistItemDto } from './dto/update-checklist-item.dto';
import { CompleteNextActionDto } from './dto/complete-next-action.dto';
import { workflowTemplates } from './workflow-templates';
import { AppRole } from '../../common/enums/app-role.enum';
import { UpdateProjectOperationDto } from './dto/update-project-operation.dto';
import { RevertOperationStageDto } from './dto/revert-operation-stage.dto';

const allowedTransitions: Partial<Record<WorkflowStageCode, WorkflowStageCode[]>> = {
  YENI_TALEP: ['DEGERLENDIRME'],
  DEGERLENDIRME: ['COZUM_KESIF'],
  COZUM_KESIF: ['TEKLIF_VERILDI'],
  TEKLIF_VERILDI: ['KARAR_BEKLENIYOR'],
  KARAR_BEKLENIYOR: ['KAZANILDI', 'KAYBEDILDI'],
};
const backwardTarget: Partial<Record<WorkflowStageCode, WorkflowStageCode>> = {
  DEGERLENDIRME: 'YENI_TALEP',
  COZUM_KESIF: 'DEGERLENDIRME',
  TEKLIF_VERILDI: 'COZUM_KESIF',
  KARAR_BEKLENIYOR: 'TEKLIF_VERILDI',
  KAZANILDI: 'KARAR_BEKLENIYOR',
  KAYBEDILDI: 'KARAR_BEKLENIYOR',
};
const operationStageOrder: OperationStage[] = [
  'HAZIRLIK',
  'SATINALMA',
  'IS_PROGRAMI',
  'ISG',
  'KURULUM_SERVIS',
  'TEST',
  'SAT_KABUL',
  'TESLIM',
  'FATURALAMA',
  'TAHSILAT',
  'KAPANIS_BAKIM',
];
const operationStageLabels: Record<OperationStage, string> = {
  HAZIRLIK: 'Hazırlık',
  SATINALMA: 'Satınalma',
  IS_PROGRAMI: 'İş Programı',
  ISG: 'İSG',
  KURULUM_SERVIS: 'Kurulum / Servis',
  TEST: 'Test',
  SAT_KABUL: 'SAT / Kabul',
  TESLIM: 'Teslim',
  FATURALAMA: 'Faturalama',
  TAHSILAT: 'Tahsilat',
  KAPANIS_BAKIM: 'Kapanış / Bakım',
};

@Injectable()
export class ProjectsService {
  constructor(private readonly prisma: PrismaService) {}

  findAll(companyId: string) {
    return this.prisma.project.findMany({
      where: { companyId },
      orderBy: { createdAt: 'desc' },
      include: {
        operation: { include: { operationManager: { select: safeUserSelect } } },
        customer: true,
        stage: true,
        owner: { select: safeUserSelect },
        tasks: { include: { assignee: { select: safeUserSelect } } },
      },
    });
  }

  async getOptions(companyId: string) {
    const [customers, owners] = await Promise.all([
      this.prisma.customer.findMany({
        where: { companyId, isActive: true },
        orderBy: { name: 'asc' },
        select: { id: true, name: true },
      }),
      this.prisma.user.findMany({
        where: { companyId, isActive: true },
        orderBy: { fullName: 'asc' },
        select: { id: true, fullName: true, email: true },
      }),
    ]);

    return { customers, owners };
  }

  async create(user: AuthenticatedUser, dto: CreateProjectDto) {
    const [stage, customer, owner] = await Promise.all([
      this.prisma.projectStage.findUnique({ where: { code: 'YENI_TALEP' } }),
      dto.customerId
        ? this.prisma.customer.findFirst({
            where: { id: dto.customerId, companyId: user.companyId },
          })
        : null,
      this.prisma.user.findFirst({
        where: { id: dto.ownerId ?? user.id, companyId: user.companyId, isActive: true },
      }),
    ]);

    if (!stage) {
      throw new NotFoundException(
        'YENI_TALEP aşaması bulunamadı. Önce güvenli seed komutunu çalıştırın.',
      );
    }
    if (dto.customerId && !customer) {
      throw new BadRequestException('Seçilen müşteri bu şirkete ait değil.');
    }
    if (!owner) {
      throw new BadRequestException('Seçilen sorumlu bu şirkete ait değil veya aktif değil.');
    }

    for (let attempt = 0; attempt < 4; attempt += 1) {
      const workNumber = await this.nextWorkNumber(new Date());
      try {
        return await this.prisma.project.create({
          data: {
            companyId: user.companyId,
            customerId: customer?.id,
            ownerId: owner.id,
            stageId: stage.id,
            workNumber,
            name: dto.name.trim(),
            description: dto.description?.trim() || null,
            source: dto.source,
            priority: dto.priority,
            estimatedValue: dto.estimatedValue,
            currency: dto.currency ?? (dto.estimatedValue !== undefined ? 'TRY' : undefined),
            dueDate: dto.dueDate ? new Date(dto.dueDate) : undefined,
            timelineEvents: {
              create: {
                actorId: user.id,
                eventType: 'WORK_CREATED',
                summary: 'Yeni iş / talep oluşturuldu',
                details: `İş numarası: ${workNumber}`,
              },
            },
          },
          include: this.projectInclude(),
        });
      } catch (error) {
        if (!(error instanceof Prisma.PrismaClientKnownRequestError) || error.code !== 'P2002') {
          throw error;
        }
      }
    }
    throw new BadRequestException('İş numarası üretilemedi. Lütfen yeniden deneyin.');
  }

  async findOne(id: string, companyId: string) {
    const project = await this.prisma.project.findFirst({
      where: { id, companyId },
      include: {
        ...this.projectInclude(),
        tasks: {
          orderBy: { createdAt: 'desc' },
          include: { assignee: { select: safeUserSelect } },
        },
        _count: { select: { timelineEvents: true, files: true } },
      },
    });
    if (!project) throw new NotFoundException('İş kaydı bulunamadı.');
    return project;
  }

  async update(id: string, user: AuthenticatedUser, dto: UpdateProjectDto) {
    const project = await this.findTenantProject(id, user.companyId);
    if (dto.customerId) {
      const customer = await this.prisma.customer.findFirst({
        where: { id: dto.customerId, companyId: user.companyId },
      });
      if (!customer) throw new BadRequestException('Seçilen müşteri bu şirkete ait değil.');
    }
    if (dto.ownerId) {
      const owner = await this.prisma.user.findFirst({
        where: { id: dto.ownerId, companyId: user.companyId, isActive: true },
      });
      if (!owner) {
        throw new BadRequestException('Seçilen sorumlu bu şirkete ait değil veya aktif değil.');
      }
    }

    const text = (value: string | null | undefined) =>
      value === undefined ? undefined : value?.trim() || null;
    const date = (value: string | null | undefined) =>
      value === undefined ? undefined : value ? new Date(value) : null;
    const data: Prisma.ProjectUncheckedUpdateInput = {
      name: dto.name === undefined ? undefined : dto.name.trim(),
      customerId: dto.customerId,
      ownerId: dto.ownerId,
      category: dto.category,
      priority: dto.priority,
      source: dto.source,
      description: text(dto.description),
      location: text(dto.location),
      customerContactName: text(dto.customerContactName),
      customerContactPhone: text(dto.customerContactPhone),
      customerContactEmail: text(dto.customerContactEmail),
      nextAction: text(dto.nextAction),
      nextActionDate: date(dto.nextActionDate),
      dueDate: date(dto.dueDate),
      estimatedValue: dto.estimatedValue,
      quotedValue: dto.quotedValue,
      plannedCost: dto.plannedCost,
      currency: dto.currency,
      probabilityPercent: dto.probabilityPercent,
      paymentTerms: text(dto.paymentTerms),
      deliveryTerms: text(dto.deliveryTerms),
      offerNumber: text(dto.offerNumber),
      offerRevision: text(dto.offerRevision),
      offerDate: date(dto.offerDate),
      offerValidUntil: date(dto.offerValidUntil),
      technicalSummary: text(dto.technicalSummary),
      frequencyBand: text(dto.frequencyBand),
      estimatedQuantity: dto.estimatedQuantity,
      contractPoReference: text(dto.contractPoReference),
    };
    const labels: Record<string, string> = {
      name: 'iş adı',
      customerId: 'müşteri',
      ownerId: 'sorumlu',
      category: 'iş kategorisi',
      priority: 'öncelik',
      source: 'kaynak',
      description: 'açıklama',
      location: 'lokasyon',
      customerContactName: 'müşteri yetkilisi',
      customerContactPhone: 'telefon',
      customerContactEmail: 'e-posta',
      nextAction: 'sonraki aksiyon',
      nextActionDate: 'sonraki aksiyon tarihi',
      dueDate: 'termin',
      estimatedValue: 'tahmini fırsat bedeli',
      quotedValue: 'teklif bedeli',
      plannedCost: 'planlanan maliyet',
      currency: 'para birimi',
      probabilityPercent: 'kazanma olasılığı',
      paymentTerms: 'ödeme şartı',
      deliveryTerms: 'teslim şartı',
      offerNumber: 'teklif no',
      offerRevision: 'revizyon',
      offerDate: 'teklif tarihi',
      offerValidUntil: 'teklif geçerlilik tarihi',
      technicalSummary: 'teknik çözüm özeti',
      frequencyBand: 'frekans / bant',
      estimatedQuantity: 'tahmini adet',
      contractPoReference: 'sözleşme / PO bilgisi',
    };
    const record = project as unknown as Record<string, unknown>;
    const comparable = (value: unknown) =>
      value instanceof Date
        ? value.toISOString()
        : value === null || value === undefined
          ? null
          : String(value);
    const changed = Object.entries(data)
      .filter(([, value]) => value !== undefined)
      .filter(([key, value]) => comparable(record[key]) !== comparable(value))
      .map(([key]) => labels[key]);

    if (changed.length === 0) return this.getProjectResult(id, user.companyId);
    await this.prisma.project.update({
      where: { id },
      data: {
        ...data,
        timelineEvents: {
          create: {
            actorId: user.id,
            eventType: 'WORK_UPDATED',
            summary: 'İş bilgileri güncellendi',
            details: `${changed.join(', ')} güncellendi.`,
          },
        },
      },
    });
    if (dto.category !== undefined && dto.category !== null) {
      await this.initializeChecklist(id, user.companyId);
    }
    return this.getProjectResult(id, user.companyId);
  }

  private async findTenantProject(id: string, companyId: string) {
    const project = await this.prisma.project.findFirst({
      where: { id, companyId },
      include: { stage: true },
    });
    if (!project) throw new NotFoundException('İş kaydı bulunamadı.');
    return project;
  }

  async changeStage(id: string, user: AuthenticatedUser, dto: ChangeProjectStageDto) {
    const project = await this.findTenantProject(id, user.companyId);
    const currentCode = project.stage.code as WorkflowStageCode;
    if (currentCode === dto.stageCode) {
      return { project: await this.getProjectResult(id, user.companyId), warnings: [] };
    }
    const isBackward = backwardTarget[currentCode] === dto.stageCode;
    const canMoveBackward = user.roles.some((role) =>
      [AppRole.SUPER_ADMIN, AppRole.COMPANY_ADMIN, AppRole.PROJECT_MANAGER].includes(role),
    );
    const isForward = allowedTransitions[currentCode]?.includes(dto.stageCode) ?? false;
    if (isBackward && !canMoveBackward) {
      throw new BadRequestException('Yalnızca yetkili kullanıcılar bir önceki aşamaya dönebilir.');
    }
    if (isBackward && !dto.reason?.trim()) {
      throw new BadRequestException('Geri aşama geçişi için açıklama zorunludur.');
    }
    if (!isBackward && !isForward) {
      throw new BadRequestException('Bu aşama geçişine Workflow v1 kuralları izin vermiyor.');
    }
    if (!isBackward && currentCode === 'YENI_TALEP' && !project.name.trim()) {
      throw new BadRequestException('Bu aşamaya geçmek için iş / talep adı tamamlanmalıdır.');
    }
    if (
      !isBackward &&
      currentCode === 'DEGERLENDIRME' &&
      (!project.customerId || !project.ownerId)
    ) {
      throw new BadRequestException(
        'Bu aşamaya geçmek için müşteri ve sorumlu bilgileri tamamlanmalıdır.',
      );
    }

    const targetStage = await this.prisma.projectStage.findUnique({
      where: { code: dto.stageCode },
    });
    if (!targetStage) throw new NotFoundException('Hedef iş akışı aşaması bulunamadı.');
    const warnings =
      !isBackward && currentCode === 'COZUM_KESIF' && project.estimatedValue === null
        ? ['Tahmini bedel girilmeden Teklif Verildi aşamasına geçildi.']
        : [];

    await this.prisma.$transaction(async (transaction) => {
      await transaction.project.update({
        where: { id: project.id },
        data: {
          stageId: targetStage.id,
          timelineEvents: {
            create: {
              actorId: user.id,
              eventType: isBackward ? 'STAGE_REOPENED' : 'STAGE_CHANGED',
              summary: isBackward
                ? `${project.stage.name} aşamasından ${targetStage.name} aşamasına geri alındı`
                : `${targetStage.name} aşamasına geçirildi`,
              details: isBackward
                ? `Gerekçe: ${dto.reason?.trim()}`
                : `${project.stage.name} → ${targetStage.name}`,
            },
          },
        },
      });
      if (!isBackward && dto.stageCode === 'KAZANILDI') {
        const operation = await transaction.projectOperation.findUnique({
          where: { projectId: project.id },
        });
        if (!operation) {
          await transaction.projectOperation.create({
            data: { projectId: project.id, operationManagerId: project.ownerId },
          });
          await transaction.timelineEvent.create({
            data: {
              projectId: project.id,
              actorId: user.id,
              eventType: 'OPERATION_CREATED',
              summary: 'Proje operasyonu başlatıldı',
              details: 'Operasyon aşaması: Hazırlık',
            },
          });
        }
      }
    });

    if (project.category) await this.initializeChecklist(id, user.companyId);

    return { project: await this.getProjectResult(id, user.companyId), warnings };
  }

  async getOperation(id: string, companyId: string) {
    const operation = await this.prisma.projectOperation.findFirst({
      where: { projectId: id, project: { companyId } },
      include: { operationManager: { select: safeUserSelect } },
    });
    if (!operation) throw new NotFoundException('Bu iş için operasyon kaydı bulunamadı.');
    return operation;
  }

  async updateOperation(id: string, user: AuthenticatedUser, dto: UpdateProjectOperationDto) {
    const operation = await this.findTenantOperation(id, user.companyId);
    if (dto.operationManagerId) {
      const manager = await this.prisma.user.findFirst({
        where: { id: dto.operationManagerId, companyId: user.companyId, isActive: true },
      });
      if (!manager) {
        throw new BadRequestException('Seçilen operasyon sorumlusu bu şirkete ait değil.');
      }
    }
    const text = (value: string | null | undefined) =>
      value === undefined ? undefined : value?.trim() || null;
    const date = (value: string | null | undefined) =>
      value === undefined ? undefined : value ? new Date(value) : null;
    const data: Prisma.ProjectOperationUncheckedUpdateInput = {
      operationManagerId: dto.operationManagerId,
      plannedStartAt: date(dto.plannedStartAt),
      plannedEndAt: date(dto.plannedEndAt),
      actualStartAt: date(dto.actualStartAt),
      actualEndAt: date(dto.actualEndAt),
      completionPercent: dto.completionPercent,
      nextAction: text(dto.nextAction),
      nextActionDueAt: date(dto.nextActionDueAt),
      notes: text(dto.notes),
    };
    const record = operation as unknown as Record<string, unknown>;
    const comparable = (value: unknown) =>
      value instanceof Date
        ? value.toISOString()
        : value === null || value === undefined
          ? null
          : String(value);
    const changed = Object.entries(data)
      .filter(([, value]) => value !== undefined)
      .filter(([key, value]) => comparable(record[key]) !== comparable(value));
    if (changed.length === 0) return this.getOperation(id, user.companyId);
    await this.prisma.$transaction(async (transaction) => {
      await transaction.projectOperation.update({ where: { id: operation.id }, data });
      await transaction.timelineEvent.create({
        data: {
          projectId: id,
          actorId: user.id,
          eventType: 'OPERATION_UPDATED',
          summary: 'Operasyon bilgileri güncellendi',
          details: `${changed.length} operasyon alanı güncellendi.`,
        },
      });
    });
    return this.getOperation(id, user.companyId);
  }

  async advanceOperation(id: string, user: AuthenticatedUser) {
    const operation = await this.findTenantOperation(id, user.companyId);
    const currentIndex = operationStageOrder.indexOf(operation.operationStage);
    if (currentIndex >= operationStageOrder.length - 1) {
      throw new BadRequestException('Operasyon zaten son aşamadadır.');
    }
    const nextStage = operationStageOrder[currentIndex + 1];
    await this.prisma.$transaction(async (transaction) => {
      await transaction.projectOperation.update({
        where: { id: operation.id },
        data: {
          operationStage: nextStage,
          ...(nextStage === 'KAPANIS_BAKIM'
            ? { completionPercent: 100, actualEndAt: operation.actualEndAt ?? new Date() }
            : {}),
        },
      });
      await transaction.timelineEvent.create({
        data: {
          projectId: id,
          actorId: user.id,
          eventType: 'OPERATION_STAGE_CHANGED',
          summary: `${operationStageLabels[nextStage]} operasyon aşamasına geçildi`,
          details: `${operationStageLabels[operation.operationStage]} → ${operationStageLabels[nextStage]}`,
        },
      });
    });
    return this.getOperation(id, user.companyId);
  }

  async revertOperation(id: string, user: AuthenticatedUser, dto: RevertOperationStageDto) {
    const operation = await this.findTenantOperation(id, user.companyId);
    const currentIndex = operationStageOrder.indexOf(operation.operationStage);
    if (currentIndex <= 0) throw new BadRequestException('Operasyon zaten ilk aşamadadır.');
    const previousStage = operationStageOrder[currentIndex - 1];
    await this.prisma.$transaction(async (transaction) => {
      await transaction.projectOperation.update({
        where: { id: operation.id },
        data: {
          operationStage: previousStage,
          actualEndAt: operation.operationStage === 'KAPANIS_BAKIM' ? null : undefined,
        },
      });
      await transaction.timelineEvent.create({
        data: {
          projectId: id,
          actorId: user.id,
          eventType: 'OPERATION_STAGE_REVERTED',
          summary: `${operationStageLabels[operation.operationStage]} aşamasından ${operationStageLabels[previousStage]} aşamasına geri alındı`,
          details: `Gerekçe: ${dto.reason.trim()}`,
        },
      });
    });
    return this.getOperation(id, user.companyId);
  }

  private async findTenantOperation(id: string, companyId: string) {
    const operation = await this.prisma.projectOperation.findFirst({
      where: { projectId: id, project: { companyId, stage: { code: 'KAZANILDI' } } },
    });
    if (!operation) {
      throw new NotFoundException('Kazanılmış iş için aktif operasyon kaydı bulunamadı.');
    }
    return operation;
  }

  async getChecklist(id: string, companyId: string) {
    const project = await this.findTenantProject(id, companyId);
    if (!project.category) return [];
    await this.initializeChecklist(id, companyId);
    return this.prisma.projectChecklistItem.findMany({
      where: { projectId: id, project: { companyId }, category: project.category },
      orderBy: [{ stageCode: 'asc' }, { sortOrder: 'asc' }],
      include: { completedBy: { select: safeUserSelect } },
    });
  }

  async initializeChecklist(id: string, companyId: string) {
    const project = await this.findTenantProject(id, companyId);
    if (!project.category) return [];
    const template = workflowTemplates[project.category];
    await this.prisma.$transaction(
      template.map((item, index) =>
        this.prisma.projectChecklistItem.upsert({
          where: { projectId_key: { projectId: id, key: item.key } },
          update: {
            title: item.title,
            stageCode: item.stageCode,
            category: project.category!,
            sortOrder: index + 1,
            isRequired: item.isRequired,
          },
          create: {
            projectId: id,
            key: item.key,
            title: item.title,
            stageCode: item.stageCode,
            category: project.category!,
            sortOrder: index + 1,
            isRequired: item.isRequired,
          },
        }),
      ),
    );
    return this.prisma.projectChecklistItem.findMany({
      where: { projectId: id, category: project.category },
      orderBy: [{ stageCode: 'asc' }, { sortOrder: 'asc' }],
      include: { completedBy: { select: safeUserSelect } },
    });
  }

  async updateChecklistItem(
    id: string,
    itemId: string,
    user: AuthenticatedUser,
    dto: UpdateChecklistItemDto,
  ) {
    await this.findTenantProject(id, user.companyId);
    const item = await this.prisma.projectChecklistItem.findFirst({
      where: { id: itemId, projectId: id, project: { companyId: user.companyId } },
    });
    if (!item) throw new NotFoundException('Kontrol listesi maddesi bulunamadı.');
    if (item.isCompleted === dto.isCompleted) {
      return this.prisma.projectChecklistItem.findUniqueOrThrow({
        where: { id: item.id },
        include: { completedBy: { select: safeUserSelect } },
      });
    }
    return this.prisma.$transaction(async (transaction) => {
      const updated = await transaction.projectChecklistItem.update({
        where: { id: item.id },
        data: {
          isCompleted: dto.isCompleted,
          completedAt: dto.isCompleted ? new Date() : null,
          completedById: dto.isCompleted ? user.id : null,
        },
        include: { completedBy: { select: safeUserSelect } },
      });
      await transaction.timelineEvent.create({
        data: {
          projectId: id,
          actorId: user.id,
          eventType: dto.isCompleted ? 'CHECKLIST_COMPLETED' : 'CHECKLIST_REOPENED',
          summary: dto.isCompleted
            ? 'Kontrol listesi maddesi tamamlandı'
            : 'Kontrol listesi maddesi yeniden açıldı',
          details: item.title,
        },
      });
      return updated;
    });
  }

  async completeNextAction(id: string, user: AuthenticatedUser, dto: CompleteNextActionDto) {
    const project = await this.findTenantProject(id, user.companyId);
    if (!project.nextAction)
      throw new BadRequestException('Tamamlanacak sonraki aksiyon bulunmuyor.');
    const replacement = dto.nextAction?.trim() || null;
    await this.prisma.project.update({
      where: { id },
      data: {
        nextAction: replacement,
        nextActionDate: replacement && dto.nextActionDate ? new Date(dto.nextActionDate) : null,
        timelineEvents: {
          create: {
            actorId: user.id,
            eventType: 'NEXT_ACTION_COMPLETED',
            summary: 'Sonraki aksiyon tamamlandı',
            details: project.nextAction,
          },
        },
      },
    });
    return this.getProjectResult(id, user.companyId);
  }

  async getTimeline(id: string, companyId: string) {
    await this.findTenantProject(id, companyId);
    return this.prisma.timelineEvent.findMany({
      where: { projectId: id, project: { companyId } },
      orderBy: { occurredAt: 'desc' },
      include: { actor: { select: safeUserSelect } },
    });
  }

  async addNote(id: string, user: AuthenticatedUser, dto: AddProjectNoteDto) {
    await this.findTenantProject(id, user.companyId);
    return this.prisma.timelineEvent.create({
      data: {
        projectId: id,
        actorId: user.id,
        eventType: 'NOTE_ADDED',
        summary: 'Not eklendi',
        details: dto.note.trim(),
      },
      include: { actor: { select: safeUserSelect } },
    });
  }

  async createTask(id: string, user: AuthenticatedUser, dto: CreateProjectTaskDto) {
    await this.findTenantProject(id, user.companyId);
    const assignee = await this.prisma.user.findFirst({
      where: { id: dto.assigneeId ?? user.id, companyId: user.companyId, isActive: true },
    });
    if (!assignee) {
      throw new BadRequestException(
        'Seçilen görev sorumlusu bu şirkete ait değil veya aktif değil.',
      );
    }

    const task = await this.prisma.$transaction(async (transaction) => {
      const createdTask = await transaction.task.create({
        data: {
          projectId: id,
          assigneeId: assignee.id,
          title: dto.title.trim(),
          dueDate: dto.dueDate ? new Date(dto.dueDate) : undefined,
          priority: dto.priority,
        },
        include: { assignee: { select: safeUserSelect } },
      });
      await transaction.timelineEvent.create({
        data: {
          projectId: id,
          actorId: user.id,
          eventType: 'TASK_CREATED',
          summary: 'Görev oluşturuldu',
          details: createdTask.title,
        },
      });
      return createdTask;
    });

    return task;
  }

  private getProjectResult(id: string, companyId: string) {
    return this.prisma.project.findFirstOrThrow({
      where: { id, companyId },
      include: this.projectInclude(),
    });
  }

  private projectInclude() {
    return {
      customer: true,
      stage: true,
      owner: { select: safeUserSelect },
      tasks: { include: { assignee: { select: safeUserSelect } } },
      operation: {
        include: {
          operationManager: { select: safeUserSelect },
          bomItems: { orderBy: [{ sortOrder: 'asc' }, { createdAt: 'asc' }] },
          purchaseOrders: {
            include: { supplier: true, items: true },
            orderBy: { createdAt: 'desc' },
          },
        },
      },
    } satisfies Prisma.ProjectInclude;
  }

  private async nextWorkNumber(now: Date) {
    const year = now.getUTCFullYear();
    const prefix = `IS-${year}-`;
    const latest = await this.prisma.project.findFirst({
      where: { workNumber: { startsWith: prefix } },
      orderBy: { workNumber: 'desc' },
      select: { workNumber: true },
    });
    const sequence = latest?.workNumber ? Number(latest.workNumber.slice(prefix.length)) + 1 : 1;
    return `${prefix}${sequence.toString().padStart(4, '0')}`;
  }
}
