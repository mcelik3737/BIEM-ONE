import { PrismaClient } from '@prisma/client';
import { workflowTemplates } from '../src/modules/projects/workflow-templates';

const prisma = new PrismaClient();

async function main() {
  const projects = await prisma.project.findMany({
    where: { category: { not: null } },
    select: { id: true, category: true },
  });
  let initialized = 0;
  for (const project of projects) {
    if (!project.category) continue;
    const template = workflowTemplates[project.category];
    await prisma.$transaction(
      template.map((item, index) =>
        prisma.projectChecklistItem.upsert({
          where: { projectId_key: { projectId: project.id, key: item.key } },
          update: {
            title: item.title,
            stageCode: item.stageCode,
            category: project.category!,
            sortOrder: index + 1,
            isRequired: item.isRequired,
          },
          create: {
            projectId: project.id,
            key: item.key,
            title: item.title,
            stageCode: item.stageCode,
            category: project.category!,
            sortOrder: index + 1,
            isRequired: item.isRequired,
          },
        }),
      ),
    );
    initialized += 1;
  }
  console.log(`${initialized} kategorili iş için kontrol listeleri hazırlandı.`);
}

main()
  .catch((error) => {
    console.error(error);
    process.exit(1);
  })
  .finally(async () => prisma.$disconnect());
