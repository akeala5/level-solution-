import {
  Controller, Get, Post, Patch, Body, Param, Query,
  ParseIntPipe, DefaultValuePipe, UseGuards,
} from '@nestjs/common';
import { ApiTags, ApiBearerAuth, ApiOperation } from '@nestjs/swagger';
import { WalletService } from './wallet.service';
import { CurrentUser } from '../common/decorators/current-user.decorator';
import { Roles } from '../common/decorators/roles.decorator';
import { RolesGuard } from '../common/guards/roles.guard';
import { EmailVerifiedGuard } from '../common/guards/email-verified.guard';

@ApiTags('Wallet')
@ApiBearerAuth()
@Controller('wallet')
export class WalletController {
  constructor(private readonly walletService: WalletService) {}

  @Get()
  @ApiOperation({ summary: 'Mon portefeuille (solde, retraits en attente, derniers mouvements)' })
  getWallet(@CurrentUser('id') userId: string) {
    return this.walletService.getWallet(userId);
  }

  @Get('transactions')
  @ApiOperation({ summary: 'Historique des mouvements du portefeuille' })
  getTransactions(
    @CurrentUser('id') userId: string,
    @Query('page', new DefaultValuePipe(1), ParseIntPipe) page: number,
    @Query('limit', new DefaultValuePipe(20), ParseIntPipe) limit: number,
  ) {
    return this.walletService.getTransactions(userId, page, limit);
  }

  @Get('payouts')
  @ApiOperation({ summary: 'Mes demandes de retrait' })
  getMyPayouts(
    @CurrentUser('id') userId: string,
    @Query('page', new DefaultValuePipe(1), ParseIntPipe) page: number,
    @Query('limit', new DefaultValuePipe(20), ParseIntPipe) limit: number,
  ) {
    return this.walletService.getMyPayouts(userId, page, limit);
  }

  @UseGuards(EmailVerifiedGuard)
  @Post('payout')
  @ApiOperation({ summary: 'Demander un retrait (débit immédiat du solde, validation admin)' })
  requestPayout(
    @CurrentUser('id') userId: string,
    @Body() body: { amount: number; method: string; destination: any },
  ) {
    return this.walletService.requestPayout(userId, body);
  }

  // ─── ADMIN ────────────────────────────────────────────────────────────────────

  @UseGuards(RolesGuard)
  @Roles('ADMIN' as any)
  @Get('admin/payouts')
  @ApiOperation({ summary: '[Admin] Liste des demandes de retrait' })
  adminListPayouts(
    @Query('page', new DefaultValuePipe(1), ParseIntPipe) page: number,
    @Query('limit', new DefaultValuePipe(20), ParseIntPipe) limit: number,
    @Query('status') status?: string,
  ) {
    return this.walletService.adminListPayouts(status, page, limit);
  }

  @UseGuards(RolesGuard)
  @Roles('ADMIN' as any)
  @Patch('admin/payouts/:id')
  @ApiOperation({ summary: '[Admin] Traiter un retrait (APPROVE | PAID | REJECT)' })
  adminProcessPayout(
    @CurrentUser('id') adminId: string,
    @Param('id') id: string,
    @Body() body: { action: 'APPROVE' | 'PAID' | 'REJECT'; notes?: string },
  ) {
    return this.walletService.adminProcessPayout(id, adminId, body.action, body.notes);
  }
}
