import {
  BadRequestException,
  ConflictException,
  ForbiddenException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { Prisma, PurchaseStatus } from '@prisma/client';
import { PrismaService } from '../../database/prisma.service';
import { AuthenticatedUser } from '../../common/interfaces/authenticated-user.interface';
import { AppRole } from '../../common/enums/app-role.enum';
import {
  BomDto,
  OperationDto,
  OrderDto,
  OrderStatusDto,
  PartyDto,
  ProjectDto,
  ReceiptDto,
  SalesDto,
  UpdatePartyDto,
} from './business.dto';

const D = Prisma.Decimal;
const orderInclude = {
  supplier: true,
  items: true,
  receipts: { include: { items: true }, orderBy: { createdAt: 'desc' as const } },
} satisfies Prisma.PurchaseOrderInclude;
const managerRoles = [AppRole.SUPER_ADMIN, AppRole.COMPANY_ADMIN, AppRole.PROJECT_MANAGER];
const stageLabels = {
  REVIEW: 'Değerlendirme',
  SURVEY: 'Çözüm / keşif',
  QUOTED: 'Teklif verildi',
  DECISION: 'Karar bekleniyor',
  WON: 'Kazanıldı',
  LOST: 'Kaybedildi',
};

const operationLabels = {
  PREPARATION: 'Hazırlık',
  PROCUREMENT: 'Satınalma',
  INSTALLATION: 'Kurulum',
  TEST: 'Test',
  ACCEPTANCE: 'Kabul',
  MAINTENANCE: 'Bakım',
  COMPLETED: 'Tamamlandı',
};
const purchaseLabels = {
  DRAFT: 'Taslak',
  SUBMITTED: 'Onay bekliyor',
  APPROVED: 'Onaylandı',
  ORDERED: 'Sipariş verildi',
  PARTIALLY_RECEIVED: 'Kısmi teslim',
  RECEIVED: 'Teslim alındı',
  CANCELLED: 'İptal',
};

@Injectable()
export class BusinessService {
  constructor(private readonly db: PrismaService) {}

  private manager(u: AuthenticatedUser) {
    if (!u.roles.some((r) => managerRoles.includes(r)))
      throw new ForbiddenException('Bu işlem için yönetici yetkisi gerekli.');
  }
  private async transaction<T>(fn: (tx: Prisma.TransactionClient) => Promise<T>): Promise<T> {
    for (let attempt = 0; ; attempt++) {
      try {
        return await this.db.$transaction(fn, {
          isolationLevel: Prisma.TransactionIsolationLevel.Serializable,
        });
      } catch (error) {
        if (
          error instanceof Prisma.PrismaClientKnownRequestError &&
          ['P2034', 'P2002'].includes(error.code) &&
          attempt < 3
        )
          continue;
        if (
          error instanceof Prisma.PrismaClientKnownRequestError &&
          ['P2034', 'P2002'].includes(error.code)
        )
          throw new ConflictException('Kayıt eşzamanlı değişti. Yeniden deneyin.');
        throw error;
      }
    }
  }
  private event(
    tx: Prisma.TransactionClient,
    u: AuthenticatedUser,
    projectId: string,
    eventType: string,
    summary: string,
    details?: string,
  ) {
    return tx.timelineEvent.create({
      data: { projectId, actorId: u.id, eventType, summary, details },
    });
  }
  private async operation(tx: Prisma.TransactionClient, u: AuthenticatedUser, id: string) {
    const op = await tx.projectOperation.findFirst({
      where: { id, project: { companyId: u.companyId } },
    });
    if (!op) throw new NotFoundException('Operasyon bulunamadı.');
    return op;
  }
  private positive(value: string) {
    const result = new D(value);
    if (result.lte(0)) throw new BadRequestException('Miktar sıfırdan büyük olmalı.');
    return result;
  }

  parties(u: AuthenticatedUser, type: 'customer' | 'supplier', q = '') {
    const where = {
      companyId: u.companyId,
      OR: ['name', 'shortName', 'contactName', 'taxNumber'].map((field) => ({
        [field]: { contains: q.slice(0, 160), mode: 'insensitive' as const },
      })),
    };
    return type === 'customer'
      ? this.db.customer.findMany({ where, orderBy: { name: 'asc' } })
      : this.db.supplier.findMany({ where, orderBy: { name: 'asc' } });
  }
  createParty(u: AuthenticatedUser, type: 'customer' | 'supplier', dto: PartyDto) {
    this.manager(u);
    const data = { ...dto, name: dto.name.trim(), companyId: u.companyId };
    return type === 'customer'
      ? this.db.customer.create({ data })
      : this.db.supplier.create({ data });
  }
  async updateParty(
    u: AuthenticatedUser,
    type: 'customer' | 'supplier',
    id: string,
    dto: UpdatePartyDto,
  ) {
    this.manager(u);
    const data = { ...dto, ...(dto.name ? { name: dto.name.trim() } : {}) };
    const where = { id, companyId: u.companyId };
    const found =
      type === 'customer'
        ? await this.db.customer.findFirst({ where })
        : await this.db.supplier.findFirst({ where });
    if (!found) throw new NotFoundException('Kayıt bulunamadı.');
    return type === 'customer'
      ? this.db.customer.update({ where, data })
      : this.db.supplier.update({ where, data });
  }

  projects(u: AuthenticatedUser) {
    return this.db.project.findMany({
      where: { companyId: u.companyId },
      include: { customer: true, stage: true, operation: true },
      orderBy: { updatedAt: 'desc' },
    });
  }
  async project(u: AuthenticatedUser, id: string) {
    const project = await this.db.project.findFirst({
      where: { id, companyId: u.companyId },
      include: {
        customer: true,
        stage: true,
        operation: {
          include: {
            bomItems: {
              orderBy: { createdAt: 'asc' },
              include: {
                purchaseItems: {
                  select: { quantity: true, purchaseOrder: { select: { status: true } } },
                },
              },
            },
            purchaseOrders: { include: orderInclude, orderBy: { createdAt: 'desc' } },
          },
        },
        timelineEvents: { orderBy: { occurredAt: 'desc' }, take: 100 },
      },
    });
    if (!project) throw new NotFoundException('İş dosyası bulunamadı.');
    const bomTotals: Record<string, string> = {};
    const bomItems = project.operation?.bomItems.map((item) => {
      const allocated = item.purchaseItems
        .filter((i) => i.purchaseOrder.status !== 'CANCELLED')
        .reduce((n, i) => n.add(i.quantity), new D(0));
      const estimatedCost = item.quantity.mul(item.unitPrice).toDecimalPlaces(2, D.ROUND_HALF_UP);
      bomTotals[item.currency] = new D(bomTotals[item.currency] ?? 0).add(estimatedCost).toString();
      return {
        ...item,
        estimatedCost: estimatedCost.toString(),
        availableQuantity: item.quantity.sub(allocated).toString(),
      };
    });
    return {
      ...project,
      operation: project.operation ? { ...project.operation, bomItems, bomTotals } : null,
    };
  }
  createProject(u: AuthenticatedUser, dto: ProjectDto) {
    this.manager(u);
    return this.transaction(async (tx) => {
      if (
        !(await tx.customer.findFirst({
          where: { id: dto.customerId, companyId: u.companyId, isActive: true },
        }))
      )
        throw new BadRequestException('Aktif bir müşteri seçin.');
      const stage = await tx.projectStage.upsert({
        where: { code: 'SALES_REVIEW' },
        create: { code: 'SALES_REVIEW', name: stageLabels.REVIEW, sortOrder: 1 },
        update: {},
      });
      const project = await tx.project.create({
        data: { ...dto, name: dto.name.trim(), companyId: u.companyId, stageId: stage.id },
      });
      await this.event(tx, u, project.id, 'PROJECT_CREATED', 'İş dosyası oluşturuldu.');
      return project;
    });
  }
  sales(u: AuthenticatedUser, id: string, dto: SalesDto) {
    this.manager(u);
    return this.transaction(async (tx) => {
      const project = await tx.project.findFirst({
        where: { id, companyId: u.companyId },
        include: { operation: true },
      });
      if (!project) throw new NotFoundException('İş dosyası bulunamadı.');
      if (project.operation && dto.status !== 'WON')
        throw new ConflictException('Operasyona açılan işin satış durumu geri alınamaz.');
      const stage = await tx.projectStage.upsert({
        where: { code: `SALES_${dto.status}` },
        create: {
          code: `SALES_${dto.status}`,
          name: stageLabels[dto.status],
          sortOrder: Object.keys(stageLabels).indexOf(dto.status) + 1,
        },
        update: {},
      });
      await tx.project.update({
        where: { id },
        data: { salesStatus: dto.status, stageId: stage.id },
      });
      if (dto.status === 'WON')
        await tx.projectOperation.upsert({
          where: { projectId: id },
          create: { projectId: id },
          update: {},
        });
      if (project.salesStatus !== dto.status)
        await this.event(
          tx,
          u,
          id,
          'SALES_STATUS_CHANGED',
          `Satış aşaması: ${stageLabels[dto.status]}`,
        );
      return { ok: true };
    });
  }
  updateOperation(u: AuthenticatedUser, id: string, dto: OperationDto) {
    this.manager(u);
    return this.transaction(async (tx) => {
      const op = await this.operation(tx, u, id);
      await tx.projectOperation.update({ where: { id }, data: dto });
      await this.event(
        tx,
        u,
        op.projectId,
        'OPERATION_STATUS_CHANGED',
        `Operasyon aşaması: ${operationLabels[dto.status]}`,
      );
      return { ok: true };
    });
  }
  saveBom(u: AuthenticatedUser, operationId: string, dto: BomDto, id?: string) {
    this.manager(u);
    return this.transaction(async (tx) => {
      const op = await this.operation(tx, u, operationId);
      this.positive(dto.quantity);
      if (id) {
        const item = await tx.bomItem.findFirst({
          where: { id, operationId },
          include: { _count: { select: { purchaseItems: true } } },
        });
        if (!item) throw new NotFoundException('BOM kalemi bulunamadı.');
        if (item._count.purchaseItems)
          throw new ConflictException('Siparişe bağlı BOM değiştirilemez. Yeni kalem ekleyin.');
      }
      const item = id
        ? await tx.bomItem.update({ where: { id }, data: dto })
        : await tx.bomItem.create({ data: { ...dto, operationId } });
      await this.event(
        tx,
        u,
        op.projectId,
        'BOM_CHANGED',
        `${dto.name}: BOM ${id ? 'güncellendi' : 'eklendi'}.`,
      );
      return item;
    });
  }
  deleteBom(u: AuthenticatedUser, operationId: string, id: string) {
    this.manager(u);
    return this.transaction(async (tx) => {
      const op = await this.operation(tx, u, operationId);
      const item = await tx.bomItem.findFirst({
        where: { id, operationId },
        include: { _count: { select: { purchaseItems: true } } },
      });
      if (!item) throw new NotFoundException('BOM kalemi bulunamadı.');
      if (item._count.purchaseItems)
        throw new ConflictException(
          'Siparişe bağlı BOM silinemez; iptal edilmiş siparişler de korunur.',
        );
      await tx.bomItem.delete({ where: { id } });
      await this.event(tx, u, op.projectId, 'BOM_DELETED', `${item.name}: BOM kalemi silindi.`);
      return { ok: true };
    });
  }
  createOrder(u: AuthenticatedUser, operationId: string, dto: OrderDto) {
    this.manager(u);
    return this.transaction(async (tx) => {
      const op = await this.operation(tx, u, operationId);
      const previous = await tx.purchaseOrder.findUnique({
        where: { companyId_requestKey: { companyId: u.companyId, requestKey: dto.requestKey } },
        include: orderInclude,
      });
      if (previous) {
        if (
          previous.operationId !== operationId ||
          previous.supplierId !== dto.supplierId ||
          previous.currency !== dto.currency ||
          (previous.notes ?? '') !== (dto.notes ?? '') ||
          previous.items.length !== dto.items.length ||
          dto.items.some((line) => {
            const saved = previous.items.find((i) => i.bomItemId === line.bomItemId);
            return (
              !saved ||
              !saved.quantity.eq(line.quantity) ||
              !saved.unitPrice.eq(line.unitPrice) ||
              !saved.taxRate.eq(line.taxRate)
            );
          })
        )
          throw new ConflictException(
            'Aynı istek anahtarı farklı sipariş bilgileriyle kullanıldı.',
          );
        return previous;
      }
      if (
        !(await tx.supplier.findFirst({
          where: { id: dto.supplierId, companyId: u.companyId, isActive: true },
        }))
      )
        throw new BadRequestException('Aktif bir tedarikçi seçin.');
      if (new Set(dto.items.map((i) => i.bomItemId)).size !== dto.items.length)
        throw new BadRequestException('Aynı BOM kalemi iki kez seçilemez.');
      const lines: Prisma.PurchaseOrderItemUncheckedCreateWithoutPurchaseOrderInput[] = [];
      let subtotal = new D(0),
        taxTotal = new D(0);
      for (const line of dto.items) {
        const bom = await tx.bomItem.findFirst({
          where: { id: line.bomItemId, operationId },
          include: {
            purchaseItems: { where: { purchaseOrder: { status: { not: 'CANCELLED' } } } },
          },
        });
        if (!bom || bom.currency !== dto.currency)
          throw new BadRequestException('BOM aynı operasyon ve para biriminden olmalı.');
        const quantity = this.positive(line.quantity),
          price = new D(line.unitPrice),
          rate = new D(line.taxRate);
        const allocated = bom.purchaseItems.reduce((n, i) => n.add(i.quantity), new D(0));
        if (quantity.add(allocated).gt(bom.quantity))
          throw new ConflictException('Sipariş miktarı BOM kalan miktarını aşıyor.');
        if (rate.gt(100)) throw new BadRequestException('Vergi oranı 0–100 arasında olmalı.');
        const net = quantity.mul(price).toDecimalPlaces(2, D.ROUND_HALF_UP);
        const tax = net.mul(rate).div(100).toDecimalPlaces(2, D.ROUND_HALF_UP);
        subtotal = subtotal.add(net);
        taxTotal = taxTotal.add(tax);
        lines.push({
          bomItemId: bom.id,
          name: bom.name,
          unit: bom.unit,
          quantity,
          unitPrice: price,
          taxRate: rate,
          subtotal: net,
          taxTotal: tax,
          total: net.add(tax),
        });
      }
      const year = new Date().getUTCFullYear();
      const counter = await tx.purchaseCounter.upsert({
        where: { companyId_year: { companyId: u.companyId, year } },
        create: { companyId: u.companyId, year, value: 1 },
        update: { value: { increment: 1 } },
      });
      const order = await tx.purchaseOrder.create({
        data: {
          companyId: u.companyId,
          operationId,
          supplierId: dto.supplierId,
          requestKey: dto.requestKey,
          currency: dto.currency,
          notes: dto.notes,
          number: `PO-${year}-${String(counter.value).padStart(5, '0')}`,
          subtotal,
          taxTotal,
          total: subtotal.add(taxTotal),
          items: { create: lines },
        },
        include: orderInclude,
      });
      await this.event(tx, u, op.projectId, 'PURCHASE_CREATED', `${order.number} oluşturuldu.`);
      return order;
    });
  }
  orderStatus(u: AuthenticatedUser, id: string, dto: OrderStatusDto) {
    this.manager(u);
    if (
      dto.status === 'APPROVED' &&
      !u.roles.some((r) => [AppRole.SUPER_ADMIN, AppRole.COMPANY_ADMIN].includes(r))
    )
      throw new ForbiddenException('Siparişi yalnızca şirket yöneticisi onaylayabilir.');
    return this.transaction(async (tx) => {
      const po = await tx.purchaseOrder.findFirst({
        where: { id, companyId: u.companyId },
        include: { items: true, operation: true },
      });
      if (!po) throw new NotFoundException('Sipariş bulunamadı.');
      const next: Partial<Record<PurchaseStatus, PurchaseStatus>> = {
        DRAFT: 'SUBMITTED',
        SUBMITTED: 'APPROVED',
        APPROVED: 'ORDERED',
      };
      if (dto.status === 'CANCELLED') {
        if (po.status === 'CANCELLED' || po.items.some((i) => i.receivedQuantity.gt(0)))
          throw new ConflictException('Teslimatlı veya iptal edilmiş sipariş iptal edilemez.');
      } else if (next[po.status] !== dto.status)
        throw new ConflictException('Geçersiz sipariş aşaması.');
      const order = await tx.purchaseOrder.update({
        where: { id },
        data: { status: dto.status },
        include: orderInclude,
      });
      await this.event(
        tx,
        u,
        po.operation.projectId,
        'PURCHASE_STATUS_CHANGED',
        `${po.number}: ${purchaseLabels[dto.status]}`,
      );
      return order;
    });
  }
  receive(u: AuthenticatedUser, id: string, dto: ReceiptDto) {
    if (!u.roles.some((r) => [...managerRoles, AppRole.FIELD_ENGINEER].includes(r)))
      throw new ForbiddenException();
    return this.transaction(async (tx) => {
      const po = await tx.purchaseOrder.findFirst({
        where: { id, companyId: u.companyId },
        include: { items: true, operation: true },
      });
      if (!po) throw new NotFoundException('Sipariş bulunamadı.');
      const previous = await tx.purchaseReceipt.findUnique({
        where: { purchaseOrderId_requestKey: { purchaseOrderId: id, requestKey: dto.requestKey } },
        include: { items: true },
      });
      if (previous) {
        if (
          (previous.note ?? '') !== (dto.note ?? '') ||
          previous.items.length !== dto.items.length ||
          dto.items.some((line) => {
            const saved = previous.items.find((i) => i.purchaseOrderItemId === line.itemId);
            return !saved || !saved.quantity.eq(line.quantity);
          })
        )
          throw new ConflictException(
            'Aynı istek anahtarı farklı teslimat bilgileriyle kullanıldı.',
          );
        return previous;
      }
      if (!(['ORDERED', 'PARTIALLY_RECEIVED'] as PurchaseStatus[]).includes(po.status))
        throw new ConflictException('Teslimat için sipariş verilmiş olmalı.');
      if (new Set(dto.items.map((i) => i.itemId)).size !== dto.items.length)
        throw new BadRequestException('Aynı kalem iki kez teslim alınamaz.');
      const receiptItems: Prisma.PurchaseReceiptItemUncheckedCreateWithoutReceiptInput[] = [];
      for (const line of dto.items) {
        const item = po.items.find((i) => i.id === line.itemId);
        const quantity = this.positive(line.quantity);
        if (!item) throw new BadRequestException('Sipariş kalemi bulunamadı.');
        if (item.receivedQuantity.add(quantity).gt(item.quantity))
          throw new ConflictException('Teslimat kalan sipariş miktarını aşıyor.');
        item.receivedQuantity = item.receivedQuantity.add(quantity);
        await tx.purchaseOrderItem.update({
          where: { id: item.id },
          data: { receivedQuantity: item.receivedQuantity },
        });
        receiptItems.push({ purchaseOrderItemId: item.id, quantity });
      }
      const receipt = await tx.purchaseReceipt.create({
        data: {
          purchaseOrderId: id,
          actorId: u.id,
          requestKey: dto.requestKey,
          note: dto.note,
          items: { create: receiptItems },
        },
        include: { items: true },
      });
      const status = po.items.every((i) => i.receivedQuantity.eq(i.quantity))
        ? 'RECEIVED'
        : 'PARTIALLY_RECEIVED';
      await tx.purchaseOrder.update({ where: { id }, data: { status } });
      await this.event(
        tx,
        u,
        po.operation.projectId,
        'PURCHASE_RECEIVED',
        `${po.number}: teslimat kaydedildi.`,
        JSON.stringify(dto.items),
      );
      return receipt;
    });
  }
  async dashboard(u: AuthenticatedUser) {
    const [customers, suppliers, projects, operations, pendingOrders, totals, events] =
      await Promise.all([
        this.db.customer.count({ where: { companyId: u.companyId, isActive: true } }),
        this.db.supplier.count({ where: { companyId: u.companyId, isActive: true } }),
        this.db.project.count({ where: { companyId: u.companyId } }),
        this.db.projectOperation.count({
          where: { project: { companyId: u.companyId }, status: { not: 'COMPLETED' } },
        }),
        this.db.purchaseOrder.count({ where: { companyId: u.companyId, status: 'SUBMITTED' } }),
        this.db.purchaseOrder.groupBy({
          by: ['currency'],
          where: { companyId: u.companyId, status: { not: 'CANCELLED' } },
          _sum: { total: true },
        }),
        this.db.timelineEvent.findMany({
          where: { project: { companyId: u.companyId } },
          include: { project: { select: { id: true, name: true } } },
          orderBy: { occurredAt: 'desc' },
          take: 12,
        }),
      ]);
    return { customers, suppliers, projects, operations, pendingOrders, totals, events };
  }
}
