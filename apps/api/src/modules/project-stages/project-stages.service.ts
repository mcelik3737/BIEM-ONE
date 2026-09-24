import { Injectable } from '@nestjs/common';
import { PrismaService } from '../../database/prisma.service';

@Injectable()
export class ProjectStagesService {
  constructor(private readonly prisma: PrismaService) {}

  findAll() {
    return this.prisma.projectStage.findMany({
      orderBy: { sortOrder: 'asc' },
    });
  }
}
