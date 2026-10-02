import { Injectable } from '@nestjs/common';
import { PrismaService } from '../../database/prisma.service';

@Injectable()
export class ContactsService {
  constructor(private readonly prisma: PrismaService) {}

  findAll(companyId: string) {
    return this.prisma.contact.findMany({
      where: { customer: { companyId } },
      orderBy: { createdAt: 'desc' },
      include: {
        customer: true,
      },
    });
  }
}
