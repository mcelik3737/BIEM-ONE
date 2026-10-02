import { Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../../database/prisma.service';
import { CreateCustomerDto, UpdateCustomerDto } from './dto/customer.dto';

@Injectable()
export class CustomersService {
  constructor(private readonly prisma: PrismaService) {}

  findAll(companyId: string) {
    return this.prisma.customer.findMany({
      where: { companyId },
      orderBy: { createdAt: 'desc' },
      include: {
        contacts: true,
        projects: true,
      },
    });
  }

  create(companyId: string, dto: CreateCustomerDto) {
    return this.prisma.customer.create({
      data: { companyId, ...this.data(dto), name: dto.name.trim() },
    });
  }

  async update(id: string, companyId: string, dto: UpdateCustomerDto) {
    await this.require(id, companyId);
    return this.prisma.customer.update({ where: { id }, data: this.data(dto) });
  }

  async setActive(id: string, companyId: string, isActive: boolean) {
    await this.require(id, companyId);
    return this.prisma.customer.update({ where: { id }, data: { isActive } });
  }

  private async require(id: string, companyId: string) {
    const customer = await this.prisma.customer.findFirst({ where: { id, companyId } });
    if (!customer) throw new NotFoundException('Müşteri bulunamadı.');
    return customer;
  }

  private data(dto: {
    name?: string;
    shortName?: string | null;
    contactName?: string | null;
    phone?: string | null;
    email?: string | null;
    taxOffice?: string | null;
    taxNumber?: string | null;
    address?: string | null;
    notes?: string | null;
  }) {
    const clean = (value?: string | null) =>
      value === undefined ? undefined : value?.trim() || null;
    return {
      name: dto.name?.trim(),
      shortName: clean(dto.shortName),
      contactName: clean(dto.contactName),
      phone: clean(dto.phone),
      email: clean(dto.email),
      taxOffice: clean(dto.taxOffice),
      taxNumber: clean(dto.taxNumber),
      address: clean(dto.address),
      notes: clean(dto.notes),
    };
  }
}
