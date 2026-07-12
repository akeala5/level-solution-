import {
  Injectable,
  NotFoundException,
  BadRequestException,
  ForbiddenException,
} from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import * as bcrypt from 'bcrypt';
import { generateSlug } from '../common/utils/slug.util';
import {
  UpdateProfileDto,
  UpdateSellerProfileDto,
  ChangePasswordDto,
  CreateAddressDto,
} from './dto/update-user.dto';
import { getPaginationParams, paginate } from '../common/utils/pagination.util';

@Injectable()
export class UsersService {
  constructor(private prisma: PrismaService) {}

  // ─── PROFIL ──────────────────────────────────────────────────────────────────

  async getProfile(userId: string) {
    const user = await this.prisma.user.findUnique({
      where: { id: userId },
      select: {
        id: true,
        email: true,
        phone: true,
        firstName: true,
        lastName: true,
        role: true,
        isEmailVerified: true,
        isPhoneVerified: true,
        isKycVerified: true,
        twoFactorEnabled: true,
        lastLoginAt: true,
        createdAt: true,
        profile: true,
        sellerProfile: true,
        subscription: { select: { plan: true, expiresAt: true, status: true } },
        loyaltyAccount: { select: { points: true, level: true } },
        _count: {
          select: {
            productsAsSeller: { where: { status: 'ACTIVE' } },
            ordersAsBuyer: true,
            favorites: true,
          },
        },
      },
    });

    if (!user) throw new NotFoundException('Utilisateur introuvable');
    return { message: 'Profil récupéré', data: user };
  }

  async updateProfile(userId: string, dto: UpdateProfileDto) {
    const { firstName, lastName, phone, ...profileData } = dto;

    await this.prisma.$transaction([
      this.prisma.user.update({
        where: { id: userId },
        data: {
          ...(firstName && { firstName }),
          ...(lastName && { lastName }),
          ...(phone && { phone }),
        },
      }),
      this.prisma.profile.upsert({
        where: { userId },
        update: profileData,
        create: { userId, ...profileData },
      }),
    ]);

    return this.getProfile(userId);
  }

  async updateAvatar(userId: string, avatarUrl: string) {
    await this.prisma.profile.upsert({
      where: { userId },
      update: { avatarUrl },
      create: { userId, avatarUrl },
    });
    return { message: 'Avatar mis à jour', data: { avatarUrl } };
  }

  async changePassword(userId: string, dto: ChangePasswordDto) {
    const user = await this.prisma.user.findUnique({
      where: { id: userId },
      select: { passwordHash: true },
    });

    const isValid = await bcrypt.compare(dto.currentPassword, user.passwordHash);
    if (!isValid) throw new BadRequestException('Mot de passe actuel incorrect');

    const newHash = await bcrypt.hash(dto.newPassword, 12);
    await this.prisma.user.update({
      where: { id: userId },
      data: { passwordHash: newHash, refreshToken: null },
    });

    return { message: 'Mot de passe modifié avec succès' };
  }

  // ─── PROFIL VENDEUR ───────────────────────────────────────────────────────────

  async getSellerProfile(shopSlug: string) {
    const seller = await this.prisma.sellerProfile.findUnique({
      where: { shopSlug },
      include: {
        user: {
          select: {
            id: true,
            firstName: true,
            lastName: true,
            isKycVerified: true,
            createdAt: true,
            _count: { select: { productsAsSeller: { where: { status: 'ACTIVE' } } } },
          },
        },
      },
    });

    if (!seller) throw new NotFoundException('Boutique introuvable');

    const recentReviews = await this.prisma.review.findMany({
      where: { receiverId: seller.userId },
      orderBy: { createdAt: 'desc' },
      take: 5,
      include: {
        giver: { select: { firstName: true, profile: { select: { avatarUrl: true } } } },
        product: { select: { title: true, images: { where: { isPrimary: true }, take: 1 } } },
      },
    });

    return { message: 'Boutique récupérée', data: { ...seller, recentReviews } };
  }

  async createOrUpdateSellerProfile(userId: string, dto: UpdateSellerProfileDto) {
    const user = await this.prisma.user.findUnique({
      where: { id: userId },
      select: { role: true, firstName: true, lastName: true },
    });

    if (user.role === 'BUYER') {
      await this.prisma.user.update({ where: { id: userId }, data: { role: 'SELLER' } });
    }

    const existing = await this.prisma.sellerProfile.findUnique({ where: { userId } });

    let shopSlug = existing?.shopSlug;
    if (!existing && dto.shopName) {
      shopSlug = generateSlug(dto.shopName);
    }

    const profile = await this.prisma.sellerProfile.upsert({
      where: { userId },
      update: dto,
      create: {
        userId,
        shopName: dto.shopName || `Boutique de ${user.firstName}`,
        shopSlug: shopSlug || generateSlug(`boutique-${user.firstName}-${user.lastName}`),
        ...dto,
      },
    });

    return { message: 'Profil vendeur mis à jour', data: profile };
  }

  // ─── ADRESSES ────────────────────────────────────────────────────────────────

  async getAddresses(userId: string) {
    const addresses = await this.prisma.address.findMany({
      where: { userId },
      orderBy: [{ isDefault: 'desc' }, { createdAt: 'desc' }],
    });
    return { message: 'Adresses récupérées', data: addresses };
  }

  async createAddress(userId: string, dto: CreateAddressDto) {
    const address = await this.prisma.address.create({
      data: { userId, ...dto },
    });
    return { message: 'Adresse ajoutée', data: address };
  }

  async setDefaultAddress(userId: string, addressId: string) {
    await this.prisma.$transaction([
      this.prisma.address.updateMany({ where: { userId }, data: { isDefault: false } }),
      this.prisma.address.update({
        where: { id: addressId, userId },
        data: { isDefault: true },
      }),
    ]);
    return { message: 'Adresse par défaut mise à jour' };
  }

  async deleteAddress(userId: string, addressId: string) {
    await this.prisma.address.deleteMany({ where: { id: addressId, userId } });
    return { message: 'Adresse supprimée' };
  }

  // ─── FAVORIS ─────────────────────────────────────────────────────────────────

  async getFavorites(userId: string, page = 1, limit = 20) {
    const { skip, take } = getPaginationParams(page, limit);
    const [favorites, total] = await Promise.all([
      this.prisma.favorite.findMany({
        where: { userId },
        skip,
        take,
        orderBy: { createdAt: 'desc' },
        include: {
          product: {
            include: {
              images: { where: { isPrimary: true }, take: 1 },
              seller: {
                include: { sellerProfile: { select: { shopName: true, avgRating: true } } },
              },
            },
          },
        },
      }),
      this.prisma.favorite.count({ where: { userId } }),
    ]);

    return {
      message: 'Favoris récupérés',
      data: favorites,
      meta: paginate(total, page, limit),
    };
  }

  async toggleFavorite(userId: string, productId: string) {
    const existing = await this.prisma.favorite.findUnique({
      where: { userId_productId: { userId, productId } },
    });

    if (existing) {
      await this.prisma.$transaction([
        this.prisma.favorite.delete({ where: { userId_productId: { userId, productId } } }),
        this.prisma.product.update({ where: { id: productId }, data: { favoriteCount: { decrement: 1 } } }),
      ]);
      return { message: 'Retiré des favoris', data: { isFavorite: false } };
    } else {
      await this.prisma.$transaction([
        this.prisma.favorite.create({ data: { userId, productId } }),
        this.prisma.product.update({ where: { id: productId }, data: { favoriteCount: { increment: 1 } } }),
      ]);
      return { message: 'Ajouté aux favoris', data: { isFavorite: true } };
    }
  }

  // ─── DASHBOARD VENDEUR ────────────────────────────────────────────────────────

  async getSellerDashboard(userId: string) {
    const [
      activeProducts,
      totalOrders,
      pendingOrders,
      completedOrders,
      totalRevenue,
      recentOrders,
      topProducts,
    ] = await Promise.all([
      this.prisma.product.count({ where: { sellerId: userId, status: 'ACTIVE' } }),
      this.prisma.order.count({ where: { sellerId: userId } }),
      this.prisma.order.count({ where: { sellerId: userId, status: { in: ['PENDING', 'PAYMENT_CONFIRMED', 'PROCESSING'] } } }),
      this.prisma.order.count({ where: { sellerId: userId, status: 'COMPLETED' } }),
      this.prisma.order.aggregate({
        where: { sellerId: userId, status: 'COMPLETED' },
        _sum: { sellerAmount: true },
      }),
      this.prisma.order.findMany({
        where: { sellerId: userId },
        orderBy: { createdAt: 'desc' },
        take: 5,
        include: {
          items: { include: { product: { select: { title: true } } } },
          buyer: { select: { firstName: true, lastName: true } },
        },
      }),
      this.prisma.product.findMany({
        where: { sellerId: userId, status: 'ACTIVE' },
        orderBy: { viewCount: 'desc' },
        take: 5,
        include: { images: { where: { isPrimary: true }, take: 1 } },
      }),
    ]);

    return {
      message: 'Dashboard récupéré',
      data: {
        stats: {
          activeProducts,
          totalOrders,
          pendingOrders,
          completedOrders,
          totalRevenue: totalRevenue._sum.sellerAmount || 0,
        },
        recentOrders,
        topProducts,
      },
    };
  }

  // ─── ANALYTICS VENDEUR ────────────────────────────────────────────────────────

  async getSellerAnalytics(userId: string, period: '7d' | '30d' | '90d') {
    const days = period === '7d' ? 7 : period === '90d' ? 90 : 30;
    const since = new Date();
    since.setDate(since.getDate() - days);

    const PAID = ['PAYMENT_CONFIRMED', 'PROCESSING', 'SHIPPED', 'DELIVERED', 'COMPLETED'];

    const [orders, allStats, topProducts] = await Promise.all([
      this.prisma.order.findMany({
        where: { sellerId: userId, createdAt: { gte: since } },
        select: { id: true, status: true, sellerAmount: true, totalAmount: true, createdAt: true },
      }),
      this.prisma.product.aggregate({
        where: { sellerId: userId },
        _sum: { viewCount: true },
      }),
      this.prisma.product.findMany({
        where: { sellerId: userId },
        orderBy: { viewCount: 'desc' },
        take: 5,
        select: { id: true, title: true, viewCount: true, favoriteCount: true },
      }),
    ]);

    // Revenue chart — initialiser tous les jours à 0
    const revenueMap = new Map<string, { revenue: number; orders: number }>();
    for (let i = 0; i < days; i++) {
      const d = new Date();
      d.setDate(d.getDate() - (days - 1 - i));
      revenueMap.set(d.toISOString().slice(0, 10), { revenue: 0, orders: 0 });
    }
    for (const order of orders) {
      const key = new Date(order.createdAt).toISOString().slice(0, 10);
      if (revenueMap.has(key)) {
        const entry = revenueMap.get(key)!;
        if (PAID.includes(order.status)) entry.revenue += order.sellerAmount || order.totalAmount || 0;
        entry.orders += 1;
      }
    }
    const revenueChart = Array.from(revenueMap.entries()).map(([date, d]) => ({
      date: date.slice(5).replace('-', '/'),
      revenue: Math.round(d.revenue),
      orders: d.orders,
    }));

    // Orders by status
    const statusMap = new Map<string, number>();
    for (const o of orders) statusMap.set(o.status, (statusMap.get(o.status) || 0) + 1);
    const STATUS_LABELS: Record<string, string> = {
      PENDING: 'En attente', PAYMENT_CONFIRMED: 'Confirmé', PROCESSING: 'Préparation',
      SHIPPED: 'Expédié', DELIVERED: 'Livré', COMPLETED: 'Terminé',
      CANCELLED: 'Annulé', DISPUTED: 'Litige',
    };
    const ordersByStatus = Array.from(statusMap.entries())
      .map(([status, count]) => ({ status, label: STATUS_LABELS[status] || status, count }))
      .sort((a, b) => b.count - a.count);

    // Top products avec comptage commandes
    const productIds = topProducts.map(p => p.id);
    const orderCounts = await this.prisma.orderItem.groupBy({
      by: ['productId'],
      where: { productId: { in: productIds } },
      _count: { productId: true },
    });
    const orderCountMap = new Map(orderCounts.map(o => [o.productId, o._count.productId]));
    const topProductsData = topProducts.map(p => {
      const sold = orderCountMap.get(p.id) || 0;
      return {
        title: p.title.length > 30 ? p.title.slice(0, 30) + '…' : p.title,
        viewCount: p.viewCount,
        orderCount: sold,
        favoriteCount: p.favoriteCount,
        conversion: p.viewCount > 0 ? parseFloat(((sold / p.viewCount) * 100).toFixed(1)) : 0,
      };
    });

    // Résumé
    const paidOrders = orders.filter(o => PAID.includes(o.status));
    const totalRevenue = paidOrders.reduce((s, o) => s + (o.sellerAmount || o.totalAmount || 0), 0);
    const totalViews = allStats._sum.viewCount || 0;
    const conversionRate = totalViews > 0
      ? parseFloat(((paidOrders.length / totalViews) * 100).toFixed(2))
      : 0;

    return {
      message: 'Analytiques vendeur',
      data: {
        period,
        revenueChart,
        ordersByStatus,
        topProducts: topProductsData,
        summary: {
          totalRevenue: Math.round(totalRevenue),
          totalOrders: paidOrders.length,
          totalViews,
          conversionRate,
        },
      },
    };
  }

  // ─── KYC ─────────────────────────────────────────────────────────────────────

  async submitKyc(userId: string, data: { documentType: string; frontUrl: string; backUrl?: string; selfieUrl?: string }) {
    const kyc = await this.prisma.kycDocument.upsert({
      where: { userId },
      update: { ...data, status: 'PENDING' },
      create: { userId, ...data },
    });
    return { message: 'Documents KYC soumis, en cours de vérification', data: kyc };
  }

  // ─── LOYAUTE ──────────────────────────────────────────────────────────────────

  async getLoyaltyInfo(userId: string) {
    const account = await this.prisma.loyaltyAccount.findUnique({
      where: { userId },
      include: {
        transactions: {
          orderBy: { createdAt: 'desc' },
          take: 10,
        },
      },
    });
    return { message: 'Programme de fidélité', data: account };
  }

  async getLoyaltyTransactions(userId: string, page = 1, limit = 20) {
    const { skip, take } = getPaginationParams(page, limit);
    const [transactions, total] = await Promise.all([
      this.prisma.loyaltyTransaction.findMany({
        where: { account: { userId } },
        orderBy: { createdAt: 'desc' },
        skip,
        take,
      }),
      this.prisma.loyaltyTransaction.count({ where: { account: { userId } } }),
    ]);
    return { data: transactions, meta: paginate(total, page, limit) };
  }

  async redeemPoints(userId: string, pointsToRedeem: number) {
    if (pointsToRedeem < 100) throw new BadRequestException('Minimum 100 points à échanger');

    const account = await this.prisma.loyaltyAccount.findUnique({ where: { userId } });
    if (!account) throw new BadRequestException('Aucun compte fidélité trouvé');
    if (account.points < pointsToRedeem) {
      throw new BadRequestException(`Solde insuffisant (${account.points} points disponibles)`);
    }

    // 100 points = 500 FCFA de réduction
    const discountAmount = Math.floor(pointsToRedeem / 100) * 500;
    const voucherCode = `LOYALTY-${userId.slice(0, 8).toUpperCase()}-${Date.now()}`;

    await this.prisma.$transaction([
      this.prisma.loyaltyAccount.update({
        where: { userId },
        data: {
          points: { decrement: pointsToRedeem },
          totalSpent: { increment: pointsToRedeem },
        },
      }),
      this.prisma.loyaltyTransaction.create({
        data: {
          accountId: account.id,
          points: -pointsToRedeem,
          type: 'REDEEMED',
          description: `Échange contre bon de réduction de ${discountAmount} FCFA (code: ${voucherCode})`,
        },
      }),
    ]);

    return {
      message: 'Points échangés avec succès',
      data: { voucherCode, discountAmount, pointsUsed: pointsToRedeem },
    };
  }

  // ─── ADMIN: LISTER USERS ─────────────────────────────────────────────────────

  async findAll(page = 1, limit = 20, search?: string) {
    const { skip, take } = getPaginationParams(page, limit);
    const where = search ? {
      OR: [
        { email: { contains: search, mode: 'insensitive' as any } },
        { firstName: { contains: search, mode: 'insensitive' as any } },
        { lastName: { contains: search, mode: 'insensitive' as any } },
      ],
    } : {};

    const [users, total] = await Promise.all([
      this.prisma.user.findMany({
        where,
        skip,
        take,
        orderBy: { createdAt: 'desc' },
        select: {
          id: true, email: true, firstName: true, lastName: true,
          role: true, isEmailVerified: true, isKycVerified: true,
          isSuspended: true, createdAt: true,
          subscription: { select: { plan: true } },
        },
      }),
      this.prisma.user.count({ where }),
    ]);

    return { data: users, meta: paginate(total, page, limit) };
  }

  async suspendUser(userId: string, suspend: boolean) {
    await this.prisma.user.update({
      where: { id: userId },
      data: { isSuspended: suspend },
    });
    return { message: suspend ? 'Compte suspendu' : 'Compte réactivé' };
  }
}
