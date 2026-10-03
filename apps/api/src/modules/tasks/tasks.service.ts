import { BadRequestException, Injectable, NotFoundException } from '@nestjs/common';
import { Prisma } from '@prisma/client';
import { safeUserSelect } from '../../common/selectors/safe-user.select';
import { AuthenticatedUser } from '../../common/interfaces/authenticated-user.interface';
import { PrismaService } from '../../database/prisma.service';
import { UpdateTaskDto } from './dto/update-task.dto';

@Injectable()
export class TasksService {
  constructor(private readonly prisma: PrismaService) {}

  findAll(companyId: string) {
    return this.prisma.task.findMany({
      where: { project: { companyId } },
      orderBy: { createdAt: 'desc' },
      include: {
        project: true,
        assignee: {
          select: safeUserSelect,
        },
      },
    });
  }

  async update(id: string, user: AuthenticatedUser, dto: UpdateTaskDto) {
    const task = await this.prisma.task.findFirst({
      where: { id, project: { companyId: user.companyId } },
      include: { project: true },
    });
    if (!task || !task.projectId) throw new NotFoundException('Görev bulunamadı.');
    if (dto.assigneeId) {
      const assignee = await this.prisma.user.findFirst({
        where: { id: dto.assigneeId, companyId: user.companyId, isActive: true },
      });
      if (!assignee) throw new BadRequestException('Seçilen görev sorumlusu geçerli değil.');
    }
    const data: Prisma.TaskUncheckedUpdateInput = {
      title: dto.title === undefined ? undefined : dto.title.trim(),
      assigneeId: dto.assigneeId,
      dueDate: dto.dueDate === undefined ? undefined : dto.dueDate ? new Date(dto.dueDate) : null,
      priority: dto.priority,
      status: dto.status,
    };
    const record = task as unknown as Record<string, unknown>;
    const comparable = (value: unknown) =>
      value instanceof Date
        ? value.toISOString()
        : value === null || value === undefined
          ? null
          : String(value);
    const changed = Object.entries(data)
      .filter(([, value]) => value !== undefined)
      .some(([key, value]) => comparable(record[key]) !== comparable(value));
    if (!changed) {
      return this.prisma.task.findUniqueOrThrow({
        where: { id },
        include: { assignee: { select: safeUserSelect } },
      });
    }
    const completed = dto.status === 'DONE' && task.status !== 'DONE';
    const reopened = dto.status !== undefined && dto.status !== 'DONE' && task.status === 'DONE';
    const eventType = completed ? 'TASK_COMPLETED' : reopened ? 'TASK_REOPENED' : 'TASK_UPDATED';
    const summary = completed
      ? 'Görev tamamlandı'
      : reopened
        ? 'Görev yeniden açıldı'
        : 'Görev güncellendi';
    return this.prisma.$transaction(async (transaction) => {
      const updated = await transaction.task.update({
        where: { id },
        data,
        include: { assignee: { select: safeUserSelect } },
      });
      await transaction.timelineEvent.create({
        data: {
          projectId: task.projectId,
          actorId: user.id,
          eventType,
          summary,
          details: updated.title,
        },
      });
      return updated;
    });
  }
}
