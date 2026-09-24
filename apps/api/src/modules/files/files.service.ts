import { Injectable } from '@nestjs/common';
import { safeUserSelect } from '../../common/selectors/safe-user.select';
import { PrismaService } from '../../database/prisma.service';

@Injectable()
export class FilesService {
  constructor(private readonly prisma: PrismaService) {}

  findAll() {
    return this.prisma.fileAsset.findMany({
      orderBy: { createdAt: 'desc' },
      include: {
        project: true,
        customer: true,
        uploadedBy: {
          select: safeUserSelect,
        },
      },
    });
  }
}
