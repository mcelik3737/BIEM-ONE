import { Injectable } from '@nestjs/common';
import { safeUserSelect } from '../../common/selectors/safe-user.select';
import { PrismaService } from '../../database/prisma.service';

@Injectable()
export class TimelineEventsService {
  constructor(private readonly prisma: PrismaService) {}

  findRecent(companyId: string) {
    return this.prisma.timelineEvent.findMany({
      where: { project: { companyId }, OR: [{ actorId: null }, { actor: { companyId } }] },
      orderBy: { occurredAt: 'desc' },
      take: 100,
      include: {
        project: true,
        actor: {
          select: safeUserSelect,
        },
      },
    });
  }
}
