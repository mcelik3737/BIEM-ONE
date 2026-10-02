import { PrismaClient, RoleCode } from '@prisma/client';
import { hash } from 'bcryptjs';
const prisma = new PrismaClient();
async function main() {
  for (const code of Object.values(RoleCode))
    await prisma.role.upsert({ where: { code }, create: { code, name: code }, update: {} });
  const email = process.env.SEED_ADMIN_EMAIL?.trim().toLowerCase();
  if (!email) {
    console.log(
      'Roles ready. Set SEED_ADMIN_EMAIL and SEED_ADMIN_PASSWORD to create the first administrator.',
    );
    return;
  }
  // Reruns never replace an existing password, tenant, role or active state.
  if (await prisma.user.findUnique({ where: { email } })) {
    console.log('Administrator already exists; unchanged.');
    return;
  }
  const password = process.env.SEED_ADMIN_PASSWORD;
  if (!password || password.length < 12)
    throw new Error('SEED_ADMIN_PASSWORD must contain at least 12 characters.');
  const passwordHash = await hash(password, 12);
  await prisma.$transaction(async (tx) => {
    const company = await tx.company.upsert({
      where: { slug: 'biem-teknoloji' },
      create: { name: 'Biem Teknoloji', slug: 'biem-teknoloji' },
      update: {},
    });
    const role = await tx.role.findUniqueOrThrow({ where: { code: 'COMPANY_ADMIN' } });
    await tx.user.create({
      data: {
        email,
        passwordHash,
        companyId: company.id,
        fullName: 'BIEM Yönetici',
        roles: { create: { roleId: role.id } },
      },
    });
  });
  console.log('First company administrator created.');
}
main()
  .catch((e) => {
    console.error(e.message);
    process.exitCode = 1;
  })
  .finally(() => prisma.$disconnect());
