import { BusinessModule } from './modules/business/business.module';
import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { PrismaModule } from './database/prisma.module';
import { HealthController } from './health/health.controller';
import { AuditLogsModule } from './modules/audit-logs/audit-logs.module';
import { AuthModule } from './modules/auth/auth.module';
import { ContactsModule } from './modules/contacts/contacts.module';
import { FilesModule } from './modules/files/files.module';
import { NotificationsModule } from './modules/notifications/notifications.module';
import { PermissionsModule } from './modules/permissions/permissions.module';
import { ProjectStagesModule } from './modules/project-stages/project-stages.module';
import { RolesModule } from './modules/roles/roles.module';
import { TasksModule } from './modules/tasks/tasks.module';
import { TimelineEventsModule } from './modules/timeline-events/timeline-events.module';
import { UsersModule } from './modules/users/users.module';

@Module({
  imports: [
    ConfigModule.forRoot({
      isGlobal: true,
      cache: true,
      validate: (env: Record<string, string>) => {
        for (const key of ['JWT_ACCESS_SECRET', 'JWT_REFRESH_SECRET']) {
          if (!env[key] || env[key].length < 32)
            throw new Error(`${key} en az 32 karakter olmalı.`);
        }
        if (env.JWT_ACCESS_SECRET === env.JWT_REFRESH_SECRET)
          throw new Error('JWT anahtarları farklı olmalı.');
        if (!env.DATABASE_URL) throw new Error('DATABASE_URL gerekli.');
        return env;
      },
    }),
    PrismaModule,
    AuthModule,
    BusinessModule,
    UsersModule,
    RolesModule,
    PermissionsModule,
    ContactsModule,
    ProjectStagesModule,
    TasksModule,
    FilesModule,
    NotificationsModule,
    AuditLogsModule,
    TimelineEventsModule,
  ],
  controllers: [HealthController],
})
export class AppModule {}
