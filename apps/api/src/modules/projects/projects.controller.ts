import { Body, Controller, Get, Header, Param, Patch, Post, Req, UseGuards } from '@nestjs/common';
import {
  ApiBearerAuth,
  ApiCreatedResponse,
  ApiOkResponse,
  ApiOperation,
  ApiTags,
} from '@nestjs/swagger';
import { Roles } from '../../common/decorators/roles.decorator';
import { AppRole } from '../../common/enums/app-role.enum';
import { JwtAuthGuard } from '../../common/guards/jwt-auth.guard';
import { RbacGuard } from '../../common/guards/rbac.guard';
import { RequestWithUser } from '../../common/interfaces/request-with-user.interface';
import { CreateProjectDto } from './dto/create-project.dto';
import { AddProjectNoteDto } from './dto/add-project-note.dto';
import { ChangeProjectStageDto } from './dto/change-project-stage.dto';
import { CreateProjectTaskDto } from './dto/create-project-task.dto';
import { UpdateProjectDto } from './dto/update-project.dto';
import { UpdateChecklistItemDto } from './dto/update-checklist-item.dto';
import { CompleteNextActionDto } from './dto/complete-next-action.dto';
import { UpdateProjectOperationDto } from './dto/update-project-operation.dto';
import { RevertOperationStageDto } from './dto/revert-operation-stage.dto';
import { ProjectsService } from './projects.service';

@ApiTags('projects')
@ApiBearerAuth('access-token')
@UseGuards(JwtAuthGuard, RbacGuard)
@Roles(AppRole.SUPER_ADMIN, AppRole.COMPANY_ADMIN, AppRole.PROJECT_MANAGER, AppRole.FIELD_ENGINEER)
@Controller('projects')
export class ProjectsController {
  constructor(private readonly projectsService: ProjectsService) {}

  @Get()
  @ApiOperation({ summary: 'List the authenticated company projects' })
  @ApiOkResponse({ description: 'Projects ordered newest first.' })
  findAll(@Req() request: RequestWithUser) {
    return this.projectsService.findAll(request.user.companyId);
  }

  @Get('options')
  @ApiOperation({ summary: 'List tenant-safe customer and owner options for project forms' })
  @ApiOkResponse({ description: 'Customers and active users from the authenticated company.' })
  getOptions(@Req() request: RequestWithUser) {
    return this.projectsService.getOptions(request.user.companyId);
  }

  @Get('dashboard')
  @ApiOperation({ summary: 'Tenant dashboard with procurement data and Decimal currency totals' })
  dashboard(@Req() request: RequestWithUser) {
    return this.projectsService.dashboard(request.user.companyId);
  }

  @Post()
  @ApiOperation({ summary: 'Create a new İş / Talep' })
  @ApiCreatedResponse({ description: 'The work item was created in Yeni Talep.' })
  create(@Req() request: RequestWithUser, @Body() dto: CreateProjectDto) {
    return this.projectsService.create(request.user, dto);
  }

  @Get(':id')
  @ApiOperation({ summary: 'Get a tenant-secure Work File detail' })
  @ApiOkResponse({ description: 'Work File with customer, owner, stage and open tasks.' })
  findOne(@Param('id') id: string, @Req() request: RequestWithUser) {
    return this.projectsService.findOne(id, request.user.companyId);
  }

  @Patch(':id')
  @ApiOperation({ summary: 'Update safe editable Work File fields' })
  @ApiOkResponse({ description: 'Work File updated with one WORK_UPDATED timeline event.' })
  update(@Param('id') id: string, @Req() request: RequestWithUser, @Body() dto: UpdateProjectDto) {
    return this.projectsService.update(id, request.user, dto);
  }

  @Patch(':id/stage')
  @ApiOperation({ summary: 'Change a work item stage with Workflow v1 gate validation' })
  @ApiOkResponse({ description: 'Stage changed and timeline event created.' })
  changeStage(
    @Param('id') id: string,
    @Req() request: RequestWithUser,
    @Body() dto: ChangeProjectStageDto,
  ) {
    return this.projectsService.changeStage(id, request.user, dto);
  }

  @Get(':id/timeline')
  @ApiOperation({ summary: 'List a work item timeline newest first' })
  getTimeline(@Param('id') id: string, @Req() request: RequestWithUser) {
    return this.projectsService.getTimeline(id, request.user.companyId);
  }

  @Post(':id/timeline')
  @ApiOperation({ summary: 'Add a note to a work item timeline' })
  @ApiCreatedResponse({ description: 'NOTE_ADDED timeline event created.' })
  addNote(
    @Param('id') id: string,
    @Req() request: RequestWithUser,
    @Body() dto: AddProjectNoteDto,
  ) {
    return this.projectsService.addNote(id, request.user, dto);
  }

  @Post(':id/tasks')
  @ApiOperation({ summary: 'Quick-create a task for a work item' })
  @ApiCreatedResponse({ description: 'Task and TASK_CREATED timeline event created.' })
  createTask(
    @Param('id') id: string,
    @Req() request: RequestWithUser,
    @Body() dto: CreateProjectTaskDto,
  ) {
    return this.projectsService.createTask(id, request.user, dto);
  }

  @Get(':id/checklist')
  @ApiOperation({ summary: 'Get and initialize the tenant-secure category checklist' })
  getChecklist(@Param('id') id: string, @Req() request: RequestWithUser) {
    return this.projectsService.getChecklist(id, request.user.companyId);
  }

  @Post(':id/checklist/initialize')
  @ApiOperation({ summary: 'Idempotently initialize the category checklist' })
  initializeChecklist(@Param('id') id: string, @Req() request: RequestWithUser) {
    return this.projectsService.initializeChecklist(id, request.user.companyId);
  }

  @Patch(':id/checklist/:itemId')
  @ApiOperation({ summary: 'Complete or reopen a tenant-secure checklist item' })
  updateChecklistItem(
    @Param('id') id: string,
    @Param('itemId') itemId: string,
    @Req() request: RequestWithUser,
    @Body() dto: UpdateChecklistItemDto,
  ) {
    return this.projectsService.updateChecklistItem(id, itemId, request.user, dto);
  }

  @Post(':id/next-action/complete')
  @ApiOperation({ summary: 'Complete and optionally replace the next action' })
  completeNextAction(
    @Param('id') id: string,
    @Req() request: RequestWithUser,
    @Body() dto: CompleteNextActionDto,
  ) {
    return this.projectsService.completeNextAction(id, request.user, dto);
  }

  @Get(':id/operation')
  @ApiOperation({ summary: 'Get the tenant-secure operation for a won work file' })
  getOperation(@Param('id') id: string, @Req() request: RequestWithUser) {
    return this.projectsService.getOperation(id, request.user.companyId);
  }

  @Get(':id/operation/readiness')
  @Header('Cache-Control', 'no-store')
  @ApiOperation({ summary: 'Read advisory operation readiness without changing any records' })
  @ApiOkResponse({ description: 'Current preparation checks; not field-safety approval.' })
  getOperationReadiness(@Param('id') id: string, @Req() request: RequestWithUser) {
    return this.projectsService.getOperationReadiness(id, request.user.companyId);
  }

  @Patch(':id/operation')
  @ApiOperation({ summary: 'Update tenant-secure project operation fields' })
  updateOperation(
    @Param('id') id: string,
    @Req() request: RequestWithUser,
    @Body() dto: UpdateProjectOperationDto,
  ) {
    return this.projectsService.updateOperation(id, request.user, dto);
  }

  @Post(':id/operation/advance')
  @ApiOperation({ summary: 'Advance the project operation by one stage' })
  advanceOperation(@Param('id') id: string, @Req() request: RequestWithUser) {
    return this.projectsService.advanceOperation(id, request.user);
  }

  @Post(':id/operation/revert')
  @ApiOperation({ summary: 'Revert the project operation by one stage with a mandatory reason' })
  revertOperation(
    @Param('id') id: string,
    @Req() request: RequestWithUser,
    @Body() dto: RevertOperationStageDto,
  ) {
    return this.projectsService.revertOperation(id, request.user, dto);
  }
}
