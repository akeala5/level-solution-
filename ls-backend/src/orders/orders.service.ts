import {
  Injectable,
  NotFoundException,
  BadRequestException,
  ForbiddenException,
} from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { NotificationsService } from '../notifications/notifications.service';
import { WebhooksService } from '../webhooks/webhooks.service';
import { WalletService } from '../wallet/wallet.service';
import { getPaginationParams, paginate } from '../common/utils/pagination.util';
import { v4 as uuidv4 } from 'uuid';

@Injectable()
export class OrdersService {
  // Durée de vie d'une réservation de stock avant restauration automatique.
  // 30 min : marge confortable pour les confirmations Mobile Money (souvent retardées).
  static readonly RESERVATION_TTL_MS = 30 * 60 * 1000;

  constructor(
    private prisma: PrismaService,
    private notifications: NotificationsService,
    private webhooks: WebhooksService,
    private wallet: WalletService,
  ) {}

  private generateOrderNumber(): string {
    const ts = Date.now().toString().slice(-8);
    const rand = uuidv4().split('-')[0].toUpperCase();
    return `LS-${ts}-${rand}`;
  }

  // ─── CRÉER UNE COMMANDE ───────────────────────────────────────────────────────

  async createOrder(buyerId: string, data: {
    productId: string;
    quantity?: number;
    addressId?: string;
    notes?: string;
  }) {
    const product = await this.prisma.product.findUnique({
      where: { id: data.productId, status: 'ACTIVE' },
      include: {
        seller: {
          include: {
            subscription: { select: { plan: true } },
            profile: true,
          },
        },
      },
    });

    if (!product) throw new NotFoundException('Produit introuvable ou indisponible');
    if (product.sellerId === buyerId) throw new BadRequestException('Vous ne pouvez pas acheter votre propre produit');
    if (product.quantity < (data.quantity || 1)) throw new BadRequestException('Stock insuffisant');

    const quantity = data.quantity || 1;
    const subtotal = product.price * quantity;
    const delivery = product.hasDelivery ? (product.deliveryPrice || 0) : 0;
    const totalAmount = subtotal + delivery;

    // Commission dégressive selon le forfait vendeur
    const commissionRates: Record<string, number> = {
      FREE: 0.05, BASIC: 0.045, ESSENTIAL: 0.04,
      PREMIUM: 0.035, PRO: 0.03, BUSINESS: 0.02,
    };
    const sellerPlan = product.seller.subscription?.plan || 'FREE';
    const commissionRate = commissionRates[sellerPlan] ?? 0.05;
    // Commission sur le sous-total uniquement (les frais de port ne sont pas commissionnés)
    const commissionAmount = subtotal * commissionRate;
    const sellerAmount = totalAmount - commissionAmount;

    const order = await this.prisma.$transaction(async (tx) => {
      const newOrder = await tx.order.create({
        data: {
          orderNumber: this.generateOrderNumber(),
          buyerId,
          sellerId: product.sellerId,
          addressId: data.addressId || null,
          totalAmount,
          commissionAmount,
          sellerAmount,
          deliveryAmount: delivery,
          notes: data.notes,
          status: 'PENDING',
          items: {
            create: [{
              productId: product.id,
              title: product.title,
              price: product.price,
              quantity,
              imageUrl: null,
            }],
          },
        },
        include: {
          items: true,
          buyer: { select: { email: true, firstName: true } },
          seller: { select: { email: true, firstName: true } },
        },
      });

      // Décrément CONDITIONNEL atomique : échoue si le stock est devenu
      // insuffisant entre-temps (deux achats simultanés du dernier exemplaire
      // → un seul passe), sans race condition.
      const dec = await tx.product.updateMany({
        where: { id: product.id, quantity: { gte: quantity } },
        data: { quantity: { decrement: quantity } },
      });
      if (dec.count === 0) {
        throw new BadRequestException('Stock insuffisant'); // rollback de la transaction
      }

      // Réservation expirable : si le paiement n'est pas finalisé, le cron
      // restaurera ce stock et annulera la commande (voir stock-reservation.job.ts).
      await tx.stockReservation.create({
        data: {
          productId: product.id,
          orderId: newOrder.id,
          quantity,
          expiresAt: new Date(Date.now() + OrdersService.RESERVATION_TTL_MS),
        },
      });

      return newOrder;
    });

    this.webhooks.dispatch(product.sellerId, 'order.created', {
      orderId: order.id,
      orderNumber: order.orderNumber,
      totalAmount: order.totalAmount,
      sellerAmount: order.sellerAmount,
    }).catch(() => null);

    return { message: 'Commande créée', data: order };
  }

  // ─── CHECKOUT TRANSACTIONNEL (panier complet, groupé par vendeur) ────────────
  // Remplace la boucle client « 1 POST /orders par article » : reçoit tout le
  // panier, crée UNE sous-commande par vendeur (multi-articles) dans UNE seule
  // transaction. Tout échoue ou tout réussit — plus de commandes orphelines.

  async createCheckout(buyerId: string, data: {
    items: { productId: string; quantity?: number }[];
    addressId?: string;
    notes?: string;
  }) {
    if (!data?.items?.length) throw new BadRequestException('Panier vide');
    if (data.items.length > 50) throw new BadRequestException('Panier trop volumineux (50 articles max)');

    // Consolider les doublons (même produit ajouté deux fois)
    const wanted = new Map<string, number>();
    for (const it of data.items) {
      const qty = it.quantity || 1;
      if (!Number.isInteger(qty) || qty < 1) throw new BadRequestException('Quantité invalide');
      wanted.set(it.productId, (wanted.get(it.productId) || 0) + qty);
    }

    const products = await this.prisma.product.findMany({
      where: { id: { in: [...wanted.keys()] }, status: 'ACTIVE' },
      include: { seller: { include: { subscription: { select: { plan: true } } } } },
    });
    if (products.length !== wanted.size) {
      throw new BadRequestException('Un ou plusieurs produits sont introuvables ou indisponibles');
    }
    if (products.some((p) => p.sellerId === buyerId)) {
      throw new BadRequestException('Vous ne pouvez pas acheter votre propre produit');
    }
    for (const p of products) {
      if (p.quantity < wanted.get(p.id)!) {
        throw new BadRequestException(`Stock insuffisant pour « ${p.title} »`);
      }
    }

    // Une sous-commande par vendeur
    const bySeller = new Map<string, typeof products>();
    for (const p of products) {
      const list = bySeller.get(p.sellerId) ?? [];
      list.push(p);
      bySeller.set(p.sellerId, list);
    }

    const commissionRates: Record<string, number> = {
      FREE: 0.05, BASIC: 0.045, ESSENTIAL: 0.04,
      PREMIUM: 0.035, PRO: 0.03, BUSINESS: 0.02,
    };

    const orders = await this.prisma.$transaction(async (tx) => {
      const created: any[] = [];
      let parentId: string | null = null;

      for (const [sellerId, prods] of bySeller) {
        const subtotal = prods.reduce((s, p) => s + p.price * wanted.get(p.id)!, 0);
        const delivery = prods.reduce((s, p) => s + (p.hasDelivery ? p.deliveryPrice || 0 : 0), 0);
        const totalAmount = subtotal + delivery;
        const plan = prods[0].seller.subscription?.plan || 'FREE';
        const commissionRate = commissionRates[plan] ?? 0.05;
        const commissionAmount = subtotal * commissionRate;
        const sellerAmount = totalAmount - commissionAmount;

        const newOrder = await tx.order.create({
          data: {
            orderNumber: this.generateOrderNumber(),
            buyerId,
            sellerId,
            addressId: data.addressId || null,
            totalAmount,
            commissionAmount,
            sellerAmount,
            deliveryAmount: delivery,
            notes: data.notes,
            status: 'PENDING',
            // La 1re commande du panier sert de commande principale ;
            // les suivantes (autres vendeurs) pointent vers elle.
            parentId,
            items: {
              create: prods.map((p) => ({
                productId: p.id,
                title: p.title,
                price: p.price,
                quantity: wanted.get(p.id)!,
                imageUrl: null,
              })),
            },
          },
        });
        if (!parentId) parentId = newOrder.id;

        // Décrément atomique + réservation expirable, par produit (cf. Lot 2)
        for (const p of prods) {
          const qty = wanted.get(p.id)!;
          const dec = await tx.product.updateMany({
            where: { id: p.id, quantity: { gte: qty } },
            data: { quantity: { decrement: qty } },
          });
          if (dec.count === 0) {
            throw new BadRequestException(`Stock insuffisant pour « ${p.title} »`); // rollback total
          }
          await tx.stockReservation.create({
            data: {
              productId: p.id,
              orderId: newOrder.id,
              quantity: qty,
              expiresAt: new Date(Date.now() + OrdersService.RESERVATION_TTL_MS),
            },
          });
        }

        created.push(newOrder);
      }
      return created;
    });

    // Webhooks vendeur hors transaction (non bloquants)
    for (const o of orders) {
      this.webhooks.dispatch(o.sellerId, 'order.created', {
        orderId: o.id,
        orderNumber: o.orderNumber,
        totalAmount: o.totalAmount,
        sellerAmount: o.sellerAmount,
      }).catch(() => null);
    }

    return {
      message: 'Commandes créées',
      data: {
        orderIds: orders.map((o) => o.id),
        primaryOrderId: orders[0].id,
        ordersCount: orders.length,
        totalAmount: orders.reduce((s, o) => s + o.totalAmount, 0),
      },
    };
  }

  // ─── METTRE À JOUR LE STATUT ─────────────────────────────────────────────────

  async updateStatus(orderId: string, userId: string, role: string, status: string, data?: { trackingNumber?: string; trackingUrl?: string; reason?: string }) {
    const order = await this.prisma.order.findUnique({
      where: { id: orderId },
      include: {
        buyer: { select: { email: true, firstName: true } },
        seller: { select: { email: true, firstName: true } },
        items: { select: { productId: true, quantity: true } },
      },
    });

    if (!order) throw new NotFoundException('Commande introuvable');

    // Vérification des permissions
    const allowedTransitions: Record<string, Record<string, string[]>> = {
      SELLER: {
        PAYMENT_CONFIRMED: ['PROCESSING'],
        PROCESSING: ['SHIPPED'],
      },
      BUYER: {
        SHIPPED: ['DELIVERED'],
        DELIVERED: ['COMPLETED'],
        PENDING: ['CANCELLED'],
      },
      ADMIN: {
        PENDING: ['CANCELLED'],
        PAYMENT_CONFIRMED: ['CANCELLED', 'PROCESSING'],
        PROCESSING: ['SHIPPED', 'CANCELLED'],
        SHIPPED: ['DELIVERED'],
        DELIVERED: ['COMPLETED'],
        COMPLETED: ['REFUNDED'],
        DISPUTED: ['COMPLETED', 'REFUNDED'],
      },
    };

    const userRole = role === 'ADMIN' || role === 'MODERATOR' ? 'ADMIN'
      : order.sellerId === userId ? 'SELLER'
      : order.buyerId === userId ? 'BUYER' : null;

    if (!userRole) throw new ForbiddenException('Non autorisé');

    const allowed = allowedTransitions[userRole]?.[order.status];
    if (!allowed || !allowed.includes(status)) {
      throw new BadRequestException(`Transition ${order.status} → ${status} non autorisée`);
    }

    const escrowDelayMs = 48 * 60 * 60 * 1000;

    const updateData: any = {
      status,
      ...(data?.trackingNumber && { trackingNumber: data.trackingNumber }),
      ...(data?.trackingUrl && { trackingUrl: data.trackingUrl }),
      ...(status === 'DELIVERED' && {
        deliveredAt: new Date(),
        escrowReleaseAt: new Date(Date.now() + escrowDelayMs),
      }),
      ...(status === 'COMPLETED' && { completedAt: new Date() }),
      ...(status === 'CANCELLED' && { cancelledAt: new Date(), cancellationReason: data?.reason }),
    };

    let updated: any;

    if (status === 'CANCELLED' && order.items?.length > 0) {
      // Restaurer le stock de chaque article dans une transaction atomique
      const results = await this.prisma.$transaction([
        this.prisma.order.update({ where: { id: orderId }, data: updateData }),
        ...order.items.map((item) =>
          this.prisma.product.update({
            where: { id: item.productId },
            data: { quantity: { increment: item.quantity } },
          }),
        ),
        // Clôturer les réservations liées pour éviter toute double-restauration par le cron
        this.prisma.stockReservation.updateMany({
          where: { orderId, releasedAt: null },
          data: { releasedAt: new Date() },
        }),
      ]);
      updated = results[0];
    } else {
      updated = await this.prisma.order.update({
        where: { id: orderId },
        data: updateData,
      });
    }

    // Notifications
    if (status === 'SHIPPED') {
      await this.notifications.sendOrderShipped(
        order.buyer.email, order.buyer.firstName,
        order.orderNumber, data?.trackingUrl,
      );
    }
    if (status === 'COMPLETED') {
      // Libérer l'escrow et créditer le vendeur
      await this.releaseEscrow(orderId);
    }

    // Dispatch webhook vendeur
    const webhookEventMap: Record<string, string> = {
      PAYMENT_CONFIRMED: 'order.paid',
      SHIPPED: 'order.shipped',
      DELIVERED: 'order.delivered',
      COMPLETED: 'order.completed',
      CANCELLED: 'order.cancelled',
    };
    const webhookEvent = webhookEventMap[status];
    if (webhookEvent) {
      this.webhooks.dispatch(order.sellerId, webhookEvent, {
        orderId: updated.id,
        orderNumber: updated.orderNumber,
        status,
        totalAmount: updated.totalAmount,
        sellerAmount: updated.sellerAmount,
      }).catch(() => null);
    }

    return { message: 'Statut mis à jour', data: updated };
  }

  private async releaseEscrow(orderId: string) {
    // Crédit du portefeuille VENDEUR + fidélité acheteur, idempotent
    // (source unique de vérité : WalletService.creditSellerFromOrder).
    await this.wallet.creditSellerFromOrder(orderId);
  }

  // ─── OUVRIR UN LITIGE ────────────────────────────────────────────────────────

  async openDispute(orderId: string, buyerId: string, data: { reason: string; description: string; evidenceUrls?: string[] }) {
    const order = await this.prisma.order.findUnique({ where: { id: orderId } });
    if (!order) throw new NotFoundException('Commande introuvable');
    if (order.buyerId !== buyerId) throw new ForbiddenException('Non autorisé');
    if (!['DELIVERED', 'SHIPPED'].includes(order.status)) {
      throw new BadRequestException('Vous ne pouvez ouvrir un litige que sur une commande expédiée ou livrée');
    }

    const existing = await this.prisma.dispute.findUnique({ where: { orderId } });
    if (existing) throw new BadRequestException('Un litige est déjà ouvert pour cette commande');

    const [dispute] = await this.prisma.$transaction([
      this.prisma.dispute.create({
        data: {
          orderId,
          initiatorId: buyerId,
          reason: data.reason,
          description: data.description,
          evidenceUrls: data.evidenceUrls || [],
        },
      }),
      this.prisma.order.update({
        where: { id: orderId },
        data: { status: 'DISPUTED' },
      }),
    ]);

    return { message: 'Litige ouvert', data: dispute };
  }

  // ─── RÉCUPÉRER LES COMMANDES ──────────────────────────────────────────────────

  async getBuyerOrders(buyerId: string, page = 1, limit = 20) {
    const { skip, take } = getPaginationParams(page, limit);
    const [orders, total] = await Promise.all([
      this.prisma.order.findMany({
        where: { buyerId },
        skip, take,
        orderBy: { createdAt: 'desc' },
        include: {
          items: {
            include: {
              product: { include: { images: { where: { isPrimary: true }, take: 1 } } },
            },
          },
          seller: { include: { sellerProfile: { select: { shopName: true, shopSlug: true } } } },
          payment: { select: { status: true, method: true } },
          dispute: { select: { status: true } },
          review: { select: { id: true, rating: true } },
        },
      }),
      this.prisma.order.count({ where: { buyerId } }),
    ]);
    return { message: 'Commandes récupérées', data: orders, meta: paginate(total, page, limit) };
  }

  async getSellerOrders(sellerId: string, page = 1, limit = 20, status?: string) {
    const { skip, take } = getPaginationParams(page, limit);
    const where: any = { sellerId };
    if (status) where.status = status;

    const [orders, total] = await Promise.all([
      this.prisma.order.findMany({
        where,
        skip, take,
        orderBy: { createdAt: 'desc' },
        include: {
          items: true,
          buyer: { select: { firstName: true, lastName: true, profile: { select: { avatarUrl: true } } } },
          payment: { select: { status: true, method: true } },
        },
      }),
      this.prisma.order.count({ where }),
    ]);
    return { message: 'Commandes vendeur', data: orders, meta: paginate(total, page, limit) };
  }

  async getOrderById(orderId: string, userId: string, role: string) {
    const order = await this.prisma.order.findUnique({
      where: { id: orderId },
      include: {
        items: { include: { product: { include: { images: { take: 1 } } } } },
        buyer: { select: { id: true, firstName: true, lastName: true, email: true } },
        seller: {
          select: {
            id: true, firstName: true, lastName: true, email: true,
            sellerProfile: { select: { shopName: true, shopPhone: true, shopWhatsapp: true } },
          },
        },
        address: true,
        payment: true,
        review: true,
        dispute: true,
      },
    });

    if (!order) throw new NotFoundException('Commande introuvable');
    if (order.buyerId !== userId && order.sellerId !== userId && role !== 'ADMIN') {
      throw new ForbiddenException('Non autorisé');
    }

    return { message: 'Commande récupérée', data: order };
  }

  // ─── ADMIN ────────────────────────────────────────────────────────────────────

  async adminGetOrders(page = 1, limit = 20, status?: string) {
    const { skip, take } = getPaginationParams(page, limit);
    const where: any = {};
    if (status) where.status = status;

    const [orders, total] = await Promise.all([
      this.prisma.order.findMany({
        where, skip, take,
        orderBy: { createdAt: 'desc' },
        include: {
          buyer: { select: { firstName: true, lastName: true, email: true } },
          seller: { select: { firstName: true, lastName: true, email: true } },
          payment: { select: { status: true, amount: true } },
        },
      }),
      this.prisma.order.count({ where }),
    ]);
    return { data: orders, meta: paginate(total, page, limit) };
  }
}
