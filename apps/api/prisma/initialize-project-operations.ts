import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function main() {
  const projects = await prisma.project.findMany({
    where: { stage: { code: 'KAZANILDI' }, operation: null },
    select: { id: true, ownerId: true },
  });

  for (const project of projects) {
    await prisma.$transaction(async (transaction) => {
      const existing = await transaction.projectOperation.findUnique({
        where: { projectId: project.id },
      });
      if (existing) return;
      await transaction.projectOperation.create({
        data: {
          projectId: project.id,
          operationManagerId: project.ownerId,
        },
      });
      await transaction.timelineEvent.create({
        data: {
          projectId: project.id,
          eventType: 'OPERATION_CREATED',
          summary: 'Proje operasyonu başlatıldı',
          details: 'Operasyon aşaması: Hazırlık',
        },
      });
    });
  }

  console.log(`${projects.length} kazanılmış iş için operasyon kaydı hazırlandı.`);
}

main()
  .catch((error) => {
    console.error(error);
    process.exit(1);
  })
  .finally(async () => prisma.$disconnect());
