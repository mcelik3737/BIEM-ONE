import { PrismaClient, RoleCode } from '@prisma/client';
import { hash } from 'bcryptjs';

const prisma = new PrismaClient();

const defaultStages = [
  { code: 'YENI_TALEP', name: 'Yeni Talep' },
  { code: 'DEGERLENDIRME', name: 'Değerlendirme' },
  { code: 'COZUM_KESIF', name: 'Çözüm / Keşif' },
  { code: 'TEKLIF_VERILDI', name: 'Teklif Verildi' },
  { code: 'KARAR_BEKLENIYOR', name: 'Karar Bekleniyor' },
  { code: 'KAZANILDI', name: 'Kazanıldı' },
  { code: 'KAYBEDILDI', name: 'Kaybedildi' },
];

const permissions = [
  { code: 'users.read', name: 'Read users' },
  { code: 'customers.read', name: 'Read customers' },
  { code: 'projects.read', name: 'Read projects' },
  { code: 'tasks.read', name: 'Read tasks' },
  { code: 'settings.manage', name: 'Manage settings' },
];

const seedCompanyName = process.env.SEED_COMPANY_NAME ?? 'Biem Teknoloji';
const seedCompanySlug = process.env.SEED_COMPANY_SLUG ?? 'biem-teknoloji';
const seedAdminEmail = process.env.SEED_ADMIN_EMAIL ?? 'admin@biem.one';
const seedAdminFullName = process.env.SEED_ADMIN_FULL_NAME ?? 'BIEM Admin';
const seedAdminPassword = process.env.SEED_ADMIN_PASSWORD;

async function main() {
  if (!seedAdminPassword) {
    throw new Error('SEED_ADMIN_PASSWORD must be set before running prisma db seed');
  }

  const company = await prisma.company.upsert({
    where: { slug: seedCompanySlug },
    update: {},
    create: {
      name: seedCompanyName,
      slug: seedCompanySlug,
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

  const adminPasswordHash = await hash(seedAdminPassword, 10);

  const admin = await prisma.user.upsert({
    where: { email: seedAdminEmail },
    update: {},
    create: {
      email: seedAdminEmail,
      fullName: seedAdminFullName,
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

  for (const [index, stage] of defaultStages.entries()) {
    await prisma.projectStage.upsert({
      where: { code: stage.code },
      update: {
        name: stage.name,
        sortOrder: index + 1,
        isActive: true,
      },
      create: {
        name: stage.name,
        code: stage.code,
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
