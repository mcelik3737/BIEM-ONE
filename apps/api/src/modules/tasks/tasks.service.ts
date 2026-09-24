import { Injectable } from '@nestjs/common';
import { safeUserSelect } from '../../common/selectors/safe-user.select';
import { PrismaService } from '../../database/prisma.service';

@Injectable()
export class TasksService {
  constructor(private readonly prisma: PrismaService) {}

  findAll() {
    return this.prisma.task.findMany({
      orderBy: { createdAt: 'desc' },
      include: {
        project: true,
        assignee: {
          select: safeUserSelect,
        },
      },
    });
  }
}
