import {
  Injectable,
  BadRequestException,
  NotFoundException,
  Logger,
} from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { ConfigService } from '@nestjs/config';
import { NotificationsService } from '../notifications/notifications.service';
import { PlanConfigService } from '../common/services/plan-config.service';
import Stripe from 'stripe';

@Injectable()
export class SubscriptionsService {
  private readonly logger = new Logger(SubscriptionsService.name);
  private stripe: Stripe;

  constructor(
    private prisma: PrismaService,
    private configService: ConfigService,
    private notifications: NotificationsService,
    private planConfig: PlanConfigService,
  ) {
    this.stripe = new Stripe(configService.get('stripe.secretKey'), {
      apiVersion: '2023-10-16',
    });
  }

  // ─── LISTE PUBLIQUE DES FORFAITS (consommée par la page /pricing) ────────────

  async getPublicPlans() {
    const plans = await this.planConfig.getActivePlans();
    return { message: 'Forfaits', data: plans };
  }

  // ─── RÉCUPÉRER L'ABONNEMENT ──────────────────────────────────────────────────

  async getUserSubscription(userId: string) {
    const subscription = await this.prisma.subscription.findUnique({ where: { userId } });
    const planConfig = await this.planConfig.getConfig(subscription?.plan || 'FREE');
    const limits = await this.checkListingLimits(userId);

    return {
      message: 'Abonnement récupéré',
      data: { subscription, planConfig, limits },
    };
  }

  // ─── VÉRIFIER LES LIMITES D'ANNONCES ────────────────────────────────────────

  async checkListingLimits(userId: string): Promise<{
    canPost: boolean; used: number; max: number; plan: string;
  }> {
    const subscription = await this.prisma.subscription.findUnique({
      where: { userId },
    });
    const plan = subscription?.plan || 'FREE';
    const cfg = await this.planConfig.getConfig(plan);

    const used = await this.prisma.product.count({
      where: { sellerId: userId, status: { notIn: ['ARCHIVED', 'SOLD'] } },
    });

    return { canPost: used < cfg.maxProducts, used, max: cfg.maxProducts, plan };
  }

  // ─── MISE À NIVEAU VERS UN FORFAIT PAYANT ───────────────────────────────────

  async upgradeSubscription(
    userId: string, plan: string, billingPeriod: 'monthly' | 'yearly',
  ) {
    if (plan === 'FREE') throw new BadRequestException('Le forfait gratuit ne nécessite pas de paiement');

    const cfg = await this.planConfig.getConfig(plan);
    // getConfig retombe sur FREE si le plan est inconnu → on rejette explicitement.
    if (!cfg || cfg.plan !== plan || !cfg.isActive) {
      throw new BadRequestException('Forfait invalide ou indisponible');
    }

    const user = await this.prisma.user.findUnique({
      where: { id: userId },
      select: { email: true, firstName: true },
    });

    const amount = billingPeriod === 'yearly' ? cfg.yearlyPrice : cfg.monthlyPrice;
    if (!amount || amount <= 0) throw new BadRequestException('Tarif indisponible pour ce forfait');

    const session = await this.stripe.checkout.sessions.create({
      mode: 'payment',
      payment_method_types: ['card'],
      customer_email: user.email,
      line_items: [{
        price_data: {
          currency: 'xof',
          product_data: {
            name: `Forfait LS ${cfg.name} (${billingPeriod === 'monthly' ? 'mensuel' : 'annuel'})`,
            description: `${cfg.maxProducts} annonces · Commission ${(cfg.commission * 100).toFixed(1)}%`,
          },
          // XOF = devise SANS décimale chez Stripe : unit_amount = montant entier
          // exact (2000 = 2000 FCFA). L'ancien code envoyait 500000 pour BASIC
          // (×250) — bug de surfacturation corrigé ici en lisant la table.
          unit_amount: Math.round(amount),
        },
        quantity: 1,
      }],
      metadata: { userId, plan, billingPeriod },
      success_url: `${this.configService.get('frontendUrl')}/dashboard?subscription=success&plan=${plan}`,
      cancel_url: `${this.configService.get('frontendUrl')}/pricing?cancelled=true`,
    });

    return {
      message: 'Session de paiement créée',
      data: { checkoutUrl: session.url, sessionId: session.id },
    };
  }

  // ─── ACTIVER UN ABONNEMENT APRÈS PAIEMENT ───────────────────────────────────

  async activateSubscription(
    userId: string, plan: string, billingPeriod: 'monthly' | 'yearly',
  ) {
    const durationMonths = billingPeriod === 'yearly' ? 12 : 1;
    const expiresAt = new Date();
    expiresAt.setMonth(expiresAt.getMonth() + durationMonths);

    await this.prisma.subscription.upsert({
      where: { userId },
      update: { plan: plan as any, status: 'ACTIVE', expiresAt, autoRenew: false },
      create: { userId, plan: plan as any, status: 'ACTIVE', expiresAt, autoRenew: false },
    });

    await this.notifications.createNotification({
      userId,
      type: 'SUBSCRIPTION_RENEWED',
      title: `Forfait ${plan} activé !`,
      titleEn: `Plan ${plan} activated!`,
      body: `Votre forfait ${plan} est actif jusqu'au ${expiresAt.toLocaleDateString('fr-FR')}.`,
    });

    this.logger.log(`Abonnement ${plan} activé pour user ${userId} jusqu'au ${expiresAt}`);
  }

  // ─── ANNULER UN ABONNEMENT ───────────────────────────────────────────────────

  async cancelSubscription(userId: string) {
    const subscription = await this.prisma.subscription.findUnique({
      where: { userId },
    });
    if (!subscription) throw new NotFoundException('Abonnement introuvable');
    if (subscription.plan === 'FREE') {
      throw new BadRequestException('Aucun abonnement payant à annuler');
    }

    await this.prisma.subscription.update({
      where: { userId },
      data: { autoRenew: false, status: 'CANCELLED' },
    });

    return {
      message: 'Abonnement annulé. Votre accès reste actif jusqu\'à la date d\'expiration.',
      data: { expiresAt: subscription.expiresAt },
    };
  }

  // ─── GÉRER LES ABONNEMENTS EXPIRÉS (appelé par le cron job) ─────────────────

  async handleExpiredSubscriptions(): Promise<number> {
    const now = new Date();
    const expired = await this.prisma.subscription.findMany({
      where: { plan: { not: 'FREE' }, expiresAt: { lt: now } },
      select: { userId: true, plan: true },
    });

    for (const sub of expired) {
      await this.prisma.subscription.update({
        where: { userId: sub.userId },
        data: { plan: 'FREE', status: 'ACTIVE', expiresAt: null },
      });
      await this.notifications.createNotification({
        userId: sub.userId,
        type: 'SUBSCRIPTION_EXPIRING',
        title: 'Abonnement expiré',
        titleEn: 'Subscription expired',
        body: `Votre forfait ${sub.plan} a expiré. Vous êtes maintenant sur le forfait gratuit.`,
      });
    }

    this.logger.log(`Abonnements expirés traités : ${expired.length}`);
    return expired.length;
  }

  // ─── NOTIFIER LES ABONNEMENTS BIENTÔT EXPIRÉS ───────────────────────────────

  async notifyExpiringSubscriptions(): Promise<number> {
    const in7Days = new Date();
    in7Days.setDate(in7Days.getDate() + 7);
    const now = new Date();

    const expiring = await this.prisma.subscription.findMany({
      where: {
        plan: { not: 'FREE' },
        status: 'ACTIVE',
        expiresAt: { gte: now, lte: in7Days },
        autoRenew: false,
      },
      select: { userId: true, plan: true, expiresAt: true },
    });

    for (const sub of expiring) {
      await this.notifications.createNotification({
        userId: sub.userId,
        type: 'SUBSCRIPTION_EXPIRING',
        title: 'Abonnement bientôt expiré',
        titleEn: 'Subscription expiring soon',
        body: `Votre forfait ${sub.plan} expire le ${sub.expiresAt?.toLocaleDateString('fr-FR')}. Renouvelez-le pour continuer à publier vos annonces.`,
      });
    }

    return expiring.length;
  }
}
