import { Body, Controller, Get, Param, Patch, Post, Req, UseGuards } from '@nestjs/common';
import { ApiBearerAuth, ApiTags } from '@nestjs/swagger';
import { Roles } from '../../common/decorators/roles.decorator';
import { AppRole } from '../../common/enums/app-role.enum';
import { JwtAuthGuard } from '../../common/guards/jwt-auth.guard';
import { RbacGuard } from '../../common/guards/rbac.guard';
import { CustomersService } from './customers.service';
import { RequestWithUser } from '../../common/interfaces/request-with-user.interface';
import { CreateCustomerDto, SetCustomerActiveDto, UpdateCustomerDto } from './dto/customer.dto';

@ApiTags('customers')
@ApiBearerAuth('access-token')
@UseGuards(JwtAuthGuard, RbacGuard)
@Roles(AppRole.SUPER_ADMIN, AppRole.COMPANY_ADMIN, AppRole.PROJECT_MANAGER, AppRole.FIELD_ENGINEER)
@Controller('customers')
export class CustomersController {
  constructor(private readonly customersService: CustomersService) {}

  @Get()
  findAll(@Req() request: RequestWithUser) {
    return this.customersService.findAll(request.user.companyId);
  }

  @Post()
  create(@Req() request: RequestWithUser, @Body() dto: CreateCustomerDto) {
    return this.customersService.create(request.user.companyId, dto);
  }

  @Patch(':id')
  update(@Param('id') id: string, @Req() request: RequestWithUser, @Body() dto: UpdateCustomerDto) {
    return this.customersService.update(id, request.user.companyId, dto);
  }

  @Patch(':id/active')
  setActive(
    @Param('id') id: string,
    @Req() request: RequestWithUser,
    @Body() dto: SetCustomerActiveDto,
  ) {
    return this.customersService.setActive(id, request.user.companyId, dto.isActive);
  }
}
