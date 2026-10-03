import { BadRequestException, Injectable, NotFoundException } from '@nestjs/common';
import { Prisma, ProcurementStatus, PurchaseOrderStatus } from '@prisma/client';
import { AuthenticatedUser } from '../../common/interfaces/authenticated-user.interface';
import { safeUserSelect } from '../../common/selectors/safe-user.select';
import { PrismaService } from '../../database/prisma.service';
import {
  CreateBomItemDto,
  CreatePurchaseOrderDto,
  CreateSupplierDto,
  PurchaseOrderItemInputDto,
  ReceivePurchaseItemDto,
  UpdateBomItemDto,
  UpdatePurchaseOrderDto,
  UpdateSupplierDto,
} from './dto/procurement.dto';

const orderInclude = {
  supplier: true,
  createdBy: { select: safeUserSelect },
  approvedBy: { select: safeUserSelect },
  items: { include: { bomItem: true }, orderBy: { createdAt: 'asc' as const } },
} satisfies Prisma.PurchaseOrderInclude;

const editableStatuses: PurchaseOrderStatus[] = ['TASLAK', 'ONAY_BEKLIYOR'];
const statusTransitions: Record<PurchaseOrderStatus, PurchaseOrderStatus[]> = {
  TASLAK: ['ONAY_BEKLIYOR', 'IPTAL'],
  ONAY_BEKLIYOR: ['TASLAK', 'IPTAL'],
  ONAYLANDI: ['SIPARIS_VERILDI', 'IPTAL'],
  SIPARIS_VERILDI: ['IPTAL'],
  KISMI_TESLIM: ['IPTAL'],
  TESLIM_ALINDI: [],
  IPTAL: [],
};

@Injectable()
export class ProcurementService {
  constructor(private readonly prisma: PrismaService) {}

  async listBom(projectId: string, companyId: string) {
    const operation = await this.requireOperation(projectId, companyId);
    const items = await this.prisma.bomItem.findMany({
      where: { projectOperationId: operation.id },
      include: { _count: { select: { purchaseOrderItems: true } } },
      orderBy: [{ sortOrder: 'asc' }, { createdAt: 'asc' }],
    });
    return { items, totals: this.currencyTotals(items, 'estimatedTotalCost') };
  }

  async createBom(projectId: string, user: AuthenticatedUser, dto: CreateBomItemDto) {
    const operation = await this.requireOperation(projectId, user.companyId);
    const quantity = new Prisma.Decimal(dto.quantity);
    const unitCost = new Prisma.Decimal(dto.estimatedUnitCost);
    const item = await this.prisma.$transaction(async (tx) => {
      const created = await tx.bomItem.create({
        data: {
          projectOperationId: operation.id,
          itemType: dto.itemType,
          stockCode: this.clean(dto.stockCode),
          description: dto.description.trim(),
          brand: this.clean(dto.brand),
          model: this.clean(dto.model),
          quantity,
          unit: dto.unit.trim(),
          currency: dto.currency.toUpperCase(),
          estimatedUnitCost: unitCost,
          estimatedTotalCost: quantity
            .mul(unitCost)
            .toDecimalPlaces(2, Prisma.Decimal.ROUND_HALF_UP),
          requiredAt: dto.requiredAt ? new Date(dto.requiredAt) : null,
          procurementStatus: dto.procurementStatus,
          technicalNote: this.clean(dto.technicalNote),
          sortOrder: dto.sortOrder ?? 0,
        },
      });
      await this.timeline(
        tx,
        projectId,
        user.id,
        'BOM_ITEM_CREATED',
        'BOM kalemi eklendi',
        created.description,
      );
      return created;
    });
    return item;
  }

  async updateBom(
    projectId: string,
    itemId: string,
    user: AuthenticatedUser,
    dto: UpdateBomItemDto,
  ) {
    const item = await this.requireBom(projectId, itemId, user.companyId);
    const quantity = dto.quantity === undefined ? item.quantity : new Prisma.Decimal(dto.quantity);
    const unitCost =
      dto.estimatedUnitCost === undefined
        ? item.estimatedUnitCost
        : new Prisma.Decimal(dto.estimatedUnitCost);
    return this.prisma.$transaction(async (tx) => {
      const updated = await tx.bomItem.update({
        where: { id: item.id },
        data: {
          itemType: dto.itemType,
          stockCode: dto.stockCode === undefined ? undefined : this.clean(dto.stockCode),
          description: dto.description?.trim(),
          brand: dto.brand === undefined ? undefined : this.clean(dto.brand),
          model: dto.model === undefined ? undefined : this.clean(dto.model),
          quantity,
          unit: dto.unit?.trim(),
          currency: dto.currency?.toUpperCase(),
          estimatedUnitCost: unitCost,
          estimatedTotalCost: quantity
            .mul(unitCost)
            .toDecimalPlaces(2, Prisma.Decimal.ROUND_HALF_UP),
          requiredAt:
            dto.requiredAt === undefined
              ? undefined
              : dto.requiredAt
                ? new Date(dto.requiredAt)
                : null,
          procurementStatus: dto.procurementStatus,
          technicalNote:
            dto.technicalNote === undefined ? undefined : this.clean(dto.technicalNote),
          sortOrder: dto.sortOrder,
        },
      });
      await this.timeline(
        tx,
        projectId,
        user.id,
        'BOM_ITEM_UPDATED',
        'BOM kalemi güncellendi',
        updated.description,
      );
      return updated;
    });
  }

  async removeBom(projectId: string, itemId: string, user: AuthenticatedUser) {
    const item = await this.requireBom(projectId, itemId, user.companyId);
    const linked = await this.prisma.purchaseOrderItem.count({ where: { bomItemId: item.id } });
    if (linked) throw new BadRequestException('Siparişe bağlı BOM kalemi silinemez.');
    await this.prisma.$transaction(async (tx) => {
      await tx.bomItem.delete({ where: { id: item.id } });
      await this.timeline(
        tx,
        projectId,
        user.id,
        'BOM_ITEM_REMOVED',
        'BOM kalemi kaldırıldı',
        item.description,
      );
    });
    return { removed: true };
  }

  listSuppliers(companyId: string) {
    return this.prisma.supplier.findMany({
      where: { companyId },
      orderBy: [{ isActive: 'desc' }, { name: 'asc' }],
    });
  }

  createSupplier(companyId: string, dto: CreateSupplierDto) {
    return this.prisma.supplier.create({
      data: { companyId, ...this.supplierData(dto), name: dto.name.trim() },
    });
  }

  async updateSupplier(id: string, companyId: string, dto: UpdateSupplierDto) {
    await this.requireSupplier(id, companyId, false);
    return this.prisma.supplier.update({
      where: { id },
      data: { ...this.supplierData(dto), isActive: dto.isActive },
    });
  }

  async setSupplierActive(id: string, companyId: string, isActive: boolean) {
    await this.requireSupplier(id, companyId, false);
    return this.prisma.supplier.update({ where: { id }, data: { isActive } });
  }

  async listOrders(projectId: string, companyId: string) {
    const operation = await this.requireOperation(projectId, companyId);
    return this.prisma.purchaseOrder.findMany({
      where: { projectOperationId: operation.id, projectOperation: { project: { companyId } } },
      include: orderInclude,
      orderBy: { createdAt: 'desc' },
    });
  }

  async getOrder(projectId: string, orderId: string, companyId: string) {
    return this.requireOrder(projectId, orderId, companyId);
  }

  async createOrder(projectId: string, user: AuthenticatedUser, dto: CreatePurchaseOrderDto) {
    const operation = await this.requireOperation(projectId, user.companyId);
    await this.requireSupplier(dto.supplierId, user.companyId, true);
    await this.validateBomLinks(operation.id, dto.items, dto.currency);
    const totals = this.orderTotals(dto.items);
    const year = (dto.orderDate ? new Date(dto.orderDate) : new Date()).getFullYear();
    const created = await this.prisma.$transaction(async (tx) => {
      const counter = await tx.purchaseOrderCounter.upsert({
        where: { companyId_year: { companyId: user.companyId, year } },
        create: { companyId: user.companyId, year, lastValue: 1 },
        update: { lastValue: { increment: 1 } },
      });
      const order = await tx.purchaseOrder.create({
        data: {
          companyId: user.companyId,
          orderNumber: `SA-${year}-${String(counter.lastValue).padStart(4, '0')}`,
          projectOperationId: operation.id,
          supplierId: dto.supplierId,
          orderDate: dto.orderDate ? new Date(dto.orderDate) : new Date(),
          expectedDeliveryAt: dto.expectedDeliveryAt ? new Date(dto.expectedDeliveryAt) : null,
          currency: dto.currency.toUpperCase(),
          subtotal: totals.subtotal,
          taxTotal: totals.taxTotal,
          grandTotal: totals.grandTotal,
          notes: this.clean(dto.notes),
          createdById: user.id,
          items: { create: this.orderItemData(dto.items) },
        },
        include: orderInclude,
      });
      await this.timeline(
        tx,
        projectId,
        user.id,
        'PURCHASE_ORDER_CREATED',
        'Satınalma siparişi oluşturuldu',
        order.orderNumber,
      );
      return order;
    });
    return created;
  }

  async updateOrder(
    projectId: string,
    orderId: string,
    user: AuthenticatedUser,
    dto: UpdatePurchaseOrderDto,
  ) {
    return this.prisma.$transaction(async (tx) => {
      await tx.$queryRaw`SELECT id FROM "PurchaseOrder" WHERE id = ${orderId} AND "companyId" = ${user.companyId} FOR UPDATE`;
      const order = await this.requireOrder(projectId, orderId, user.companyId, tx);
      if (!editableStatuses.includes(order.status))
        throw new BadRequestException('Bu durumdaki sipariş düzenlenemez.');
      if (dto.supplierId) await this.requireSupplier(dto.supplierId, user.companyId, true);
      if (dto.items || dto.currency)
        await this.validateBomLinks(
          order.projectOperationId,
          dto.items ?? order.items,
          dto.currency ?? order.currency,
        );
      const totals = dto.items ? this.orderTotals(dto.items) : null;

      if (dto.items) {
        await tx.purchaseOrderItem.deleteMany({ where: { purchaseOrderId: order.id } });
      }
      const updated = await tx.purchaseOrder.update({
        where: { id: order.id },
        data: {
          supplierId: dto.supplierId,
          orderDate: dto.orderDate ? new Date(dto.orderDate) : undefined,
          expectedDeliveryAt:
            dto.expectedDeliveryAt === undefined
              ? undefined
              : dto.expectedDeliveryAt
                ? new Date(dto.expectedDeliveryAt)
                : null,
          currency: dto.currency?.toUpperCase(),
          notes: dto.notes === undefined ? undefined : this.clean(dto.notes),
          subtotal: totals?.subtotal,
          taxTotal: totals?.taxTotal,
          grandTotal: totals?.grandTotal,
          items: dto.items ? { create: this.orderItemData(dto.items) } : undefined,
        },
        include: orderInclude,
      });
      await this.timeline(
        tx,
        projectId,
        user.id,
        'PURCHASE_ORDER_UPDATED',
        'Satınalma siparişi güncellendi',
        order.orderNumber,
      );
      return updated;
    });
  }

  async changeOrderStatus(
    projectId: string,
    orderId: string,
    user: AuthenticatedUser,
    status: PurchaseOrderStatus,
  ) {
    return this.prisma.$transaction(async (tx) => {
      await tx.$queryRaw`SELECT id FROM "PurchaseOrder" WHERE id = ${orderId} AND "companyId" = ${user.companyId} FOR UPDATE`;
      const order = await this.requireOrder(projectId, orderId, user.companyId, tx);
      if (status === 'ONAYLANDI')
        throw new BadRequestException('Sipariş yalnızca onay endpointi ile onaylanabilir.');
      if (!statusTransitions[order.status].includes(status))
        throw new BadRequestException(`${order.status} durumundan ${status} durumuna geçilemez.`);

      const updated = await tx.purchaseOrder.update({
        where: { id: order.id },
        data: { status },
        include: orderInclude,
      });
      await this.syncBomStatuses(tx, updated);
      await this.timeline(
        tx,
        projectId,
        user.id,
        'PURCHASE_ORDER_STATUS_CHANGED',
        'Satınalma siparişi durumu değişti',
        `${order.orderNumber}: ${order.status} → ${status}`,
      );
      return updated;
    });
  }

  async approveOrder(projectId: string, orderId: string, user: AuthenticatedUser) {
    return this.prisma.$transaction(async (tx) => {
      await tx.$queryRaw`SELECT id FROM "PurchaseOrder" WHERE id = ${orderId} AND "companyId" = ${user.companyId} FOR UPDATE`;
      const order = await this.requireOrder(projectId, orderId, user.companyId, tx);
      if (order.status !== 'ONAY_BEKLIYOR')
        throw new BadRequestException('Yalnızca onay bekleyen sipariş onaylanabilir.');

      const updated = await tx.purchaseOrder.update({
        where: { id: order.id },
        data: { status: 'ONAYLANDI', approvedById: user.id, approvedAt: new Date() },
        include: orderInclude,
      });
      await this.timeline(
        tx,
        projectId,
        user.id,
        'PURCHASE_ORDER_APPROVED',
        'Satınalma siparişi onaylandı',
        order.orderNumber,
      );
      return updated;
    });
  }

  async receiveItem(
    projectId: string,
    orderId: string,
    user: AuthenticatedUser,
    dto: ReceivePurchaseItemDto,
  ) {
    return this.prisma.$transaction(async (tx) => {
      await tx.$queryRaw`SELECT id FROM "PurchaseOrder" WHERE id = ${orderId} AND "companyId" = ${user.companyId} FOR UPDATE`;
      const order = await this.requireOrder(projectId, orderId, user.companyId, tx);
      if (!['SIPARIS_VERILDI', 'KISMI_TESLIM'].includes(order.status))
        throw new BadRequestException('Teslimat yalnızca verilmiş siparişlere kaydedilebilir.');
      const item = order.items.find((value) => value.id === dto.itemId);
      if (!item) throw new NotFoundException('Sipariş kalemi bulunamadı.');
      const next = item.receivedQuantity.add(dto.quantity);
      if (next.gt(item.quantity))
        throw new BadRequestException('Teslim alınan miktar sipariş miktarını aşamaz.');

      await tx.purchaseOrderItem.update({
        where: { id: item.id },
        data: { receivedQuantity: next },
      });
      const allItems = order.items.map((value) =>
        value.id === item.id ? { ...value, receivedQuantity: next } : value,
      );
      const complete = allItems.every((value) => value.receivedQuantity.gte(value.quantity));
      const status: PurchaseOrderStatus = complete ? 'TESLIM_ALINDI' : 'KISMI_TESLIM';
      const updated = await tx.purchaseOrder.update({
        where: { id: order.id },
        data: { status },
        include: orderInclude,
      });
      await this.syncBomStatuses(tx, updated);
      await this.timeline(
        tx,
        projectId,
        user.id,
        'PURCHASE_ITEM_RECEIVED',
        complete ? 'Sipariş teslim alındı' : 'Kısmi teslimat kaydedildi',
        `${order.orderNumber} Â· ${item.description}: ${dto.quantity} ${item.unit}`,
      );
      return updated;
    });
  }

  private async requireOperation(projectId: string, companyId: string) {
    const operation = await this.prisma.projectOperation.findFirst({
      where: { projectId, project: { companyId, stage: { code: 'KAZANILDI' } } },
    });
    if (!operation) throw new NotFoundException('Kazanılmış işe ait operasyon bulunamadı.');
    return operation;
  }

  private async requireBom(projectId: string, itemId: string, companyId: string) {
    const item = await this.prisma.bomItem.findFirst({
      where: { id: itemId, projectOperation: { projectId, project: { companyId } } },
    });
    if (!item) throw new NotFoundException('BOM kalemi bulunamadı.');
    return item;
  }

  private async requireSupplier(id: string, companyId: string, active: boolean) {
    const supplier = await this.prisma.supplier.findFirst({
      where: { id, companyId, ...(active ? { isActive: true } : {}) },
    });
    if (!supplier) throw new NotFoundException('Tedarikçi bulunamadı.');
    return supplier;
  }

  private async requireOrder(
    projectId: string,
    orderId: string,
    companyId: string,
    db: Prisma.TransactionClient = this.prisma,
  ) {
    const order = await db.purchaseOrder.findFirst({
      where: { id: orderId, companyId, projectOperation: { projectId, project: { companyId } } },
      include: orderInclude,
    });
    if (!order) throw new NotFoundException('Satınalma siparişi bulunamadı.');
    return order;
  }

  private async validateBomLinks(
    operationId: string,
    items: { bomItemId?: string | null; unit: string }[],
    currency: string,
  ) {
    const ids = [...new Set(items.flatMap((item) => (item.bomItemId ? [item.bomItemId] : [])))];
    const linked = await this.prisma.bomItem.findMany({
      where: { id: { in: ids }, projectOperationId: operationId },
    });
    if (linked.length !== ids.length)
      throw new BadRequestException('BOM kalemleri aynı proje operasyonuna ait olmalıdır.');
    for (const item of items) {
      const bom = linked.find((value) => value.id === item.bomItemId);
      if (bom && (bom.currency !== currency || bom.unit !== item.unit.trim()))
        throw new BadRequestException(
          'Sipariş para birimi ve kalem birimi bağlı BOM ile aynı olmalıdır.',
        );
    }
  }

  private orderTotals(items: PurchaseOrderItemInputDto[]) {
    let subtotal = new Prisma.Decimal(0);
    let taxTotal = new Prisma.Decimal(0);
    for (const item of items) {
      const line = new Prisma.Decimal(item.quantity)
        .mul(item.unitPrice)
        .toDecimalPlaces(2, Prisma.Decimal.ROUND_HALF_UP);
      subtotal = subtotal.add(line);
      taxTotal = taxTotal.add(
        line.mul(item.taxRate).div(100).toDecimalPlaces(2, Prisma.Decimal.ROUND_HALF_UP),
      );
    }
    return {
      subtotal: subtotal.toDecimalPlaces(2, Prisma.Decimal.ROUND_HALF_UP),
      taxTotal: taxTotal.toDecimalPlaces(2, Prisma.Decimal.ROUND_HALF_UP),
      grandTotal: subtotal.add(taxTotal).toDecimalPlaces(2, Prisma.Decimal.ROUND_HALF_UP),
    };
  }

  private orderItemData(items: PurchaseOrderItemInputDto[]) {
    return items.map((item) => ({
      bomItemId: item.bomItemId,
      description: item.description.trim(),
      quantity: new Prisma.Decimal(item.quantity),
      unit: item.unit.trim(),
      unitPrice: new Prisma.Decimal(item.unitPrice),
      taxRate: new Prisma.Decimal(item.taxRate),
      lineTotal: new Prisma.Decimal(item.quantity)
        .mul(item.unitPrice)
        .toDecimalPlaces(2, Prisma.Decimal.ROUND_HALF_UP),
    }));
  }

  private async syncBomStatuses(
    tx: Prisma.TransactionClient,
    order: Prisma.PurchaseOrderGetPayload<{ include: typeof orderInclude }>,
  ) {
    const ids = [
      ...new Set(order.items.flatMap((item) => (item.bomItemId ? [item.bomItemId] : []))),
    ];
    for (const id of ids.sort()) {
      await tx.$queryRaw`SELECT id FROM "BomItem" WHERE id = ${id} FOR UPDATE`;
      const bom = await tx.bomItem.findUniqueOrThrow({
        where: { id },
        include: { purchaseOrderItems: { include: { purchaseOrder: true } } },
      });
      const received = bom.purchaseOrderItems.reduce(
        (sum, item) => sum.add(item.receivedQuantity),
        new Prisma.Decimal(0),
      );
      const hasOrdered = bom.purchaseOrderItems.some((item) =>
        ['SIPARIS_VERILDI', 'KISMI_TESLIM', 'TESLIM_ALINDI'].includes(item.purchaseOrder.status),
      );
      const procurementStatus: ProcurementStatus = received.gte(bom.quantity)
        ? 'TESLIM_ALINDI'
        : received.gt(0)
          ? 'KISMI_TESLIM'
          : hasOrdered
            ? 'SIPARIS_VERILDI'
            : 'PLANLANDI';
      await tx.bomItem.update({ where: { id }, data: { procurementStatus } });
    }
  }

  private currencyTotals<T extends { currency: string }>(items: T[], key: keyof T) {
    const totals: Record<string, Prisma.Decimal> = {};
    for (const item of items)
      totals[item.currency] = (totals[item.currency] ?? new Prisma.Decimal(0)).add(
        item[key] as Prisma.Decimal,
      );
    return Object.fromEntries(
      Object.entries(totals).map(([currency, total]) => [currency, total.toFixed(2)]),
    );
  }

  private supplierData(dto: Partial<CreateSupplierDto>) {
    return {
      name: dto.name?.trim(),
      contactName: this.clean(dto.contactName),
      phone: this.clean(dto.phone),
      email: this.clean(dto.email),
      taxOffice: this.clean(dto.taxOffice),
      taxNumber: this.clean(dto.taxNumber),
      address: this.clean(dto.address),
      notes: this.clean(dto.notes),
    };
  }

  private clean(value?: string | null) {
    if (value === undefined) return undefined;
    const result = value?.trim();
    return result || null;
  }
  private timeline(
    tx: Prisma.TransactionClient,
    projectId: string,
    actorId: string,
    eventType: string,
    summary: string,
    details?: string | null,
  ) {
    return tx.timelineEvent.create({ data: { projectId, actorId, eventType, summary, details } });
  }
}
