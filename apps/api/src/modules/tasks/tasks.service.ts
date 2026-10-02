import { Injectable } from '@nestjs/common';
import { safeUserSelect } from '../../common/selectors/safe-user.select';
import { PrismaService } from '../../database/prisma.service';

@Injectable()
export class TasksService {
  constructor(private readonly prisma: PrismaService) {}

  findAll(companyId: string) {
    return this.prisma.task.findMany({
      where: {
        AND: [
          { OR: [{ project: { companyId } }, { projectId: null, assignee: { companyId } }] },
          { OR: [{ assigneeId: null }, { assignee: { companyId } }] },
        ],
      },
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
