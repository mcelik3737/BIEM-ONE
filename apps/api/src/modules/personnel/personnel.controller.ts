import {
  Body,
  Controller,
  Get,
  Header,
  Param,
  Patch,
  Post,
  Query,
  Req,
  StreamableFile,
  UploadedFile,
  UseGuards,
  UseInterceptors,
} from '@nestjs/common';
import { FileInterceptor } from '@nestjs/platform-express';
import { ApiBearerAuth, ApiTags } from '@nestjs/swagger';
import { Roles } from '../../common/decorators/roles.decorator';
import { AppRole } from '../../common/enums/app-role.enum';
import { JwtAuthGuard } from '../../common/guards/jwt-auth.guard';
import { RbacGuard } from '../../common/guards/rbac.guard';
import { RequestWithUser } from '../../common/interfaces/request-with-user.interface';
import {
  CompensationDto,
  EmployeeDocumentDto,
  EmployeeDto,
  EmployeeTimeDto,
  VoidTimeDto,
} from './personnel.dto';
import { PersonnelService, PersonnelUpload } from './personnel.service';

@ApiTags('personnel')
@ApiBearerAuth('access-token')
@UseGuards(JwtAuthGuard, RbacGuard)
@Roles(AppRole.SUPER_ADMIN, AppRole.COMPANY_ADMIN)
@Controller('personnel')
export class PersonnelController {
  constructor(private readonly service: PersonnelService) {}
  @Get() list(@Req() r: RequestWithUser) {
    return this.service.list(r.user.companyId);
  }
  @Get('options') options(@Req() r: RequestWithUser) {
    return this.service.options(r.user.companyId);
  }
  @Get('costs') costs(@Req() r: RequestWithUser, @Query('month') month?: string) {
    return this.service.costs(r.user.companyId, month);
  }
  @Get('project-costs/:projectId') projectCosts(
    @Req() r: RequestWithUser,
    @Param('projectId') id: string,
  ) {
    return this.service.costs(r.user.companyId, undefined, id);
  }
  @Post() create(@Req() r: RequestWithUser, @Body() d: EmployeeDto) {
    return this.service.create(r.user, d);
  }
  @Get(':id') detail(@Req() r: RequestWithUser, @Param('id') id: string) {
    return this.service.detail(id, r.user.companyId);
  }
  @Patch(':id') update(@Req() r: RequestWithUser, @Param('id') id: string, @Body() d: EmployeeDto) {
    return this.service.update(id, r.user, d);
  }
  @Post(':id/compensations') compensation(
    @Req() r: RequestWithUser,
    @Param('id') id: string,
    @Body() d: CompensationDto,
  ) {
    return this.service.compensation(id, r.user, d);
  }
  @Post(':id/documents') addDocument(
    @Req() r: RequestWithUser,
    @Param('id') id: string,
    @Body() d: EmployeeDocumentDto,
  ) {
    return this.service.saveDocument(id, null, r.user, d);
  }
  @Patch(':id/documents/:documentId') updateDocument(
    @Req() r: RequestWithUser,
    @Param('id') id: string,
    @Param('documentId') doc: string,
    @Body() d: EmployeeDocumentDto,
  ) {
    return this.service.saveDocument(id, doc, r.user, d);
  }
  @Post(':id/documents/:documentId/file')
  @UseInterceptors(FileInterceptor('file', { limits: { fileSize: 5 * 1024 * 1024, files: 1 } }))
  upload(
    @Req() r: RequestWithUser,
    @Param('id') id: string,
    @Param('documentId') doc: string,
    @UploadedFile() file?: PersonnelUpload,
  ) {
    return this.service.upload(id, doc, r.user, file);
  }
  @Get(':id/documents/:documentId/file')
  @Header('Cache-Control', 'private, no-store')
  @Header('X-Content-Type-Options', 'nosniff')
  async download(
    @Req() r: RequestWithUser,
    @Param('id') id: string,
    @Param('documentId') doc: string,
  ) {
    const file = await this.service.download(id, doc, r.user.companyId);
    return new StreamableFile(Buffer.from(file.fileData!), {
      type: file.mimeType!,
      disposition: `attachment; filename*=UTF-8''${encodeURIComponent(file.fileName!)}`,
    });
  }
  @Post(':id/documents/:documentId/review') review(
    @Req() r: RequestWithUser,
    @Param('id') id: string,
    @Param('documentId') doc: string,
  ) {
    return this.service.review(id, doc, r.user);
  }
  @Get(':id/time-entries') times(
    @Req() r: RequestWithUser,
    @Param('id') id: string,
    @Query('month') month?: string,
  ) {
    return this.service.times(id, r.user.companyId, month);
  }
  @Post(':id/time-entries') addTime(
    @Req() r: RequestWithUser,
    @Param('id') id: string,
    @Body() d: EmployeeTimeDto,
  ) {
    return this.service.addTime(id, r.user, d);
  }
  @Post(':id/time-entries/:entryId/approve') approveTime(
    @Req() r: RequestWithUser,
    @Param('id') id: string,
    @Param('entryId') entry: string,
  ) {
    return this.service.decideTime(id, entry, r.user);
  }
  @Post(':id/time-entries/:entryId/void') voidTime(
    @Req() r: RequestWithUser,
    @Param('id') id: string,
    @Param('entryId') entry: string,
    @Body() d: VoidTimeDto,
  ) {
    return this.service.decideTime(id, entry, r.user, d.reason);
  }
}
