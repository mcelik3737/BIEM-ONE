import { Body, Controller, Get, Param, Patch, Req, UseGuards } from '@nestjs/common';
import { ApiBearerAuth, ApiOperation, ApiTags } from '@nestjs/swagger';
import { Roles } from '../../common/decorators/roles.decorator';
import { AppRole } from '../../common/enums/app-role.enum';
import { JwtAuthGuard } from '../../common/guards/jwt-auth.guard';
import { RbacGuard } from '../../common/guards/rbac.guard';
import { TasksService } from './tasks.service';
import { RequestWithUser } from '../../common/interfaces/request-with-user.interface';
import { UpdateTaskDto } from './dto/update-task.dto';

@ApiTags('tasks')
@ApiBearerAuth('access-token')
@UseGuards(JwtAuthGuard, RbacGuard)
@Roles(AppRole.SUPER_ADMIN, AppRole.COMPANY_ADMIN, AppRole.PROJECT_MANAGER, AppRole.FIELD_ENGINEER)
@Controller('tasks')
export class TasksController {
  constructor(private readonly tasksService: TasksService) {}

  @Get()
  findAll(@Req() request: RequestWithUser) {
    return this.tasksService.findAll(request.user.companyId);
  }

  @Patch(':id')
  @ApiOperation({ summary: 'Edit, complete or reopen a tenant-owned project task' })
  update(@Param('id') id: string, @Req() request: RequestWithUser, @Body() dto: UpdateTaskDto) {
    return this.tasksService.update(id, request.user, dto);
  }
}
