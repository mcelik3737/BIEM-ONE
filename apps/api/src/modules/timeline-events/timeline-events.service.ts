import { Injectable } from '@nestjs/common';
import { safeUserSelect } from '../../common/selectors/safe-user.select';
import { PrismaService } from '../../database/prisma.service';

@Injectable()
export class TimelineEventsService {
  constructor(private readonly prisma: PrismaService) {}

  findRecent() {
    return this.prisma.timelineEvent.findMany({
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
