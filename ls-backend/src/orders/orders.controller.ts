import {
  Controller, Get, Post, Patch, Body, Param, Query,
  ParseIntPipe, DefaultValuePipe, UseGuards,
} from '@nestjs/common';
import { ApiTags, ApiBearerAuth, ApiOperation } from '@nestjs/swagger';
import { OrdersService } from './orders.service';
import { CurrentUser } from '../common/decorators/current-user.decorator';
import { Roles } from '../common/decorators/roles.decorator';
import { RolesGuard } from '../common/guards/roles.guard';

@ApiTags('Orders')
@ApiBearerAuth()
@Controller('orders')
export class OrdersController {
  constructor(private readonly ordersService: OrdersService) {}

  @Post()
  @ApiOperation({ summary: 'Passer une commande' })
  createOrder(
    @CurrentUser('id') buyerId: string,
    @Body() data: { productId: string; quantity?: number; addressId?: string; notes?: string },
  ) {
    return this.ordersService.createOrder(buyerId, data);
  }

  @Post('checkout')
  @ApiOperation({ summary: 'Checkout transactionnel — tout le panier, groupé par vendeur (1 sous-commande/vendeur)' })
  createCheckout(
    @CurrentUser('id') buyerId: string,
    @Body() data: { items: { productId: string; quantity?: number }[]; addressId?: string; notes?: string },
  ) {
    return this.ordersService.createCheckout(buyerId, data);
  }

  @Get('buying')
  @ApiOperation({ summary: 'Mes commandes (acheteur)' })
  getBuyerOrders(
    @CurrentUser('id') userId: string,
    @Query('page', new DefaultValuePipe(1), ParseIntPipe) page: number,
    @Query('limit', new DefaultValuePipe(20), ParseIntPipe) limit: number,
  ) {
    return this.ordersService.getBuyerOrders(userId, page, limit);
  }

  @Get('selling')
  @ApiOperation({ summary: 'Commandes reçues (vendeur)' })
  getSellerOrders(
    @CurrentUser('id') userId: string,
    @Query('page', new DefaultValuePipe(1), ParseIntPipe) page: number,
    @Query('limit', new DefaultValuePipe(20), ParseIntPipe) limit: number,
    @Query('status') status?: string,
  ) {
    return this.ordersService.getSellerOrders(userId, page, limit, status);
  }

  @Get(':id')
  @ApiOperation({ summary: 'Détail d\'une commande' })
  getOrder(@CurrentUser() user: any, @Param('id') id: string) {
    return this.ordersService.getOrderById(id, user.id, user.role);
  }

  @Patch(':id/cancel')
  @ApiOperation({ summary: 'Annuler une commande (acheteur)' })
  cancelOrder(
    @CurrentUser() user: any,
    @Param('id') id: string,
    @Body() body: { reason?: string },
  ) {
    return this.ordersService.updateStatus(id, user.id, user.role, 'CANCELLED', body);
  }

  @Patch(':id/confirm-delivery')
  @ApiOperation({ summary: 'Confirmer la réception (acheteur)' })
  confirmDelivery(
    @CurrentUser() user: any,
    @Param('id') id: string,
  ) {
    return this.ordersService.updateStatus(id, user.id, user.role, 'DELIVERED', {});
  }

  @Patch(':id/status')
  @ApiOperation({ summary: 'Mettre à jour le statut d\'une commande' })
  updateStatus(
    @CurrentUser() user: any,
    @Param('id') id: string,
    @Body() body: { status: string; trackingNumber?: string; trackingUrl?: string; reason?: string },
  ) {
    return this.ordersService.updateStatus(id, user.id, user.role, body.status, body);
  }

  @Post(':id/dispute')
  @ApiOperation({ summary: 'Ouvrir un litige sur une commande' })
  openDispute(
    @CurrentUser('id') userId: string,
    @Param('id') id: string,
    @Body() data: { reason: string; description: string; evidenceUrls?: string[] },
  ) {
    return this.ordersService.openDispute(id, userId, data);
  }

  @UseGuards(RolesGuard)
  @Roles('ADMIN' as any)
  @Get('admin/all')
  @ApiOperation({ summary: '[Admin] Toutes les commandes' })
  adminGetOrders(
    @Query('page', new DefaultValuePipe(1), ParseIntPipe) page: number,
    @Query('limit', new DefaultValuePipe(20), ParseIntPipe) limit: number,
    @Query('status') status?: string,
  ) {
    return this.ordersService.adminGetOrders(page, limit, status);
  }
}
