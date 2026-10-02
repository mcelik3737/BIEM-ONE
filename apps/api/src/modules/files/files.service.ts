import { Injectable } from '@nestjs/common';
import { safeUserSelect } from '../../common/selectors/safe-user.select';
import { PrismaService } from '../../database/prisma.service';

@Injectable()
export class FilesService {
  constructor(private readonly prisma: PrismaService) {}

  findAll(companyId: string) {
    return this.prisma.fileAsset.findMany({
      where: {
        AND: [
          {
            OR: [
              { project: { companyId } },
              { customer: { companyId } },
              { uploadedBy: { companyId } },
            ],
          },
          { OR: [{ projectId: null }, { project: { companyId } }] },
          { OR: [{ customerId: null }, { customer: { companyId } }] },
          { OR: [{ uploadedById: null }, { uploadedBy: { companyId } }] },
        ],
      },
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
