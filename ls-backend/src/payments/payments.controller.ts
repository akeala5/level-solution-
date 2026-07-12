import {
  Controller, Post, Get, Body, Param, Headers, RawBodyRequest,
  Req, Res, Query, HttpCode, HttpStatus, Redirect,
} from '@nestjs/common';
import { Response } from 'express';
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

  // GET — redirection navigateur après paiement FedaPay
  // Vérifie le statut RÉEL en base via l'id de transaction FedaPay (paramètre ?id=)
  @Public()
  @Get('fedapay/callback')
  async fedapayCallbackRedirect(
    @Query('status') status: string,
    @Query('id') transactionId: string,
    @Res() res: Response,
  ) {
    const frontendUrl = this.paymentsService.getFrontendUrl();
    const { orderId, confirmed } = await this.paymentsService.verifyFedaPayCallback(String(transactionId || ''));

    if (orderId) {
      if (confirmed) {
        return res.redirect(`${frontendUrl}/orders/${orderId}?payment=success`);
      }
      // Race condition possible : webhook pas encore traité mais FedaPay dit approuvé
      if (status === 'approved') {
        return res.redirect(`${frontendUrl}/orders/${orderId}?payment=pending`);
      }
      return res.redirect(`${frontendUrl}/orders/${orderId}?payment=cancelled`);
    }

    // Transaction inconnue en base
    return res.redirect(`${frontendUrl}/checkout?payment=cancelled`);
  }

  // POST — webhook FedaPay (signature HMAC-SHA256)
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
  @Post('fedapay/checkout')
  @ApiOperation({ summary: 'Paiement Mobile Money — panier multi-articles (FedaPay)' })
  fedapayCheckout(
    @Body() body: { orderIds: string[]; method: string; phoneNumber: string; country?: string },
  ) {
    return this.paymentsService.createFedaPayCheckout(body.orderIds, body.method, body.phoneNumber, body.country);
  }

  @ApiBearerAuth()
  @Post('stripe/checkout')
  @ApiOperation({ summary: 'Paiement Stripe — panier multi-articles' })
  stripeCheckout(@Body() body: { orderIds: string[] }) {
    return this.paymentsService.createStripeCheckout(body.orderIds);
  }

  @ApiBearerAuth()
  @Post('fedapay/:orderId')
  @ApiOperation({ summary: 'Paiement Mobile Money via FedaPay (commande unique)' })
  fedapayPay(
    @Param('orderId') orderId: string,
    @Body() body: { method: string; phoneNumber: string; country?: string },
  ) {
    return this.paymentsService.createFedaPayTransaction(orderId, body.method, body.phoneNumber, body.country);
  }

  @ApiBearerAuth()
  @Post('escrow/checkout')
  @ApiOperation({ summary: 'Paiement Escrow — virement bancaire sécurisé' })
  escrowCheckout(
    @CurrentUser('id') userId: string,
    @Body() body: { orderIds: string[] },
  ) {
    return this.paymentsService.createEscrowCheckout(body.orderIds, userId);
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
