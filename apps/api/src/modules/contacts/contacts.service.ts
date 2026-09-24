import { Injectable } from '@nestjs/common';
import { PrismaService } from '../../database/prisma.service';

@Injectable()
export class ContactsService {
  constructor(private readonly prisma: PrismaService) {}

  findAll() {
    return this.prisma.contact.findMany({
      orderBy: { createdAt: 'desc' },
      include: {
        customer: true,
      },
    });
  }
}
