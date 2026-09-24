import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { PrismaModule } from './database/prisma.module';
import { HealthController } from './health/health.controller';
import { AuditLogsModule } from './modules/audit-logs/audit-logs.module';
import { AuthModule } from './modules/auth/auth.module';
import { ContactsModule } from './modules/contacts/contacts.module';
import { CustomersModule } from './modules/customers/customers.module';
import { FilesModule } from './modules/files/files.module';
import { NotificationsModule } from './modules/notifications/notifications.module';
import { PermissionsModule } from './modules/permissions/permissions.module';
import { ProjectStagesModule } from './modules/project-stages/project-stages.module';
import { ProjectsModule } from './modules/projects/projects.module';
import { RolesModule } from './modules/roles/roles.module';
import { TasksModule } from './modules/tasks/tasks.module';
import { TimelineEventsModule } from './modules/timeline-events/timeline-events.module';
import { UsersModule } from './modules/users/users.module';

@Module({
  imports: [
    ConfigModule.forRoot({
      isGlobal: true,
      cache: true,
    }),
    PrismaModule,
    AuthModule,
    UsersModule,
    RolesModule,
    PermissionsModule,
    CustomersModule,
    ContactsModule,
    ProjectsModule,
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
