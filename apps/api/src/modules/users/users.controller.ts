import { Controller, Get, Param, Req, UseGuards } from '@nestjs/common';
import { RequestWithUser } from '../../common/interfaces/request-with-user.interface';
import { ApiBearerAuth, ApiTags } from '@nestjs/swagger';
import { Roles } from '../../common/decorators/roles.decorator';
import { AppRole } from '../../common/enums/app-role.enum';
import { JwtAuthGuard } from '../../common/guards/jwt-auth.guard';
import { RbacGuard } from '../../common/guards/rbac.guard';
import { UsersService } from './users.service';

@ApiTags('users')
@ApiBearerAuth('access-token')
@UseGuards(JwtAuthGuard, RbacGuard)
@Roles(AppRole.SUPER_ADMIN, AppRole.COMPANY_ADMIN)
@Controller('users')
export class UsersController {
  constructor(private readonly usersService: UsersService) {}

  @Get()
  findAll(@Req() request: RequestWithUser) {
    return this.usersService.findAll(request.user.companyId);
  }

  @Get(':id')
  findOne(@Param('id') id: string, @Req() request: RequestWithUser) {
    return this.usersService.findOne(id, request.user.companyId);
  }
}
