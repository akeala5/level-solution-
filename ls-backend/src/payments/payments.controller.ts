import {
  Controller, Post, Get, Body, Param, Headers, RawBodyRequest,
  Req, HttpCode, HttpStatus,
} from '@nestjs/common';
import { ApiTags, ApiBearerAuth, ApiOperation } from '@nestjs/swagger';
import { PaymentsService } from './payments.service';
import { CurrentUser } from '../common/decorators/current-user.decorator';
import { Public } from '../common/decorators/public.decorator';
import { Request } from 'express';

@ApiTags('Payments')
@Controller('payments')
export class PaymentsController {
  constructor(private readonly paymentsService: PaymentsService) {}

  @ApiBearerAuth()
  @Post('stripe/intent/:orderId')
  @ApiOperation({ summary: 'Créer un intent de paiement Stripe (carte)' })
  stripeIntent(@Param('orderId') orderId: string) {
    return this.paymentsService.createStripePaymentIntent(orderId);
  }

  @Public()
  @Post('stripe/webhook')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Webhook Stripe' })
  stripeWebhook(
    @Headers('stripe-signature') sig: string,
    @Req() req: RawBodyRequest<Request>,
  ) {
    return this.paymentsService.handleStripeWebhook(sig, req.rawBody);
  }

  @ApiBearerAuth()
  @Post('fedapay/:orderId')
  @ApiOperation({ summary: 'Paiement Mobile Money via FedaPay' })
  fedapayPay(
    @Param('orderId') orderId: string,
    @Body() body: { method: string; phoneNumber: string },
  ) {
    return this.paymentsService.createFedaPayTransaction(orderId, body.method, body.phoneNumber);
  }

  @Public()
  @Post('fedapay/callback')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Callback FedaPay (signature HMAC-SHA256 vérifiée)' })
  fedapayCallback(
    @Headers('x-fedapay-signature') signature: string,
    @Req() req: RawBodyRequest<Request>,
  ) {
    return this.paymentsService.handleFedaPayCallback(req.rawBody, signature);
  }

  @ApiBearerAuth()
  @Post('subscribe')
  @ApiOperation({ summary: 'Souscrire à un forfait (Stripe Checkout)' })
  subscribe(
    @CurrentUser('id') userId: string,
    @Body() body: { plan: string; billingPeriod: 'monthly' | 'yearly' },
  ) {
    return this.paymentsService.createSubscriptionCheckout(userId, body.plan, body.billingPeriod);
  }

  @ApiBearerAuth()
  @Get('history')
  @ApiOperation({ summary: 'Historique de mes paiements' })
  history(@CurrentUser('id') userId: string) {
    return this.paymentsService.getPaymentHistory(userId);
  }
}
