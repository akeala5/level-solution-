import {
  Controller, Get, Post, Patch, Delete, Param, Body, HttpCode, HttpStatus, UseGuards,
} from '@nestjs/common';
import { ApiTags, ApiBearerAuth, ApiOperation } from '@nestjs/swagger';
import { SubscriptionsService } from './subscriptions.service';
import { CurrentUser } from '../common/decorators/current-user.decorator';
import { Roles } from '../common/decorators/roles.decorator';
import { RolesGuard } from '../common/guards/roles.guard';
import { UpdatePlanConfigDto } from './dto/update-plan-config.dto';
import { Public } from '../common/decorators/public.decorator';

@ApiTags('Subscriptions')
@Controller('subscriptions')
@ApiBearerAuth()
export class SubscriptionsController {
  constructor(private readonly subscriptionsService: SubscriptionsService) {}

  @Public()
  @Get('plans')
  @ApiOperation({ summary: 'Liste publique des forfaits actifs (page tarifs)' })
  getPlans() {
    return this.subscriptionsService.getPublicPlans();
  }

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

  @UseGuards(RolesGuard)
  @Roles('ADMIN' as any)
  @Get('admin/plans')
  @ApiOperation({ summary: '[Admin] Configuration de tous les forfaits' })
  adminListPlans() {
    return this.subscriptionsService.adminListPlans();
  }

  @UseGuards(RolesGuard)
  @Roles('ADMIN' as any)
  @Patch('admin/plans/:plan')
  @ApiOperation({ summary: '[Admin] Modifier un forfait (prix, limites, commission, features)' })
  adminUpdatePlan(@Param('plan') plan: string, @Body() dto: UpdatePlanConfigDto) {
    return this.subscriptionsService.adminUpdatePlan(plan, dto);
  }

  @Delete('cancel')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Annuler le renouvellement automatique' })
  cancel(@CurrentUser('id') userId: string) {
    return this.subscriptionsService.cancelSubscription(userId);
  }
}
