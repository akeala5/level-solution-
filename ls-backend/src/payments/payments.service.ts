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

    const frontendUrl = this.configService.get<string>('frontendUrl')?.replace(/\/$/, '');

    const session = await this.stripe.checkout.sessions.create({
      mode: 'payment',
      payment_method_types: ['card'],
      customer_email: order.buyer.email,
      line_items: [{
        price_data: {
          currency: currency.toLowerCase(),
          product_data: { name: `Commande LS #${order.orderNumber}` },
          unit_amount: Math.round(order.totalAmount * 100),
        },
        quantity: 1,
      }],
      metadata: { orderId, orderNumber: order.orderNumber },
      success_url: `${frontendUrl}/orders/${orderId}?payment=success`,
      cancel_url: `${frontendUrl}/checkout?payment=cancelled`,
    });

    await this.prisma.payment.upsert({
      where: { orderId },
      update: { providerRef: session.id, method: 'STRIPE_CARD', status: 'PENDING' },
      create: {
        orderId,
        amount: order.totalAmount,
        currency: currency.toUpperCase(),
        method: 'STRIPE_CARD',
        status: 'PENDING',
        providerRef: session.id,
        escrowAmount: order.totalAmount,
      },
    });

    return {
      message: 'Session de paiement Stripe créée',
      data: {
        checkoutUrl: session.url,
        sessionId: session.id,
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
      case 'checkout.session.completed': {
        const session = event.data.object as Stripe.Checkout.Session;
        if (session.payment_status === 'paid') {
          // Confirme TOUTES les commandes liées à cette session (cas multi-commandes)
          const payments = await this.prisma.payment.findMany({ where: { providerRef: session.id } });
          await Promise.all(payments.map((p) => this.confirmPayment(p.orderId, session.id)));
        }
        break;
      }
      case 'payment_intent.succeeded': {
        const pi = event.data.object as Stripe.PaymentIntent;
        if (pi.metadata?.orderId) {
          await this.confirmPayment(pi.metadata.orderId, pi.id);
        }
        break;
      }
      case 'payment_intent.payment_failed': {
        const pi = event.data.object as Stripe.PaymentIntent;
        if (pi.metadata?.orderId) {
          await this.failPayment(pi.metadata.orderId);
        }
        break;
      }
    }

    return { received: true };
  }

  // ─── FEDAPAY (Mobile Money Afrique) ──────────────────────────────────────────

  async createFedaPayTransaction(orderId: string, method: string, phoneNumber: string, country?: string) {
    const order = await this.prisma.order.findUnique({
      where: { id: orderId },
      include: {
        buyer: { select: { email: true, firstName: true, lastName: true } },
      },
    });

    if (!order) throw new BadRequestException('Commande introuvable');

    // Mapping opérateur → code FedaPay (clé = "PAYS:Opérateur")
    const methodMap: Record<string, string> = {
      // Bénin
      'BJ:MTN':          'mtn_open',
      'BJ:Moov':         'moov_bj',
      'BJ:Celtis':       'moov_bj',
      'BJ:BMO':          'moov_bj',
      'BJ:Coris Money':  'moov_bj',
      // Togo
      'TG:Mixx By Yas':  'togocel',
      'TG:Moov':         'flooz',
      // Guinée
      'GN:MTN':          'mtn_gn',
      // Côte d'Ivoire
      'CI:MTN':          'mtn',
      'CI:Moov':         'moov',
      'CI:Wave':         'wave_ci',
      'CI:Orange':       'orange_money',
      // Niger
      'NE:Airtel':       'airtel_ne',
      // Sénégal
      'SN:Wave':         'wave_sn',
      'SN:Orange':       'orange_sn',
      'SN:Free Sénégal': 'free_money',
      // Mali
      'ML:Orange':       'orange_ml',
      // Héritage (anciens codes envoyés par le frontend v1)
      'FEDAPAY_WAVE':         'wave_ci',
      'FEDAPAY_ORANGE_MONEY': 'orange_money',
      'FEDAPAY_MTN_MOMO':     'mtn',
      'FEDAPAY_TMONEY':       'togocel',
      'FEDAPAY_FLOOZ':        'flooz',
      'FEDAPAY_MOOV':         'moov',
    };

    const fedapayMethod = methodMap[method];
    if (!fedapayMethod) throw new BadRequestException(`Méthode de paiement non supportée : ${method}`);

    // Le pays vient du frontend (via le sélecteur indicatif) ; fallback sur l'extraction de la clé
    const phoneCountry = country || method.split(':')[0] || 'TG';

    const frontendUrl = this.configService.get<string>('frontendUrl')?.replace(/\/$/, '');
    const appUrl = this.configService.get<string>('appUrl')?.replace(/\/$/, '');
    const callbackUrl = `${appUrl}/api/v1/payments/fedapay/callback`;
    const returnUrl  = `${frontendUrl}/orders/${orderId}?payment=success`;
    const cancelUrl  = `${frontendUrl}/checkout?payment=cancelled`;

    try {
      const fedapayHeaders = {
        Authorization: `Bearer ${this.fedapaySecretKey}`,
        'Content-Type': 'application/json',
      };
      const fedapayTimeout = 20000;

      const response = await axios.post(
        `${this.fedapayBaseUrl}/transactions`,
        {
          description: `Commande LS #${order.orderNumber}`,
          amount: Math.round(order.totalAmount),
          currency: { iso: 'XOF' },
          callback_url: callbackUrl,
          return_url:  returnUrl,
          cancel_url:  cancelUrl,
          customer: {
            email: order.buyer.email,
            firstname: order.buyer.firstName || 'Client',
            lastname: order.buyer.lastName || 'LS',
            phone_number: { number: phoneNumber, country: phoneCountry },
          },
        },
        { headers: fedapayHeaders, timeout: fedapayTimeout },
      );

      this.logger.log('FedaPay response: ' + JSON.stringify(response.data));

      // La clé de réponse FedaPay est littéralement "v1/transaction"
      const transaction = response.data?.['v1/transaction'] ?? response.data?.transaction ?? response.data;

      if (!transaction?.id) {
        throw new Error('Réponse FedaPay inattendue : ' + JSON.stringify(response.data));
      }

      const paymentToken = transaction.payment_token as string;
      // Utiliser directement l'URL fournie par FedaPay dans la réponse
      const paymentUrl = transaction.payment_url as string;

      // Mappe PAYS:Opérateur → enum PaymentMethod valide en DB
      const methodForDb = this.mapToPaymentMethodEnum(method);

      await this.prisma.payment.upsert({
        where: { orderId },
        update: {
          providerRef: String(transaction.id),
          method: methodForDb,
          status: 'PENDING',
        },
        create: {
          orderId,
          amount: order.totalAmount,
          currency: 'XOF',
          method: methodForDb,
          status: 'PENDING',
          providerRef: String(transaction.id),
          escrowAmount: order.totalAmount,
        },
      });

      return {
        message: 'Transaction FedaPay créée',
        data: {
          transactionId: transaction.id,
          paymentUrl: paymentUrl,
          token: paymentToken,
        },
      };
    } catch (error) {
      const detail = error.response?.data
        ? JSON.stringify(error.response.data)
        : error.message;
      this.logger.error(`FedaPay error [${method}]: ${detail}`);
      throw new BadRequestException(
        error.response?.data?.message || error.response?.data?.errors?.[0]?.message || 'Erreur lors de la création du paiement Mobile Money',
      );
    }
  }

  // ─── FEDAPAY MULTI-COMMANDES (panier multi-articles) ────────────────────────

  async createFedaPayCheckout(orderIds: string[], method: string, phoneNumber: string, country?: string) {
    if (!orderIds.length) throw new BadRequestException('Aucune commande fournie');

    const orders = await this.prisma.order.findMany({
      where: { id: { in: orderIds } },
      include: { buyer: { select: { email: true, firstName: true, lastName: true } } },
    });
    if (orders.length !== orderIds.length) throw new BadRequestException('Certaines commandes sont introuvables');

    const methodMap: Record<string, string> = {
      'BJ:MTN': 'mtn_open', 'BJ:Moov': 'moov_bj', 'BJ:Celtis': 'moov_bj', 'BJ:BMO': 'moov_bj', 'BJ:Coris Money': 'moov_bj',
      'TG:Mixx By Yas': 'togocel', 'TG:Moov': 'flooz',
      'GN:MTN': 'mtn_gn',
      'CI:MTN': 'mtn', 'CI:Moov': 'moov', 'CI:Wave': 'wave_ci', 'CI:Orange': 'orange_money',
      'NE:Airtel': 'airtel_ne',
      'SN:Wave': 'wave_sn', 'SN:Orange': 'orange_sn', 'SN:Free Sénégal': 'free_money',
      'ML:Orange': 'orange_ml',
    };
    const fedapayMethod = methodMap[method];
    if (!fedapayMethod) throw new BadRequestException(`Méthode non supportée : ${method}`);

    const buyer = orders[0].buyer;
    const primaryOrder = orders[0];
    const totalAmount = Math.round(orders.reduce((s, o) => s + o.totalAmount, 0));
    const phoneCountry = country || method.split(':')[0] || 'TG';

    const frontendUrl = this.configService.get<string>('frontendUrl')?.replace(/\/$/, '');
    const appUrl = this.configService.get<string>('appUrl')?.replace(/\/$/, '');

    try {
      const response = await axios.post(
        `${this.fedapayBaseUrl}/transactions`,
        {
          description: `Commande LS (${orders.length} article${orders.length > 1 ? 's' : ''})`,
          amount: totalAmount,
          currency: { iso: 'XOF' },
          callback_url: `${appUrl}/api/v1/payments/fedapay/callback`,
          return_url: `${frontendUrl}/orders/${primaryOrder.id}?payment=success`,
          cancel_url: `${frontendUrl}/checkout?payment=cancelled`,
          customer: {
            email: buyer.email,
            firstname: buyer.firstName || 'Client',
            lastname: buyer.lastName || 'LS',
            phone_number: { number: phoneNumber, country: phoneCountry },
          },
        },
        { headers: { Authorization: `Bearer ${this.fedapaySecretKey}`, 'Content-Type': 'application/json' }, timeout: 20000 },
      );

      const transaction = response.data?.['v1/transaction'] ?? response.data?.transaction ?? response.data;
      if (!transaction?.id) throw new Error('Réponse FedaPay inattendue : ' + JSON.stringify(response.data));

      const providerRef = String(transaction.id);
      const methodForDb = this.mapToPaymentMethodEnum(method);

      // Créer un enregistrement de paiement pour CHAQUE commande avec le MÊME providerRef
      await Promise.all(orders.map((order) =>
        this.prisma.payment.upsert({
          where: { orderId: order.id },
          update: { providerRef, method: methodForDb, status: 'PENDING' },
          create: { orderId: order.id, amount: order.totalAmount, currency: 'XOF', method: methodForDb, status: 'PENDING', providerRef, escrowAmount: order.totalAmount },
        })
      ));

      return {
        message: 'Transaction FedaPay créée',
        data: { transactionId: transaction.id, paymentUrl: transaction.payment_url as string, token: transaction.payment_token as string },
      };
    } catch (error) {
      const detail = error.response?.data ? JSON.stringify(error.response.data) : error.message;
      this.logger.error(`FedaPay checkout error [${method}]: ${detail}`);
      throw new BadRequestException(
        error.response?.data?.message || error.response?.data?.errors?.[0]?.message || 'Erreur lors de la création du paiement Mobile Money',
      );
    }
  }

  // ─── STRIPE MULTI-COMMANDES ────────────────────────────────────────────────

  async createStripeCheckout(orderIds: string[]) {
    if (!orderIds.length) throw new BadRequestException('Aucune commande fournie');

    const orders = await this.prisma.order.findMany({
      where: { id: { in: orderIds } },
      include: { buyer: { select: { email: true } } },
    });
    if (orders.length !== orderIds.length) throw new BadRequestException('Certaines commandes sont introuvables');

    const buyer = orders[0].buyer;
    const primaryOrder = orders[0];
    const totalAmountCents = Math.round(orders.reduce((s, o) => s + o.totalAmount, 0) * 100);
    const frontendUrl = this.configService.get<string>('frontendUrl')?.replace(/\/$/, '');

    const session = await this.stripe.checkout.sessions.create({
      mode: 'payment',
      payment_method_types: ['card'],
      customer_email: buyer.email,
      line_items: [{
        price_data: {
          currency: 'xof',
          product_data: { name: `Commande LS (${orders.length} article${orders.length > 1 ? 's' : ''})` },
          unit_amount: totalAmountCents,
        },
        quantity: 1,
      }],
      metadata: { orderIds: orderIds.join(','), primaryOrderId: primaryOrder.id },
      success_url: `${frontendUrl}/orders/${primaryOrder.id}?payment=success`,
      cancel_url: `${frontendUrl}/checkout?payment=cancelled`,
    });

    await Promise.all(orders.map((order) =>
      this.prisma.payment.upsert({
        where: { orderId: order.id },
        update: { providerRef: session.id, method: 'STRIPE_CARD', status: 'PENDING' },
        create: { orderId: order.id, amount: order.totalAmount, currency: 'XOF', method: 'STRIPE_CARD', status: 'PENDING', providerRef: session.id, escrowAmount: order.totalAmount },
      })
    ));

    return {
      message: 'Session Stripe créée',
      data: { checkoutUrl: session.url, sessionId: session.id },
    };
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

      // Récupère TOUS les paiements liés à ce providerRef (cas multi-commandes)
      const payments = await this.prisma.payment.findMany({
        where: { providerRef: String(transaction.id) },
      });
      if (!payments.length) return;

      if (transaction.status === 'approved') {
        await Promise.all(payments.map((p) => this.confirmPayment(p.orderId, String(transaction.id))));
      } else if (['declined', 'cancelled'].includes(transaction.status)) {
        await Promise.all(payments.map((p) => this.failPayment(p.orderId)));
      }
    } catch (error) {
      this.logger.error('FedaPay callback error:', error.message);
    }
  }

  // ─── HELPERS ─────────────────────────────────────────────────────────────────

  getFrontendUrl(): string {
    return this.configService.get<string>('frontendUrl')?.replace(/\/$/, '') || '';
  }

  async verifyFedaPayCallback(transactionId: string): Promise<{ orderId: string | null; confirmed: boolean }> {
    if (!transactionId) return { orderId: null, confirmed: false };
    const payment = await this.prisma.payment.findFirst({
      where: { providerRef: transactionId },
      select: { orderId: true, status: true },
    });
    if (!payment) return { orderId: null, confirmed: false };
    return { orderId: payment.orderId, confirmed: payment.status === 'COMPLETED' };
  }

  private mapToPaymentMethodEnum(method: string): any {
    const map: Record<string, string> = {
      // Togo
      'TG:Mixx By Yas': 'FEDAPAY_TMONEY',
      'TG:Moov':        'FEDAPAY_FLOOZ',
      // Bénin
      'BJ:MTN':         'FEDAPAY_MTN_MOMO',
      'BJ:Moov':        'FEDAPAY_MOOV',
      'BJ:Celtis':      'FEDAPAY_MOOV',
      'BJ:BMO':         'FEDAPAY_MOOV',
      'BJ:Coris Money': 'FEDAPAY_MOOV',
      // Côte d'Ivoire
      'CI:Wave':        'FEDAPAY_WAVE',
      'CI:MTN':         'FEDAPAY_MTN_MOMO',
      'CI:Orange':      'FEDAPAY_ORANGE_MONEY',
      'CI:Moov':        'FEDAPAY_MOOV',
      // Sénégal
      'SN:Wave':        'FEDAPAY_WAVE',
      'SN:Orange':      'FEDAPAY_ORANGE_MONEY',
      'SN:Free Sénégal':'FEDAPAY_MOOV',
      // Mali
      'ML:Orange':      'FEDAPAY_ORANGE_MONEY',
      // Guinée
      'GN:MTN':         'FEDAPAY_MTN_MOMO',
      // Niger
      'NE:Airtel':      'FEDAPAY_MTN_MOMO',
    };
    return map[method] ?? 'FEDAPAY_WAVE';
  }

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

  // ─── ESCROW (Virement bancaire sécurisé) ─────────────────────────────────────

  async createEscrowCheckout(orderIds: string[], buyerId: string) {
    if (!orderIds.length) throw new BadRequestException('Aucune commande fournie');

    const orders = await this.prisma.order.findMany({
      where: { id: { in: orderIds } },
      include: { buyer: { select: { email: true, firstName: true, lastName: true } } },
    });
    if (orders.length !== orderIds.length) throw new BadRequestException('Certaines commandes sont introuvables');

    const wrongOrder = orders.find((o) => o.buyerId !== buyerId);
    if (wrongOrder) throw new UnauthorizedException('Vous n\'êtes pas autorisé à payer ces commandes');

    const primaryOrder = orders[0];
    const totalAmount = orders.reduce((s, o) => s + o.totalAmount, 0);
    const reference = `ESC-${primaryOrder.orderNumber || primaryOrder.id.slice(0, 8).toUpperCase()}`;

    await Promise.all(orders.map((order) =>
      this.prisma.payment.upsert({
        where: { orderId: order.id },
        update: { method: 'BANK_TRANSFER', status: 'PENDING', providerRef: reference },
        create: {
          orderId: order.id,
          amount: order.totalAmount,
          currency: 'XOF',
          method: 'BANK_TRANSFER',
          status: 'PENDING',
          providerRef: reference,
          escrowAmount: order.totalAmount,
        },
      })
    ));

    this.logger.log(`Escrow checkout créé — ref ${reference}, montant ${totalAmount} XOF`);

    return {
      message: 'Commande Escrow créée — en attente de virement',
      data: {
        reference,
        totalAmount,
        primaryOrderId: primaryOrder.id,
        bankName: 'ECOBANK TOGO',
        accountName: 'LS GROUP TOGO SARL',
        accountNumber: 'TG53 TG00 6100 6100 0010 0000 040',
        swift: 'ECOCBJTG',
        note: `Mentionnez impérativement la référence "${reference}" lors du virement.`,
      },
    };
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
