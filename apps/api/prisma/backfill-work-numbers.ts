import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function main() {
  const projects = await prisma.project.findMany({
    where: { workNumber: null },
    orderBy: [{ createdAt: 'asc' }, { id: 'asc' }],
    select: { id: true, createdAt: true },
  });

  for (const project of projects) {
    const year = project.createdAt.getUTCFullYear();
    const prefix = `IS-${year}-`;
    const latest = await prisma.project.findFirst({
      where: { workNumber: { startsWith: prefix } },
      orderBy: { workNumber: 'desc' },
      select: { workNumber: true },
    });
    const sequence = latest?.workNumber ? Number(latest.workNumber.slice(prefix.length)) + 1 : 1;
    await prisma.project.update({
      where: { id: project.id },
      data: { workNumber: `${prefix}${sequence.toString().padStart(4, '0')}` },
    });
  }

  console.log(`${projects.length} iş kaydına iş numarası atandı.`);
}

main()
  .catch((error) => {
    console.error(error);
    process.exit(1);
  })
  .finally(async () => prisma.$disconnect());
