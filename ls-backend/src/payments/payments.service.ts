import { Injectable, BadRequestException, UnauthorizedException, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { PrismaService } from '../prisma/prisma.service';
import Stripe from 'stripe';
import axios from 'axios';
import * as crypto from 'crypto';

@Injectable()
export class PaymentsService {
  private readonly logger = new Logger(PaymentsService.name);
  private stripe: Stripe;
  private fedapayBaseUrl: string;
  private fedapaySecretKey: string;

  constructor(
    private configService: ConfigService,
    private prisma: PrismaService,
  ) {
    this.stripe = new Stripe(configService.get('stripe.secretKey'), {
      apiVersion: '2023-10-16',
    });

    const env = configService.get('fedapay.env');
    this.fedapayBaseUrl = env === 'production'
      ? 'https://api.fedapay.com/v1'
      : 'https://sandbox-api.fedapay.com/v1';
    this.fedapaySecretKey = configService.get('fedapay.secretKey');
  }

  // ─── STRIPE (Carte bancaire) ──────────────────────────────────────────────────

  async createStripePaymentIntent(orderId: string, currency = 'xof') {
    const order = await this.prisma.order.findUnique({
      where: { id: orderId },
      include: { buyer: { select: { email: true } } },
    });

    if (!order) throw new BadRequestException('Commande introuvable');

    const amountInCents = Math.round(order.totalAmount * 100);

    const paymentIntent = await this.stripe.paymentIntents.create({
      amount: amountInCents,
      currency: currency.toLowerCase(),
      metadata: {
        orderId,
        buyerEmail: order.buyer.email,
        orderNumber: order.orderNumber,
      },
    });

    await this.prisma.payment.upsert({
      where: { orderId },
      update: { providerRef: paymentIntent.id, method: 'STRIPE_CARD', status: 'PENDING' },
      create: {
        orderId,
        amount: order.totalAmount,
        currency: currency.toUpperCase(),
        method: 'STRIPE_CARD',
        status: 'PENDING',
        providerRef: paymentIntent.id,
        escrowAmount: order.totalAmount,
      },
    });

    return {
      message: 'Intent de paiement Stripe créé',
      data: {
        clientSecret: paymentIntent.client_secret,
        paymentIntentId: paymentIntent.id,
        publishableKey: this.configService.get('stripe.publishableKey'),
      },
    };
  }

  async handleStripeWebhook(signature: string, payload: Buffer) {
    let event: Stripe.Event;
    try {
      event = this.stripe.webhooks.constructEvent(
        payload,
        signature,
        this.configService.get('stripe.webhookSecret'),
      );
    } catch (err) {
      throw new BadRequestException(`Webhook signature invalide: ${err.message}`);
    }

    switch (event.type) {
      case 'payment_intent.succeeded': {
        const pi = event.data.object as Stripe.PaymentIntent;
        await this.confirmPayment(pi.metadata.orderId, pi.id);
        break;
      }
      case 'payment_intent.payment_failed': {
        const pi = event.data.object as Stripe.PaymentIntent;
        await this.failPayment(pi.metadata.orderId);
        break;
      }
    }

    return { received: true };
  }

  // ─── FEDAPAY (Mobile Money Afrique) ──────────────────────────────────────────

  async createFedaPayTransaction(orderId: string, method: string, phoneNumber: string) {
    const order = await this.prisma.order.findUnique({
      where: { id: orderId },
      include: {
        buyer: { select: { email: true, firstName: true, lastName: true } },
      },
    });

    if (!order) throw new BadRequestException('Commande introuvable');

    const methodMap: Record<string, string> = {
      FEDAPAY_WAVE: 'wave_ci',
      FEDAPAY_ORANGE_MONEY: 'orange_money',
      FEDAPAY_MTN_MOMO: 'mtn',
      FEDAPAY_TMONEY: 'togocel',
      FEDAPAY_FLOOZ: 'flooz',
      FEDAPAY_MOOV: 'moov',
    };

    // Pays réels par méthode Mobile Money
    const countryMap: Record<string, string> = {
      FEDAPAY_WAVE: 'CI',
      FEDAPAY_ORANGE_MONEY: 'CI',
      FEDAPAY_MTN_MOMO: 'CI',
      FEDAPAY_TMONEY: 'TG',
      FEDAPAY_FLOOZ: 'TG',
      FEDAPAY_MOOV: 'BJ',
    };

    const fedapayMethod = methodMap[method];
    if (!fedapayMethod) throw new BadRequestException('Méthode de paiement non supportée');
    const phoneCountry = countryMap[method] || 'TG';

    const callbackUrl = `${this.configService.get('appUrl')}/payments/fedapay/callback`;
    const returnUrl = `${this.configService.get('frontendUrl')}/orders/${orderId}?payment=success`;

    try {
      const response = await axios.post(
        `${this.fedapayBaseUrl}/transactions`,
        {
          description: `Commande LS #${order.orderNumber}`,
          amount: Math.round(order.totalAmount),
          currency: { iso: 'XOF' },
          callback_url: callbackUrl,
          return_url: returnUrl,
          customer: {
            email: order.buyer.email,
            firstname: order.buyer.firstName,
            lastname: order.buyer.lastName,
            phone_number: { number: phoneNumber, country: phoneCountry },
          },
        },
        {
          headers: {
            Authorization: `Bearer ${this.fedapaySecretKey}`,
            'Content-Type': 'application/json',
          },
        },
      );

      const transaction = response.data.v1.transaction;

      // Générer le token de paiement
      const tokenResponse = await axios.post(
        `${this.fedapayBaseUrl}/transactions/${transaction.id}/token`,
        {},
        { headers: { Authorization: `Bearer ${this.fedapaySecretKey}` } },
      );

      const paymentToken = tokenResponse.data.token;

      await this.prisma.payment.upsert({
        where: { orderId },
        update: {
          providerRef: String(transaction.id),
          method: method as any,
          status: 'PENDING',
        },
        create: {
          orderId,
          amount: order.totalAmount,
          currency: 'XOF',
          method: method as any,
          status: 'PENDING',
          providerRef: String(transaction.id),
          escrowAmount: order.totalAmount,
        },
      });

      return {
        message: 'Transaction FedaPay créée',
        data: {
          transactionId: transaction.id,
          paymentUrl: `https://checkout.fedapay.com/${paymentToken}`,
          token: paymentToken,
        },
      };
    } catch (error) {
      this.logger.error('FedaPay error:', error.response?.data || error.message);
      throw new BadRequestException('Erreur lors de la création du paiement Mobile Money');
    }
  }

  async handleFedaPayCallback(rawBody: Buffer, signature?: string) {
    // Vérification HMAC-SHA256 si le secret est configuré
    const webhookSecret = this.configService.get<string>('fedapay.webhookSecret');
    if (webhookSecret && signature) {
      const expectedSig = crypto
        .createHmac('sha256', webhookSecret)
        .update(rawBody)
        .digest('hex');
      if (signature !== `sha256=${expectedSig}`) {
        throw new UnauthorizedException('Signature FedaPay invalide');
      }
    }

    try {
      const data = JSON.parse(rawBody.toString('utf8'));
      const { transaction } = data;
      if (!transaction) return;

      const payment = await this.prisma.payment.findFirst({
        where: { providerRef: String(transaction.id) },
      });

      if (!payment?.orderId) return;

      if (transaction.status === 'approved') {
        await this.confirmPayment(payment.orderId, String(transaction.id));
      } else if (['declined', 'cancelled'].includes(transaction.status)) {
        await this.failPayment(payment.orderId);
      }
    } catch (error) {
      this.logger.error('FedaPay callback error:', error.message);
    }
  }

  // ─── HELPERS ─────────────────────────────────────────────────────────────────

  private async confirmPayment(orderId: string, providerRef: string) {
    await this.prisma.$transaction([
      this.prisma.payment.update({
        where: { orderId },
        data: { status: 'COMPLETED', providerRef },
      }),
      this.prisma.order.update({
        where: { id: orderId },
        data: { status: 'PAYMENT_CONFIRMED' },
      }),
    ]);
    this.logger.log(`Paiement confirmé pour commande ${orderId}`);
  }

  private async failPayment(orderId: string) {
    await this.prisma.$transaction([
      this.prisma.payment.update({
        where: { orderId },
        data: { status: 'FAILED' },
      }),
      this.prisma.order.update({
        where: { id: orderId },
        data: { status: 'CANCELLED', cancellationReason: 'Paiement échoué' },
      }),
    ]);
    this.logger.log(`Paiement échoué pour commande ${orderId}`);
  }

  // ─── ABONNEMENTS STRIPE ───────────────────────────────────────────────────────

  async createSubscriptionCheckout(userId: string, plan: string, billingPeriod: 'monthly' | 'yearly') {
    const prices: Record<string, Record<string, number>> = {
      BASIC: { monthly: 500000, yearly: 5000000 },
      ESSENTIAL: { monthly: 1000000, yearly: 10000000 },
      PREMIUM: { monthly: 2000000, yearly: 20000000 },
      PRO: { monthly: 3500000, yearly: 35000000 },
      BUSINESS: { monthly: 7500000, yearly: 75000000 },
    };

    if (!prices[plan]) throw new BadRequestException('Forfait invalide');

    const amount = prices[plan][billingPeriod];
    const user = await this.prisma.user.findUnique({
      where: { id: userId },
      select: { email: true, firstName: true, lastName: true },
    });

    const session = await this.stripe.checkout.sessions.create({
      mode: 'payment',
      payment_method_types: ['card'],
      customer_email: user.email,
      line_items: [{
        price_data: {
          currency: 'xof',
          product_data: {
            name: `Forfait LS ${plan} (${billingPeriod === 'monthly' ? 'mensuel' : 'annuel'})`,
          },
          unit_amount: amount,
        },
        quantity: 1,
      }],
      metadata: { userId, plan, billingPeriod },
      success_url: `${this.configService.get('frontendUrl')}/dashboard?subscription=success`,
      cancel_url: `${this.configService.get('frontendUrl')}/pricing?cancelled=true`,
    });

    return {
      message: 'Session Stripe créée',
      data: { checkoutUrl: session.url, sessionId: session.id },
    };
  }

  async getPaymentHistory(userId: string) {
    const orders = await this.prisma.order.findMany({
      where: { buyerId: userId },
      select: {
        id: true, orderNumber: true, totalAmount: true, createdAt: true, status: true,
        payment: { select: { method: true, status: true, createdAt: true } },
      },
      orderBy: { createdAt: 'desc' },
      take: 50,
    });
    return { message: 'Historique des paiements', data: orders };
  }
}
