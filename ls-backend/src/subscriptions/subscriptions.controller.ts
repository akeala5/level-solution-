import {
  Controller, Get, Post, Delete, Body, HttpCode, HttpStatus,
} from '@nestjs/common';
import { ApiTags, ApiBearerAuth, ApiOperation } from '@nestjs/swagger';
import { SubscriptionsService } from './subscriptions.service';
import { CurrentUser } from '../common/decorators/current-user.decorator';

@ApiTags('Subscriptions')
@Controller('subscriptions')
@ApiBearerAuth()
export class SubscriptionsController {
  constructor(private readonly subscriptionsService: SubscriptionsService) {}

  @Get('me')
  @ApiOperation({ summary: 'Mon abonnement actuel + limites annonces' })
  getMySubscription(@CurrentUser('id') userId: string) {
    return this.subscriptionsService.getUserSubscription(userId);
  }

  @Get('limits')
  @ApiOperation({ summary: 'Vérifier mes limites d\'annonces' })
  checkLimits(@CurrentUser('id') userId: string) {
    return this.subscriptionsService.checkListingLimits(userId);
  }

  @Post('upgrade')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Passer à un forfait supérieur (Stripe Checkout)' })
  upgrade(
    @CurrentUser('id') userId: string,
    @Body() body: { plan: string; billingPeriod: 'monthly' | 'yearly' },
  ) {
    return this.subscriptionsService.upgradeSubscription(userId, body.plan, body.billingPeriod);
  }

  @Delete('cancel')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Annuler le renouvellement automatique' })
  cancel(@CurrentUser('id') userId: string) {
    return this.subscriptionsService.cancelSubscription(userId);
  }
}
