import {
  Body,
  Controller,
  Delete,
  Get,
  Param,
  Patch,
  Post,
  Query,
  Req,
  UseGuards,
} from '@nestjs/common';
import { ApiBearerAuth, ApiTags } from '@nestjs/swagger';
import { JwtAuthGuard } from '../../common/guards/jwt-auth.guard';
import { RequestWithUser } from '../../common/interfaces/request-with-user.interface';
import { BusinessService } from './business.service';
import {
  BomDto,
  OperationDto,
  OrderDto,
  OrderStatusDto,
  PartyDto,
  ProjectDto,
  ReceiptDto,
  SalesDto,
  UpdatePartyDto,
} from './business.dto';

@ApiTags('business')
@ApiBearerAuth('access-token')
@UseGuards(JwtAuthGuard)
@Controller()
export class BusinessController {
  constructor(private readonly service: BusinessService) {}
  @Get('dashboard') dashboard(@Req() r: RequestWithUser) {
    return this.service.dashboard(r.user);
  }
  @Get('customers') customers(@Req() r: RequestWithUser, @Query('q') q?: string) {
    return this.service.parties(r.user, 'customer', q);
  }
  @Post('customers') addCustomer(@Req() r: RequestWithUser, @Body() d: PartyDto) {
    return this.service.createParty(r.user, 'customer', d);
  }
  @Patch('customers/:id') updateCustomer(
    @Req() r: RequestWithUser,
    @Param('id') id: string,
    @Body() d: UpdatePartyDto,
  ) {
    return this.service.updateParty(r.user, 'customer', id, d);
  }
  @Get('suppliers') suppliers(@Req() r: RequestWithUser, @Query('q') q?: string) {
    return this.service.parties(r.user, 'supplier', q);
  }
  @Post('suppliers') addSupplier(@Req() r: RequestWithUser, @Body() d: PartyDto) {
    return this.service.createParty(r.user, 'supplier', d);
  }
  @Patch('suppliers/:id') updateSupplier(
    @Req() r: RequestWithUser,
    @Param('id') id: string,
    @Body() d: UpdatePartyDto,
  ) {
    return this.service.updateParty(r.user, 'supplier', id, d);
  }
  @Get('projects') projects(@Req() r: RequestWithUser) {
    return this.service.projects(r.user);
  }
  @Post('projects') addProject(@Req() r: RequestWithUser, @Body() d: ProjectDto) {
    return this.service.createProject(r.user, d);
  }
  @Get('projects/:id') project(@Req() r: RequestWithUser, @Param('id') id: string) {
    return this.service.project(r.user, id);
  }
  @Patch('projects/:id/sales-status') sales(
    @Req() r: RequestWithUser,
    @Param('id') id: string,
    @Body() d: SalesDto,
  ) {
    return this.service.sales(r.user, id, d);
  }
  @Patch('operations/:id') operation(
    @Req() r: RequestWithUser,
    @Param('id') id: string,
    @Body() d: OperationDto,
  ) {
    return this.service.updateOperation(r.user, id, d);
  }
  @Post('operations/:id/bom') bom(
    @Req() r: RequestWithUser,
    @Param('id') id: string,
    @Body() d: BomDto,
  ) {
    return this.service.saveBom(r.user, id, d);
  }
  @Patch('operations/:id/bom/:itemId') editBom(
    @Req() r: RequestWithUser,
    @Param('id') id: string,
    @Param('itemId') itemId: string,
    @Body() d: BomDto,
  ) {
    return this.service.saveBom(r.user, id, d, itemId);
  }
  @Delete('operations/:id/bom/:itemId') deleteBom(
    @Req() r: RequestWithUser,
    @Param('id') id: string,
    @Param('itemId') itemId: string,
  ) {
    return this.service.deleteBom(r.user, id, itemId);
  }
  @Post('operations/:id/purchase-orders') order(
    @Req() r: RequestWithUser,
    @Param('id') id: string,
    @Body() d: OrderDto,
  ) {
    return this.service.createOrder(r.user, id, d);
  }
  @Patch('purchase-orders/:id/status') orderStatus(
    @Req() r: RequestWithUser,
    @Param('id') id: string,
    @Body() d: OrderStatusDto,
  ) {
    return this.service.orderStatus(r.user, id, d);
  }
  @Post('purchase-orders/:id/receipts') receive(
    @Req() r: RequestWithUser,
    @Param('id') id: string,
    @Body() d: ReceiptDto,
  ) {
    return this.service.receive(r.user, id, d);
  }
}
