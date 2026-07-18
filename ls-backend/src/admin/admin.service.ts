import {
  Injectable,
  NotFoundException,
  BadRequestException,
  Logger,
} from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { NotificationsService } from '../notifications/notifications.service';
import { PaymentsService } from '../payments/payments.service';
import { WalletService } from '../wallet/wallet.service';
import { getPaginationParams, paginate } from '../common/utils/pagination.util';

@Injectable()
export class AdminService {
  private readonly logger = new Logger(AdminService.name);

  constructor(
    private prisma: PrismaService,
    private notifications: NotificationsService,
    private payments: PaymentsService,
    private wallet: WalletService,
  ) {}

  // ─── STATISTIQUES PLATEFORME ─────────────────────────────────────────────────

  async getPlatformStats() {
    const now = new Date();
    const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1);

    const [
      totalUsers, newUsersThisMonth,
      totalProducts, activeProducts, pendingProducts,
      totalOrders, completedOrders, ordersThisMonth,
      totalRevenue, revenueThisMonth,
      totalDisputes, openDisputes,
      totalSellers,
    ] = await Promise.all([
      this.prisma.user.count(),
      this.prisma.user.count({ where: { createdAt: { gte: startOfMonth } } }),
      this.prisma.product.count(),
      this.prisma.product.count({ where: { status: 'ACTIVE' } }),
      this.prisma.product.count({ where: { status: 'PENDING_REVIEW' } }),
      this.prisma.order.count(),
      this.prisma.order.count({ where: { status: 'COMPLETED' } }),
      this.prisma.order.count({ where: { createdAt: { gte: startOfMonth } } }),
      this.prisma.payment.aggregate({
        where: { status: 'COMPLETED' },
        _sum: { amount: true },
      }),
      this.prisma.payment.aggregate({
        where: { status: 'COMPLETED', createdAt: { gte: startOfMonth } },
        _sum: { amount: true },
      }),
      this.prisma.dispute.count(),
      this.prisma.dispute.count({ where: { status: 'OPEN' } }),
      this.prisma.user.count({ where: { role: 'SELLER' } }),
    ]);

    const conversionRate = totalOrders > 0
      ? ((completedOrders / totalOrders) * 100).toFixed(2)
      : '0.00';

    return {
      message: 'Statistiques plateforme',
      data: {
        users: { total: totalUsers, newThisMonth: newUsersThisMonth, sellers: totalSellers },
        products: { total: totalProducts, active: activeProducts, pendingReview: pendingProducts },
        orders: { total: totalOrders, completed: completedOrders, thisMonth: ordersThisMonth, conversionRate: `${conversionRate}%` },
        revenue: {
          total: totalRevenue._sum.amount || 0,
          thisMonth: revenueThisMonth._sum.amount || 0,
          currency: 'XOF',
        },
        disputes: { total: totalDisputes, open: openDisputes },
      },
    };
  }

  // ─── GESTION UTILISATEURS ─────────────────────────────────────────────────────

  async getUsers(page = 1, limit = 20, role?: string, search?: string) {
    const { skip, take } = getPaginationParams(page, limit);
    const where: any = {};
    if (role) where.role = role;
    if (search) {
      where.OR = [
        { firstName: { contains: search, mode: 'insensitive' } },
        { lastName: { contains: search, mode: 'insensitive' } },
        { email: { contains: search, mode: 'insensitive' } },
      ];
    }

    const [users, total] = await Promise.all([
      this.prisma.user.findMany({
        where, skip, take,
        orderBy: { createdAt: 'desc' },
        select: {
          id: true, email: true, firstName: true, lastName: true, role: true,
          isSuspended: true, isEmailVerified: true, isKycVerified: true,
          createdAt: true, lastLoginAt: true,
          subscription: { select: { plan: true } },
          _count: { select: { productsAsSeller: true, ordersAsBuyer: true } },
        },
      }),
      this.prisma.user.count({ where }),
    ]);

    return { message: 'Utilisateurs récupérés', data: users, meta: paginate(total, page, limit) };
  }

  async suspendUser(userId: string, reason: string, adminId: string) {
    const user = await this.prisma.user.findUnique({ where: { id: userId } });
    if (!user) throw new NotFoundException('Utilisateur introuvable');
    if (user.role === 'ADMIN') throw new BadRequestException('Impossible de suspendre un admin');

    await this.prisma.$transaction([
      this.prisma.user.update({
        where: { id: userId },
        data: { isSuspended: true },
      }),
      this.prisma.auditLog.create({
        data: {
          userId: adminId,
          action: 'SUSPEND_USER',
          entity: 'User',
          entityId: userId,
          newData: { reason },
        },
      }),
    ]);

    await this.notifications.createNotification({
      userId,
      type: 'SYSTEM',
      title: 'Compte suspendu',
      body: `Votre compte a été suspendu. Raison : ${reason}`,
    });

    return { message: 'Utilisateur suspendu' };
  }

  async unsuspendUser(userId: string, adminId: string) {
    await this.prisma.$transaction([
      this.prisma.user.update({
        where: { id: userId },
        data: { isSuspended: false },
      }),
      this.prisma.auditLog.create({
        data: {
          userId: adminId,
          action: 'UNSUSPEND_USER',
          entity: 'User',
          entityId: userId,
        },
      }),
    ]);
    return { message: 'Suspension levée' };
  }

  // ─── MODÉRATION ANNONCES ──────────────────────────────────────────────────────

  async getPendingProducts(page = 1, limit = 20) {
    const { skip, take } = getPaginationParams(page, limit);

    const [products, total] = await Promise.all([
      this.prisma.product.findMany({
        where: { status: 'PENDING_REVIEW' },
        skip, take,
        orderBy: { createdAt: 'asc' },
        include: {
          seller: {
            select: {
              id: true, firstName: true, lastName: true, email: true,
              sellerProfile: { select: { shopName: true } },
            },
          },
          images: { where: { isPrimary: true }, take: 1 },
          category: { select: { name: true } },
        },
      }),
      this.prisma.product.count({ where: { status: 'PENDING_REVIEW' } }),
    ]);

    return { message: 'Annonces en attente', data: products, meta: paginate(total, page, limit) };
  }

  async approveProduct(productId: string, adminId: string) {
    const product = await this.prisma.product.findUnique({
      where: { id: productId },
      include: { seller: { select: { email: true, firstName: true } } },
    });
    if (!product) throw new NotFoundException('Annonce introuvable');

    await this.prisma.$transaction([
      this.prisma.product.update({
        where: { id: productId },
        data: { status: 'ACTIVE', publishedAt: new Date() },
      }),
      this.prisma.auditLog.create({
        data: {
          userId: adminId,
          action: 'APPROVE_PRODUCT',
          entity: 'Product',
          entityId: productId,
        },
      }),
    ]);

    await this.notifications.createNotification({
      userId: product.sellerId,
      type: 'PRODUCT_APPROVED',
      title: 'Annonce approuvée !',
      titleEn: 'Listing approved!',
      body: `Votre annonce "${product.title}" est maintenant visible sur la plateforme.`,
    });

    return { message: 'Annonce approuvée' };
  }

  async rejectProduct(productId: string, reason: string, adminId: string) {
    const product = await this.prisma.product.findUnique({
      where: { id: productId },
    });
    if (!product) throw new NotFoundException('Annonce introuvable');

    await this.prisma.$transaction([
      this.prisma.product.update({
        where: { id: productId },
        data: { status: 'SUSPENDED', rejectionReason: reason },
      }),
      this.prisma.auditLog.create({
        data: {
          userId: adminId,
          action: 'REJECT_PRODUCT',
          entity: 'Product',
          entityId: productId,
          newData: { reason },
        },
      }),
    ]);

    await this.notifications.createNotification({
      userId: product.sellerId,
      type: 'PRODUCT_REJECTED',
      title: 'Annonce refusée',
      titleEn: 'Listing rejected',
      body: `Votre annonce "${product.title}" a été refusée. Raison : ${reason}`,
    });

    return { message: 'Annonce refusée' };
  }

  // ─── GESTION LITIGES ──────────────────────────────────────────────────────────

  async getDisputes(page = 1, limit = 20, status?: string) {
    const { skip, take } = getPaginationParams(page, limit);
    const where: any = {};
    if (status) where.status = status;

    const [disputes, total] = await Promise.all([
      this.prisma.dispute.findMany({
        where, skip, take,
        orderBy: { createdAt: 'desc' },
        include: {
          order: {
            select: {
              orderNumber: true, totalAmount: true,
              buyer: { select: { firstName: true, lastName: true, email: true } },
              seller: { select: { firstName: true, lastName: true, email: true } },
            },
          },
          initiator: { select: { firstName: true, lastName: true } },
        },
      }),
      this.prisma.dispute.count({ where }),
    ]);

    return { message: 'Litiges récupérés', data: disputes, meta: paginate(total, page, limit) };
  }

  async resolveDispute(
    disputeId: string,
    resolution: 'RESOLVED_BUYER' | 'RESOLVED_SELLER',
    notes: string,
    adminId: string,
  ) {
    const dispute = await this.prisma.dispute.findUnique({
      where: { id: disputeId },
      include: { order: { include: { buyer: true, seller: true } } },
    });
    if (!dispute) throw new NotFoundException('Litige introuvable');
    if (!['OPEN', 'IN_PROGRESS'].includes(dispute.status)) {
      throw new BadRequestException('Ce litige est déjà résolu');
    }

    if (resolution === 'RESOLVED_BUYER') {
      // Remboursement RÉEL (Stripe carte / FedaPay manuel) + claw-back escrow si besoin.
      // Fait avant la clôture du litige : si le refund échoue, le litige reste ouvert.
      await this.payments.refundOrder(dispute.orderId, { adminId, reason: notes });
    } else {
      // RESOLVED_SELLER : litige tranché pour le vendeur → libérer l'escrow
      // (créditer son portefeuille, idempotent) puis clôturer la commande.
      await this.wallet.creditSellerFromOrder(dispute.orderId);
      await this.prisma.order.updateMany({
        where: { id: dispute.orderId, status: 'DISPUTED' },
        data: { status: 'COMPLETED', completedAt: new Date() },
      });
    }

    await this.prisma.dispute.update({
      where: { id: disputeId },
      data: {
        status: resolution,
        resolution: notes,
        resolvedBy: adminId,
        resolvedAt: new Date(),
      },
    });

    const favoredUser = resolution === 'RESOLVED_BUYER'
      ? dispute.order.buyer
      : dispute.order.seller;

    await this.notifications.createNotification({
      userId: favoredUser.id,
      type: 'DISPUTE_RESOLVED',
      title: 'Litige résolu en votre faveur',
      body: `Le litige pour la commande #${dispute.order.orderNumber} a été résolu. ${notes}`,
    });

    return { message: 'Litige résolu' };
  }

  // Remboursement direct d'une commande par un admin (hors litige).
  async refundOrder(orderId: string, adminId: string, reason?: string) {
    return this.payments.refundOrder(orderId, { adminId, reason });
  }

  // Marquer un litige « en cours d'examen » (transition douce avant résolution).
  async setDisputeInProgress(disputeId: string) {
    const dispute = await this.prisma.dispute.findUnique({ where: { id: disputeId } });
    if (!dispute) throw new NotFoundException('Litige introuvable');
    if (!['OPEN', 'IN_PROGRESS'].includes(dispute.status)) {
      throw new BadRequestException('Ce litige est déjà résolu');
    }
    const updated = await this.prisma.dispute.update({
      where: { id: disputeId },
      data: { status: 'IN_PROGRESS' },
    });
    return { message: 'Litige marqué en cours', data: updated };
  }

  // ─── KYC ─────────────────────────────────────────────────────────────────────

  async getKycDocuments(page = 1, limit = 20, status = 'PENDING') {
    const { skip, take } = getPaginationParams(page, limit);
    const [docs, total] = await Promise.all([
      this.prisma.kycDocument.findMany({
        where: { status },
        skip, take,
        orderBy: { createdAt: 'asc' },
        include: {
          user: { select: { id: true, firstName: true, lastName: true, email: true, createdAt: true } },
        },
      }),
      this.prisma.kycDocument.count({ where: { status } }),
    ]);
    return { message: 'Documents KYC récupérés', data: docs, meta: paginate(total, page, limit) };
  }

  async approveKyc(userId: string, adminId: string) {
    const doc = await this.prisma.kycDocument.findUnique({ where: { userId } });
    if (!doc) throw new NotFoundException('Aucun document KYC pour cet utilisateur');

    await this.prisma.$transaction([
      this.prisma.kycDocument.update({
        where: { userId },
        data: { status: 'APPROVED', reviewedAt: new Date(), reviewedBy: adminId },
      }),
      this.prisma.user.update({
        where: { id: userId },
        data: { isKycVerified: true },
      }),
      this.prisma.auditLog.create({
        data: { userId: adminId, action: 'APPROVE_KYC', entity: 'KycDocument', entityId: doc.id },
      }),
    ]);

    await this.notifications.createNotification({
      userId,
      type: 'ACCOUNT_VERIFIED',
      title: 'Identité vérifiée ✓',
      body: 'Votre identité a été vérifiée avec succès. Vous bénéficiez maintenant du badge Vendeur Vérifié.',
    });

    return { message: 'KYC approuvé' };
  }

  async rejectKyc(userId: string, notes: string, adminId: string) {
    const doc = await this.prisma.kycDocument.findUnique({ where: { userId } });
    if (!doc) throw new NotFoundException('Aucun document KYC pour cet utilisateur');

    await this.prisma.$transaction([
      this.prisma.kycDocument.update({
        where: { userId },
        data: { status: 'REJECTED', notes, reviewedAt: new Date(), reviewedBy: adminId },
      }),
      this.prisma.auditLog.create({
        data: { userId: adminId, action: 'REJECT_KYC', entity: 'KycDocument', entityId: doc.id, newData: { notes } },
      }),
    ]);

    await this.notifications.createNotification({
      userId,
      type: 'SYSTEM',
      title: 'Vérification d\'identité refusée',
      body: `Votre demande de vérification a été refusée. Motif : ${notes}. Veuillez soumettre de nouveaux documents.`,
    });

    return { message: 'KYC refusé' };
  }

  // ─── ESCROW ───────────────────────────────────────────────────────────────────

  async getPendingEscrowPayments(page = 1, limit = 20) {
    const { skip, take } = getPaginationParams(page, limit);

    const [payments, total] = await Promise.all([
      this.prisma.payment.findMany({
        where: { method: 'BANK_TRANSFER', status: 'PENDING' },
        skip, take,
        orderBy: { createdAt: 'asc' },
        include: {
          order: {
            select: {
              id: true, orderNumber: true, totalAmount: true, createdAt: true,
              buyer: { select: { id: true, firstName: true, lastName: true, email: true } },
              seller: { select: { firstName: true, lastName: true, email: true } },
            },
          },
        },
      }),
      this.prisma.payment.count({ where: { method: 'BANK_TRANSFER', status: 'PENDING' } }),
    ]);

    return { message: 'Virements Escrow en attente', data: payments, meta: paginate(total, page, limit) };
  }

  async confirmEscrowPayment(ref: string, adminId: string) {
    const payments = await this.prisma.payment.findMany({
      where: { providerRef: ref, method: 'BANK_TRANSFER', status: 'PENDING' },
      include: { order: { include: { buyer: true } } },
    });

    if (!payments.length) throw new NotFoundException(`Aucun virement Escrow en attente pour la référence ${ref}`);

    await this.prisma.$transaction([
      ...payments.map((p) => this.prisma.payment.update({
        where: { id: p.id },
        data: { status: 'COMPLETED' },
      })),
      ...payments.map((p) => this.prisma.order.update({
        where: { id: p.orderId },
        data: { status: 'PAYMENT_CONFIRMED' },
      })),
      this.prisma.auditLog.create({
        data: {
          userId: adminId,
          action: 'CONFIRM_ESCROW',
          entity: 'Payment',
          entityId: ref,
          newData: { orderIds: payments.map((p) => p.orderId), ref },
        },
      }),
    ]);

    const buyer = payments[0].order.buyer;
    await this.notifications.createNotification({
      userId: buyer.id,
      type: 'PAYMENT_RECEIVED',
      title: 'Virement reçu — commande confirmée',
      body: `Votre virement (réf. ${ref}) a été reçu et validé. Votre commande est maintenant en cours de traitement.`,
    });

    this.logger.log(`Escrow confirmé — ref ${ref} par admin ${adminId} (${payments.length} commande(s))`);
    return { message: `Virement Escrow confirmé — ${payments.length} commande(s) passée(s) en PAYMENT_CONFIRMED` };
  }

  async rejectEscrowPayment(ref: string, reason: string, adminId: string) {
    const payments = await this.prisma.payment.findMany({
      where: { providerRef: ref, method: 'BANK_TRANSFER', status: 'PENDING' },
      include: { order: { include: { buyer: true } } },
    });

    if (!payments.length) throw new NotFoundException(`Aucun virement Escrow en attente pour la référence ${ref}`);

    await this.prisma.$transaction([
      ...payments.map((p) => this.prisma.payment.update({
        where: { id: p.id },
        data: { status: 'FAILED' },
      })),
      ...payments.map((p) => this.prisma.order.update({
        where: { id: p.orderId },
        data: { status: 'CANCELLED', cancellationReason: `Virement non reçu : ${reason}` },
      })),
      this.prisma.auditLog.create({
        data: {
          userId: adminId,
          action: 'REJECT_ESCROW',
          entity: 'Payment',
          entityId: ref,
          newData: { reason, orderIds: payments.map((p) => p.orderId) },
        },
      }),
    ]);

    const buyer = payments[0].order.buyer;
    await this.notifications.createNotification({
      userId: buyer.id,
      type: 'SYSTEM',
      title: 'Virement non reçu — commande annulée',
      body: `Nous n'avons pas reçu votre virement (réf. ${ref}). Motif : ${reason}. Contactez le support si besoin.`,
    });

    this.logger.log(`Escrow rejeté — ref ${ref} par admin ${adminId}`);
    return { message: `Virement Escrow rejeté — ${payments.length} commande(s) annulée(s)` };
  }

  // ─── TRANSACTIONS ──────────────────────────────────────────────────────────────

  async getPayments(page = 1, limit = 20, status?: string) {
    const { skip, take } = getPaginationParams(page, limit);
    const where: any = {};
    if (status) where.status = status;

    const [payments, total] = await Promise.all([
      this.prisma.payment.findMany({
        where, skip, take,
        orderBy: { createdAt: 'desc' },
        include: {
          order: {
            select: {
              orderNumber: true,
              buyer: { select: { firstName: true, email: true } },
              seller: { select: { firstName: true, email: true } },
            },
          },
        },
      }),
      this.prisma.payment.count({ where }),
    ]);

    return { message: 'Transactions récupérées', data: payments, meta: paginate(total, page, limit) };
  }
}
