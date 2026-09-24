import { Injectable } from '@nestjs/common';
import { safeUserSelect } from '../../common/selectors/safe-user.select';
import { PrismaService } from '../../database/prisma.service';

@Injectable()
export class AuditLogsService {
  constructor(private readonly prisma: PrismaService) {}

  findRecent() {
    return this.prisma.auditLog.findMany({
      orderBy: { createdAt: 'desc' },
      take: 50,
      include: {
        user: {
          select: safeUserSelect,
        },
      },
    });
  }
}
