import {
  BadRequestException,
  ConflictException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { Prisma } from '@prisma/client';
import { AuthenticatedUser } from '../../common/interfaces/authenticated-user.interface';
import { PrismaService } from '../../database/prisma.service';
import {
  CompensationDto,
  EmployeeDocumentDto,
  EmployeeDto,
  EmployeeTimeDto,
} from './personnel.dto';

const documentSelect = {
  id: true,
  employeeId: true,
  title: true,
  isRequired: true,
  expiryRequired: true,
  issuedAt: true,
  expiresAt: true,
  notes: true,
  fileName: true,
  mimeType: true,
  reviewedAt: true,
  reviewedById: true,
  updatedAt: true,
} satisfies Prisma.EmployeeDocumentSelect;
type DocumentRecord = Prisma.EmployeeDocumentGetPayload<{ select: typeof documentSelect }>;
export interface PersonnelUpload {
  originalname: string;
  mimetype: string;
  buffer: Buffer;
  size: number;
}
const day = (value: string) => new Date(`${value}T00:00:00.000Z`);
const today = () =>
  day(
    new Intl.DateTimeFormat('en-CA', {
      timeZone: 'Europe/Istanbul',
      year: 'numeric',
      month: '2-digit',
      day: '2-digit',
    }).format(new Date()),
  );
const clean = (value?: string | null) => value?.trim() || null;

@Injectable()
export class PersonnelService {
  constructor(private readonly db: PrismaService) {}

  private documentStatus(document: DocumentRecord) {
    const current = today().getTime();
    const daysLeft = document.expiresAt
      ? Math.ceil((document.expiresAt.getTime() - current) / 86400000)
      : null;
    const status = !document.fileName
      ? 'MISSING'
      : document.expiryRequired && !document.expiresAt
        ? 'MISSING_DATE'
        : daysLeft !== null && daysLeft < 0
          ? 'EXPIRED'
          : document.issuedAt && document.issuedAt.getTime() > current
            ? 'NOT_YET_VALID'
            : !document.reviewedAt
              ? 'PENDING_REVIEW'
              : daysLeft !== null && daysLeft <= 30
                ? 'EXPIRING'
                : 'CURRENT';
    return { ...document, hasFile: !!document.fileName, status, daysLeft };
  }
  private async employee(id: string, companyId: string, tx: Prisma.TransactionClient = this.db) {
    const record = await tx.employee.findFirst({ where: { id, companyId } });
    if (!record) throw new NotFoundException('Personel bulunamadı.');
    return record;
  }
  private async locked<T>(
    id: string,
    user: AuthenticatedUser,
    work: (tx: Prisma.TransactionClient) => Promise<T>,
  ) {
    try {
      return await this.db.$transaction(async (tx) => {
        await tx.$queryRaw`SELECT id FROM "Employee" WHERE id = ${id} AND "companyId" = ${user.companyId} FOR UPDATE`;
        await this.employee(id, user.companyId, tx);
        return work(tx);
      });
    } catch (error) {
      if (error instanceof Prisma.PrismaClientKnownRequestError && error.code === 'P2002') {
        throw new ConflictException(
          'Bu kullanıcı zaten bir personele bağlı veya aynı tarihli ücret dönemi mevcut.',
        );
      }
      throw error;
    }
  }
  private audit(tx: Prisma.TransactionClient, user: AuthenticatedUser, id: string, action: string) {
    // The general audit feed must never expose salary, document contents or medical details.
    return tx.auditLog.create({
      data: { userId: user.id, entityType: 'Personnel', entityId: id, action },
    });
  }
  async options(companyId: string) {
    const [users, projects] = await Promise.all([
      this.db.user.findMany({
        where: { companyId, isActive: true },
        select: { id: true, fullName: true, email: true },
        orderBy: { fullName: 'asc' },
      }),
      this.db.project.findMany({
        where: { companyId },
        select: { id: true, name: true, workNumber: true },
        orderBy: { name: 'asc' },
      }),
    ]);
    return { users, projects };
  }
  async list(companyId: string) {
    const people = await this.db.employee.findMany({
      where: { companyId },
      orderBy: { fullName: 'asc' },
      include: { documents: { select: documentSelect } },
    });
    return people.map(({ documents, ...person }) => {
      const required = documents.filter((d) => d.isRequired).map((d) => this.documentStatus(d));
      return {
        ...person,
        requiredDocuments: required.length,
        missingDocuments: required.filter((d) => !['CURRENT', 'EXPIRING'].includes(d.status))
          .length,
        expiringDocuments: required.filter((d) => d.status === 'EXPIRING').length,
      };
    });
  }
  async detail(id: string, companyId: string) {
    const person = await this.employee(id, companyId);
    const [compensations, documents] = await Promise.all([
      this.db.employeeCompensation.findMany({
        where: { employeeId: id },
        orderBy: { effectiveFrom: 'desc' },
      }),
      this.db.employeeDocument.findMany({
        where: { employeeId: id },
        select: documentSelect,
        orderBy: { title: 'asc' },
      }),
    ]);
    return {
      ...person,
      compensations: compensations.map((c) => ({
        ...c,
        hourlyCost: c.monthlyEmployerCost.div(c.monthlyHours).toFixed(6),
      })),
      documents: documents.map((d) => this.documentStatus(d)),
    };
  }
  private async profileData(
    dto: EmployeeDto,
    companyId: string,
    tx: Prisma.TransactionClient = this.db,
  ) {
    if (dto.endDate && dto.endDate < dto.startDate)
      throw new BadRequestException('İşten ayrılma tarihi başlangıçtan önce olamaz.');
    if (
      dto.userId &&
      !(await tx.user.findFirst({ where: { id: dto.userId, companyId, isActive: true } }))
    )
      throw new BadRequestException('Bağlanacak kullanıcı bu şirkette aktif olmalıdır.');
    return {
      fullName: dto.fullName,
      jobTitle: dto.jobTitle,
      jobDescription: clean(dto.jobDescription),
      department: clean(dto.department),
      email: clean(dto.email),
      phone: clean(dto.phone),
      userId: clean(dto.userId),
      startDate: day(dto.startDate),
      endDate: dto.endDate ? day(dto.endDate) : null,
      isActive: dto.isActive,
    };
  }
  async create(user: AuthenticatedUser, dto: EmployeeDto) {
    const data = await this.profileData(dto, user.companyId);
    try {
      return await this.db.$transaction(async (tx) => {
        const person = await tx.employee.create({ data: { ...data, companyId: user.companyId } });
        await this.audit(tx, user, person.id, 'PERSONNEL_CREATED');
        return person;
      });
    } catch (error) {
      if (error instanceof Prisma.PrismaClientKnownRequestError && error.code === 'P2002')
        throw new ConflictException('Kullanıcı zaten bir personele bağlı.');
      throw error;
    }
  }
  async update(id: string, user: AuthenticatedUser, dto: EmployeeDto) {
    return this.locked(id, user, async (tx) => {
      const data = await this.profileData(dto, user.companyId, tx);
      const outside = await tx.employeeTimeEntry.findFirst({
        where: {
          employeeId: id,
          status: { not: 'VOID' },
          OR: [
            { workDate: { lt: data.startDate } },
            ...(data.endDate ? [{ workDate: { gt: data.endDate } }] : []),
          ],
        },
      });
      if (outside)
        throw new BadRequestException(
          'Çalışma tarihleri mevcut puantaj kayıtlarını dışarıda bırakamaz.',
        );
      const updated = await tx.employee.update({ where: { id }, data });
      await this.audit(tx, user, id, 'PERSONNEL_UPDATED');
      return updated;
    });
  }
  async compensation(id: string, user: AuthenticatedUser, dto: CompensationDto) {
    if (new Prisma.Decimal(dto.monthlyHours).lte(0) || new Prisma.Decimal(dto.monthlyHours).gt(744))
      throw new BadRequestException('Aylık maliyet kapasitesi 0 ile 744 saat arasında olmalıdır.');
    return this.locked(id, user, async (tx) => {
      const result = await tx.employeeCompensation.create({
        data: { ...dto, effectiveFrom: day(dto.effectiveFrom), employeeId: id },
      });
      await this.audit(tx, user, id, 'PERSONNEL_COMPENSATION_ADDED');
      return result;
    });
  }
  async saveDocument(
    id: string,
    documentId: string | null,
    user: AuthenticatedUser,
    dto: EmployeeDocumentDto,
  ) {
    if (dto.issuedAt && dto.expiresAt && dto.expiresAt < dto.issuedAt)
      throw new BadRequestException('Belge bitişi düzenleme tarihinden önce olamaz.');
    return this.locked(id, user, async (tx) => {
      if (documentId) await this.document(id, documentId, tx);
      const data = {
        ...dto,
        notes: clean(dto.notes),
        issuedAt: dto.issuedAt ? day(dto.issuedAt) : null,
        expiresAt: dto.expiresAt ? day(dto.expiresAt) : null,
        reviewedAt: null,
        reviewedById: null,
      };
      const record = documentId
        ? await tx.employeeDocument.update({
            where: { id: documentId },
            data,
            select: documentSelect,
          })
        : await tx.employeeDocument.create({
            data: { ...data, employeeId: id },
            select: documentSelect,
          });
      await this.audit(tx, user, id, 'PERSONNEL_DOCUMENT_UPDATED');
      return this.documentStatus(record);
    });
  }
  private async document(employeeId: string, id: string, tx: Prisma.TransactionClient = this.db) {
    const document = await tx.employeeDocument.findFirst({
      where: { id, employeeId },
      select: documentSelect,
    });
    if (!document) throw new NotFoundException('Personel belgesi bulunamadı.');
    return document;
  }
  async upload(id: string, documentId: string, user: AuthenticatedUser, file?: PersonnelUpload) {
    if (!file?.size || file.size > 5 * 1024 * 1024)
      throw new BadRequestException('PDF, PNG veya JPEG dosyası en fazla 5 MB olmalıdır.');
    const bytes = file.buffer;
    const mime =
      bytes.subarray(0, 5).toString() === '%PDF-'
        ? 'application/pdf'
        : bytes.subarray(0, 8).equals(Buffer.from([137, 80, 78, 71, 13, 10, 26, 10]))
          ? 'image/png'
          : bytes[0] === 255 && bytes[1] === 216 && bytes[2] === 255
            ? 'image/jpeg'
            : null;
    if (!mime || file.mimetype !== mime)
      throw new BadRequestException('Dosya içeriği PDF, PNG veya JPEG olmalıdır.');
    const ext = mime === 'application/pdf' ? '.pdf' : mime === 'image/png' ? '.png' : '.jpg';
    const fileName =
      file.originalname
        .replace(/[^\p{L}\p{N}_. -]/gu, '_')
        .slice(0, 160)
        .replace(/\.[^.]*$/, '') + ext;
    return this.locked(id, user, async (tx) => {
      await this.document(id, documentId, tx);
      const record = await tx.employeeDocument.update({
        where: { id: documentId },
        data: {
          fileData: Uint8Array.from(bytes),
          fileName,
          mimeType: mime,
          reviewedAt: null,
          reviewedById: null,
        },
        select: documentSelect,
      });
      await this.audit(tx, user, id, 'PERSONNEL_DOCUMENT_UPLOADED');
      return this.documentStatus(record);
    });
  }
  async download(id: string, documentId: string, companyId: string) {
    await this.employee(id, companyId);
    const record = await this.db.employeeDocument.findFirst({
      where: { id: documentId, employeeId: id },
    });
    if (!record?.fileData) throw new NotFoundException('Dosya yüklenmemiş.');
    return record;
  }
  async review(id: string, documentId: string, user: AuthenticatedUser) {
    return this.locked(id, user, async (tx) => {
      const doc = this.documentStatus(await this.document(id, documentId, tx));
      if (['MISSING', 'MISSING_DATE', 'EXPIRED', 'NOT_YET_VALID'].includes(doc.status))
        throw new BadRequestException(
          'Dosya ve geçerlilik tarihleri tamamlanmadan belge onaylanamaz.',
        );
      const result = await tx.employeeDocument.update({
        where: { id: documentId },
        data: { reviewedAt: new Date(), reviewedById: user.id },
        select: documentSelect,
      });
      await this.audit(tx, user, id, 'PERSONNEL_DOCUMENT_REVIEWED');
      return this.documentStatus(result);
    });
  }
  private period(month?: string) {
    const value = month || today().toISOString().slice(0, 7);
    if (!/^\d{4}-(0[1-9]|1[0-2])$/.test(value))
      throw new BadRequestException('Dönem YYYY-AA biçiminde olmalıdır.');
    const start = day(`${value}-01`);
    const end = new Date(start);
    end.setUTCMonth(end.getUTCMonth() + 1);
    return { gte: start, lt: end };
  }
  async times(id: string, companyId: string, month?: string) {
    await this.employee(id, companyId);
    return this.db.employeeTimeEntry.findMany({
      where: { employeeId: id, workDate: this.period(month) },
      include: { project: { select: { id: true, name: true, workNumber: true } } },
      orderBy: [{ workDate: 'desc' }, { createdAt: 'desc' }],
    });
  }
  async addTime(id: string, user: AuthenticatedUser, dto: EmployeeTimeDto) {
    const hours = new Prisma.Decimal(dto.hours),
      multiplier = new Prisma.Decimal(dto.costMultiplier);
    if (hours.lte(0) || hours.gt(24) || multiplier.lte(0) || multiplier.gt(10))
      throw new BadRequestException('Süre 0–24 saat, maliyet katsayısı 0–10 arasında olmalıdır.');
    return this.locked(id, user, async (tx) => {
      const person = await this.employee(id, user.companyId, tx);
      const workDate = day(dto.workDate);
      if (
        !person.isActive ||
        workDate < person.startDate ||
        (person.endDate && workDate > person.endDate)
      )
        throw new BadRequestException('Personel aktif ve tarih istihdam aralığında olmalıdır.');
      if (dto.kind === 'PROJECT' && !dto.projectId)
        throw new BadRequestException('Proje çalışması için iş dosyası seçin.');
      if (dto.kind !== 'PROJECT' && dto.projectId)
        throw new BadRequestException('İdari çalışma ve izin proje maliyetine bağlanamaz.');
      if (
        dto.projectId &&
        !(await tx.project.findFirst({ where: { id: dto.projectId, companyId: user.companyId } }))
      )
        throw new BadRequestException('İş dosyası bu şirkete ait olmalıdır.');
      const daily = await tx.employeeTimeEntry.aggregate({
        where: { employeeId: id, workDate, status: { not: 'VOID' } },
        _sum: { hours: true },
      });
      if ((daily._sum.hours || new Prisma.Decimal(0)).plus(hours).gt(24))
        throw new BadRequestException('Günlük toplam süre 24 saati aşamaz.');
      const entry = await tx.employeeTimeEntry.create({
        data: { ...dto, employeeId: id, projectId: clean(dto.projectId), workDate },
      });
      await this.audit(tx, user, id, 'PERSONNEL_TIME_ADDED');
      return entry;
    });
  }
  async decideTime(id: string, entryId: string, user: AuthenticatedUser, reason?: string) {
    return this.locked(id, user, async (tx) => {
      const entry = await tx.employeeTimeEntry.findFirst({
        where: { id: entryId, employeeId: id },
      });
      if (!entry) throw new NotFoundException('Puantaj kaydı bulunamadı.');
      if (entry.status === 'VOID') throw new BadRequestException('Kayıt zaten iptal edilmiş.');
      if (reason) {
        const result = await tx.employeeTimeEntry.update({
          where: { id: entryId },
          data: { status: 'VOID', voidReason: reason },
        });
        await this.audit(tx, user, id, 'PERSONNEL_TIME_VOIDED');
        return result;
      }
      if (entry.status !== 'DRAFT')
        throw new BadRequestException('Yalnız taslak kayıt onaylanabilir.');
      if (entry.workDate > today())
        throw new BadRequestException('Gelecek tarihli çalışma onaylanamaz.');
      const rate = await tx.employeeCompensation.findFirst({
        where: { employeeId: id, effectiveFrom: { lte: entry.workDate } },
        orderBy: { effectiveFrom: 'desc' },
      });
      if (!rate)
        throw new BadRequestException('Çalışma tarihinde geçerli ücret ve maliyet dönemi girin.');
      const hourlyCost = rate.monthlyEmployerCost.div(rate.monthlyHours);
      const result = await tx.employeeTimeEntry.update({
        where: { id: entryId },
        data: {
          status: 'APPROVED',
          compensationId: rate.id,
          hourlyCost: hourlyCost.toDecimalPlaces(6),
          totalCost: hourlyCost
            .mul(entry.hours)
            .mul(entry.costMultiplier)
            .toDecimalPlaces(2, Prisma.Decimal.ROUND_HALF_UP),
          currency: rate.currency,
          approvedAt: new Date(),
          approvedById: user.id,
        },
      });
      await this.audit(tx, user, id, 'PERSONNEL_TIME_APPROVED');
      return result;
    });
  }
  async costs(companyId: string, month?: string, projectId?: string) {
    if (projectId && !(await this.db.project.findFirst({ where: { id: projectId, companyId } })))
      throw new NotFoundException('İş dosyası bulunamadı.');
    const entries = await this.db.employeeTimeEntry.findMany({
      where: {
        employee: { companyId },
        ...(projectId ? { projectId } : { workDate: this.period(month) }),
        status: { not: 'VOID' },
      },
      include: { project: { select: { name: true } } },
    });
    const rows = new Map<
      string,
      {
        projectId: string | null;
        label: string;
        currency: string;
        hours: Prisma.Decimal;
        cost: Prisma.Decimal;
      }
    >();
    const totals: Record<string, Prisma.Decimal> = {};
    for (const entry of entries) {
      if (entry.status !== 'APPROVED' || entry.totalCost === null || !entry.currency) continue;
      const key = `${entry.projectId || entry.kind}:${entry.currency}`;
      const row = rows.get(key) || {
        projectId: entry.projectId,
        label: entry.project?.name || (entry.kind === 'LEAVE' ? 'İzin' : 'İdari çalışma'),
        currency: entry.currency,
        hours: new Prisma.Decimal(0),
        cost: new Prisma.Decimal(0),
      };
      row.hours = row.hours.plus(entry.hours);
      row.cost = row.cost.plus(entry.totalCost);
      rows.set(key, row);
      totals[entry.currency] = (totals[entry.currency] || new Prisma.Decimal(0)).plus(
        entry.totalCost,
      );
    }
    return {
      pendingCount: entries.filter((e) => e.status === 'DRAFT').length,
      rows: [...rows.values()].map((r) => ({
        ...r,
        hours: r.hours.toFixed(2),
        cost: r.cost.toFixed(2),
      })),
      totals: Object.fromEntries(Object.entries(totals).map(([c, n]) => [c, n.toFixed(2)])),
    };
  }
}
