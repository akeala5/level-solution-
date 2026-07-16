import {
  Controller, Get, Put, Post, Body, Param, Patch,
  Query, HttpCode, HttpStatus, ParseIntPipe, DefaultValuePipe,
} from '@nestjs/common';
import { ApiTags, ApiBearerAuth, ApiOperation, ApiQuery } from '@nestjs/swagger';
import { AdminService } from './admin.service';
import { Roles } from '../common/decorators/roles.decorator';
import { CurrentUser } from '../common/decorators/current-user.decorator';

@ApiTags('Admin')
@Controller('admin')
@ApiBearerAuth()
@Roles('ADMIN', 'MODERATOR')
export class AdminController {
  constructor(private readonly adminService: AdminService) {}

  // ─── STATS ────────────────────────────────────────────────────────────────────

  @Get('stats')
  @ApiOperation({ summary: 'Statistiques globales de la plateforme' })
  getStats() {
    return this.adminService.getPlatformStats();
  }

  // ─── UTILISATEURS ─────────────────────────────────────────────────────────────

  @Get('users')
  @ApiOperation({ summary: 'Lister les utilisateurs avec filtres' })
  @ApiQuery({ name: 'page', required: false })
  @ApiQuery({ name: 'limit', required: false })
  @ApiQuery({ name: 'role', required: false })
  @ApiQuery({ name: 'search', required: false })
  getUsers(
    @Query('page', new DefaultValuePipe(1), ParseIntPipe) page: number,
    @Query('limit', new DefaultValuePipe(20), ParseIntPipe) limit: number,
    @Query('role') role?: string,
    @Query('search') search?: string,
  ) {
    return this.adminService.getUsers(page, limit, role, search);
  }

  @Put('users/:id/suspend')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Suspendre un utilisateur' })
  @Roles('ADMIN')
  suspendUser(
    @Param('id') userId: string,
    @Body() body: { reason: string },
    @CurrentUser('id') adminId: string,
  ) {
    return this.adminService.suspendUser(userId, body.reason, adminId);
  }

  @Put('users/:id/unsuspend')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Lever la suspension d\'un utilisateur' })
  @Roles('ADMIN')
  unsuspendUser(
    @Param('id') userId: string,
    @CurrentUser('id') adminId: string,
  ) {
    return this.adminService.unsuspendUser(userId, adminId);
  }

  // ─── MODÉRATION ANNONCES ──────────────────────────────────────────────────────

  @Get('products/pending')
  @ApiOperation({ summary: 'Annonces en attente de modération' })
  @ApiQuery({ name: 'page', required: false })
  getPendingProducts(
    @Query('page', new DefaultValuePipe(1), ParseIntPipe) page: number,
    @Query('limit', new DefaultValuePipe(20), ParseIntPipe) limit: number,
  ) {
    return this.adminService.getPendingProducts(page, limit);
  }

  @Put('products/:id/approve')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Approuver une annonce' })
  approveProduct(
    @Param('id') productId: string,
    @CurrentUser('id') adminId: string,
  ) {
    return this.adminService.approveProduct(productId, adminId);
  }

  @Put('products/:id/reject')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Refuser une annonce avec motif' })
  rejectProduct(
    @Param('id') productId: string,
    @Body() body: { reason: string },
    @CurrentUser('id') adminId: string,
  ) {
    return this.adminService.rejectProduct(productId, body.reason, adminId);
  }

  // ─── LITIGES ──────────────────────────────────────────────────────────────────

  @Get('disputes')
  @ApiOperation({ summary: 'Lister les litiges' })
  @ApiQuery({ name: 'status', required: false })
  getDisputes(
    @Query('page', new DefaultValuePipe(1), ParseIntPipe) page: number,
    @Query('limit', new DefaultValuePipe(20), ParseIntPipe) limit: number,
    @Query('status') status?: string,
  ) {
    return this.adminService.getDisputes(page, limit, status);
  }

  @Put('disputes/:id/resolve')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Résoudre un litige (en faveur acheteur ou vendeur)' })
  @Roles('ADMIN')
  resolveDispute(
    @Param('id') disputeId: string,
    @Body() body: { resolution: 'RESOLVED_BUYER' | 'RESOLVED_SELLER'; notes: string },
    @CurrentUser('id') adminId: string,
  ) {
    return this.adminService.resolveDispute(disputeId, body.resolution, body.notes, adminId);
  }

  // ─── KYC ──────────────────────────────────────────────────────────────────────

  @Get('kyc')
  @ApiOperation({ summary: 'Lister les documents KYC' })
  @ApiQuery({ name: 'status', required: false })
  getKycDocuments(
    @Query('page', new DefaultValuePipe(1), ParseIntPipe) page: number,
    @Query('limit', new DefaultValuePipe(20), ParseIntPipe) limit: number,
    @Query('status') status?: string,
  ) {
    return this.adminService.getKycDocuments(page, limit, status);
  }

  @Put('kyc/:userId/approve')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Approuver la vérification KYC d\'un utilisateur' })
  @Roles('ADMIN')
  approveKyc(
    @Param('userId') userId: string,
    @CurrentUser('id') adminId: string,
  ) {
    return this.adminService.approveKyc(userId, adminId);
  }

  @Put('kyc/:userId/reject')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Rejeter la vérification KYC avec motif' })
  @Roles('ADMIN')
  rejectKyc(
    @Param('userId') userId: string,
    @Body() body: { notes: string },
    @CurrentUser('id') adminId: string,
  ) {
    return this.adminService.rejectKyc(userId, body.notes, adminId);
  }

  // ─── ESCROW ───────────────────────────────────────────────────────────────────

  @Get('payments/escrow/pending')
  @ApiOperation({ summary: 'Lister les virements Escrow en attente de confirmation' })
  getPendingEscrowPayments(
    @Query('page', new DefaultValuePipe(1), ParseIntPipe) page: number,
    @Query('limit', new DefaultValuePipe(20), ParseIntPipe) limit: number,
  ) {
    return this.adminService.getPendingEscrowPayments(page, limit);
  }

  @Patch('payments/escrow/:ref/confirm')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Confirmer un virement Escrow reçu → PAYMENT_CONFIRMED' })
  @Roles('ADMIN')
  confirmEscrow(
    @Param('ref') ref: string,
    @CurrentUser('id') adminId: string,
  ) {
    return this.adminService.confirmEscrowPayment(ref, adminId);
  }

  @Patch('payments/escrow/:ref/reject')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Rejeter un virement Escrow non reçu → CANCELLED' })
  @Roles('ADMIN')
  rejectEscrow(
    @Param('ref') ref: string,
    @Body() body: { reason: string },
    @CurrentUser('id') adminId: string,
  ) {
    return this.adminService.rejectEscrowPayment(ref, body.reason, adminId);
  }

  @Post('orders/:id/refund')
  @HttpCode(HttpStatus.OK)
  @Roles('ADMIN')
  @ApiOperation({ summary: "Rembourser une commande (Stripe réel / FedaPay manuel, claw-back escrow)" })
  refundOrder(
    @Param('id') id: string,
    @Body() body: { reason?: string },
    @CurrentUser('id') adminId: string,
  ) {
    return this.adminService.refundOrder(id, adminId, body?.reason);
  }

  // ─── TRANSACTIONS ──────────────────────────────────────────────────────────────

  @Get('payments')
  @ApiOperation({ summary: 'Historique de toutes les transactions' })
  @ApiQuery({ name: 'status', required: false })
  getPayments(
    @Query('page', new DefaultValuePipe(1), ParseIntPipe) page: number,
    @Query('limit', new DefaultValuePipe(20), ParseIntPipe) limit: number,
    @Query('status') status?: string,
  ) {
    return this.adminService.getPayments(page, limit, status);
  }
}
