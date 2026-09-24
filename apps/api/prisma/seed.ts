import { PrismaClient, RoleCode } from '@prisma/client';
import { hash } from 'bcryptjs';

const prisma = new PrismaClient();

const defaultStages = [
  'Teklif',
  'Sözleşme',
  'Keşif',
  'RF Tasarım',
  'Satınalma',
  'Kurulum',
  'Test',
  'Kabul',
  'Sözleşmeli Bakım',
  'Bakım',
];

const permissions = [
  { code: 'users.read', name: 'Read users' },
  { code: 'customers.read', name: 'Read customers' },
  { code: 'projects.read', name: 'Read projects' },
  { code: 'tasks.read', name: 'Read tasks' },
  { code: 'settings.manage', name: 'Manage settings' },
];

function toCode(value: string): string {
  return value
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/[^a-zA-Z0-9]+/g, '_')
    .replace(/^_+|_+$/g, '')
    .toUpperCase();
}

async function main() {
  const company = await prisma.company.upsert({
    where: { slug: 'biem-teknoloji' },
    update: { name: 'Biem Teknoloji' },
    create: {
      name: 'Biem Teknoloji',
      slug: 'biem-teknoloji',
    },
  });

  const role = await prisma.role.upsert({
    where: { code: RoleCode.SUPER_ADMIN },
    update: { name: 'Super Admin' },
    create: {
      name: 'Super Admin',
      code: RoleCode.SUPER_ADMIN,
      description: 'Platform-wide administrator',
    },
  });

  for (const permission of permissions) {
    const savedPermission = await prisma.permission.upsert({
      where: { code: permission.code },
      update: permission,
      create: permission,
    });

    await prisma.rolePermission.upsert({
      where: {
        roleId_permissionId: {
          roleId: role.id,
          permissionId: savedPermission.id,
        },
      },
      update: {},
      create: {
        roleId: role.id,
        permissionId: savedPermission.id,
      },
    });
  }

  const adminPasswordHash = await hash('Admin123!', 10);

  const admin = await prisma.user.upsert({
    where: { email: 'admin@biem.one' },
    update: {
      fullName: 'BIEM Admin',
      companyId: company.id,
      passwordHash: adminPasswordHash,
      isActive: true,
    },
    create: {
      email: 'admin@biem.one',
      fullName: 'BIEM Admin',
      companyId: company.id,
      passwordHash: adminPasswordHash,
    },
  });

  await prisma.userRole.upsert({
    where: {
      userId_roleId: {
        userId: admin.id,
        roleId: role.id,
      },
    },
    update: {},
    create: {
      userId: admin.id,
      roleId: role.id,
    },
  });

  for (const [index, stageName] of defaultStages.entries()) {
    await prisma.projectStage.upsert({
      where: { code: toCode(stageName) },
      update: {
        name: stageName,
        sortOrder: index + 1,
        isActive: true,
      },
      create: {
        name: stageName,
        code: toCode(stageName),
        sortOrder: index + 1,
      },
    });
  }

  console.log('Seed completed successfully');
}

main()
  .catch((error) => {
    console.error(error);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
