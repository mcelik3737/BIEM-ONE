import { Body, Controller, Delete, Get, Param, Patch, Post, Req, UseGuards } from '@nestjs/common';
import { ApiBearerAuth, ApiTags } from '@nestjs/swagger';
import { Roles } from '../../common/decorators/roles.decorator';
import { AppRole } from '../../common/enums/app-role.enum';
import { JwtAuthGuard } from '../../common/guards/jwt-auth.guard';
import { RbacGuard } from '../../common/guards/rbac.guard';
import { RequestWithUser } from '../../common/interfaces/request-with-user.interface';
import {
  ChangePurchaseOrderStatusDto,
  CreateBomItemDto,
  CreatePurchaseOrderDto,
  CreateSupplierDto,
  ReceivePurchaseItemDto,
  SetSupplierActiveDto,
  UpdateBomItemDto,
  UpdatePurchaseOrderDto,
  UpdateSupplierDto,
} from './dto/procurement.dto';
import { ProcurementService } from './procurement.service';

@ApiTags('procurement')
@ApiBearerAuth('access-token')
@UseGuards(JwtAuthGuard, RbacGuard)
@Roles(AppRole.SUPER_ADMIN, AppRole.COMPANY_ADMIN, AppRole.PROJECT_MANAGER, AppRole.FIELD_ENGINEER)
@Controller()
export class ProcurementController {
  constructor(private readonly service: ProcurementService) {}

  @Get('projects/:projectId/operation/bom')
  listBom(@Param('projectId') projectId: string, @Req() req: RequestWithUser) {
    return this.service.listBom(projectId, req.user.companyId);
  }

  @Post('projects/:projectId/operation/bom')
  createBom(
    @Param('projectId') projectId: string,
    @Req() req: RequestWithUser,
    @Body() dto: CreateBomItemDto,
  ) {
    return this.service.createBom(projectId, req.user, dto);
  }

  @Patch('projects/:projectId/operation/bom/:itemId')
  updateBom(
    @Param('projectId') projectId: string,
    @Param('itemId') itemId: string,
    @Req() req: RequestWithUser,
    @Body() dto: UpdateBomItemDto,
  ) {
    return this.service.updateBom(projectId, itemId, req.user, dto);
  }

  @Delete('projects/:projectId/operation/bom/:itemId')
  removeBom(
    @Param('projectId') projectId: string,
    @Param('itemId') itemId: string,
    @Req() req: RequestWithUser,
  ) {
    return this.service.removeBom(projectId, itemId, req.user);
  }

  @Get('suppliers')
  listSuppliers(@Req() req: RequestWithUser) {
    return this.service.listSuppliers(req.user.companyId);
  }

  @Post('suppliers')
  createSupplier(@Req() req: RequestWithUser, @Body() dto: CreateSupplierDto) {
    return this.service.createSupplier(req.user.companyId, dto);
  }

  @Patch('suppliers/:id')
  updateSupplier(
    @Param('id') id: string,
    @Req() req: RequestWithUser,
    @Body() dto: UpdateSupplierDto,
  ) {
    return this.service.updateSupplier(id, req.user.companyId, dto);
  }

  @Patch('suppliers/:id/active')
  setSupplierActive(
    @Param('id') id: string,
    @Req() req: RequestWithUser,
    @Body() dto: SetSupplierActiveDto,
  ) {
    return this.service.setSupplierActive(id, req.user.companyId, dto.isActive);
  }

  @Get('projects/:projectId/operation/purchase-orders')
  listOrders(@Param('projectId') projectId: string, @Req() req: RequestWithUser) {
    return this.service.listOrders(projectId, req.user.companyId);
  }

  @Post('projects/:projectId/operation/purchase-orders')
  createOrder(
    @Param('projectId') projectId: string,
    @Req() req: RequestWithUser,
    @Body() dto: CreatePurchaseOrderDto,
  ) {
    return this.service.createOrder(projectId, req.user, dto);
  }

  @Get('projects/:projectId/operation/purchase-orders/:orderId')
  getOrder(
    @Param('projectId') projectId: string,
    @Param('orderId') orderId: string,
    @Req() req: RequestWithUser,
  ) {
    return this.service.getOrder(projectId, orderId, req.user.companyId);
  }

  @Patch('projects/:projectId/operation/purchase-orders/:orderId')
  updateOrder(
    @Param('projectId') projectId: string,
    @Param('orderId') orderId: string,
    @Req() req: RequestWithUser,
    @Body() dto: UpdatePurchaseOrderDto,
  ) {
    return this.service.updateOrder(projectId, orderId, req.user, dto);
  }

  @Post('projects/:projectId/operation/purchase-orders/:orderId/status')
  changeOrderStatus(
    @Param('projectId') projectId: string,
    @Param('orderId') orderId: string,
    @Req() req: RequestWithUser,
    @Body() dto: ChangePurchaseOrderStatusDto,
  ) {
    return this.service.changeOrderStatus(projectId, orderId, req.user, dto.status);
  }

  @Post('projects/:projectId/operation/purchase-orders/:orderId/approve')
  @Roles(AppRole.SUPER_ADMIN, AppRole.COMPANY_ADMIN, AppRole.PROJECT_MANAGER)
  approveOrder(
    @Param('projectId') projectId: string,
    @Param('orderId') orderId: string,
    @Req() req: RequestWithUser,
  ) {
    return this.service.approveOrder(projectId, orderId, req.user);
  }

  @Post('projects/:projectId/operation/purchase-orders/:orderId/receive')
  receiveItem(
    @Param('projectId') projectId: string,
    @Param('orderId') orderId: string,
    @Req() req: RequestWithUser,
    @Body() dto: ReceivePurchaseItemDto,
  ) {
    return this.service.receiveItem(projectId, orderId, req.user, dto);
  }
}
