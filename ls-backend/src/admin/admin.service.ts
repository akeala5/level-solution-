import {
  Injectable,
  NotFoundException,
  BadRequestException,
  Logger,
} from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { NotificationsService } from '../notifications/notifications.service';
import { getPaginationParams, paginate } from '../common/utils/pagination.util';

@Injectable()
export class AdminService {
  private readonly logger = new Logger(AdminService.name);

  constructor(
    private prisma: PrismaService,
    private notifications: NotificationsService,
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

    await this.prisma.$transaction([
      this.prisma.dispute.update({
        where: { id: disputeId },
        data: {
          status: resolution,
          resolution: notes,
          resolvedBy: adminId,
          resolvedAt: new Date(),
        },
      }),
      this.prisma.order.update({
        where: { id: dispute.orderId },
        data: {
          status: resolution === 'RESOLVED_BUYER' ? 'REFUNDED' : 'COMPLETED',
        },
      }),
    ]);

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
