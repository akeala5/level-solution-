import { Injectable, BadRequestException, ForbiddenException, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { getPaginationParams, paginate } from '../common/utils/pagination.util';

@Injectable()
export class ReviewsService {
  constructor(private prisma: PrismaService) {}

  async createReview(buyerId: string, data: {
    orderId: string;
    productId: string;
    rating: number;
    ratingComm?: number;
    ratingDesc?: number;
    ratingDelivery?: number;
    comment?: string;
  }) {
    const order = await this.prisma.order.findUnique({
      where: { id: data.orderId },
      select: { buyerId: true, sellerId: true, status: true },
    });

    if (!order) throw new NotFoundException('Commande introuvable');
    if (order.buyerId !== buyerId) throw new ForbiddenException('Non autorisé');
    if (order.status !== 'COMPLETED') throw new BadRequestException('La commande doit être complétée avant de laisser un avis');

    const existing = await this.prisma.review.findUnique({ where: { orderId: data.orderId } });
    if (existing) throw new BadRequestException('Vous avez déjà laissé un avis pour cette commande');

    if (data.rating < 1 || data.rating > 5) throw new BadRequestException('La note doit être entre 1 et 5');

    const review = await this.prisma.review.create({
      data: {
        orderId: data.orderId,
        productId: data.productId,
        giverId: buyerId,
        receiverId: order.sellerId,
        rating: data.rating,
        ratingComm: data.ratingComm,
        ratingDesc: data.ratingDesc,
        ratingDelivery: data.ratingDelivery,
        comment: data.comment,
      },
    });

    // Recalculer la note moyenne du vendeur
    await this.updateSellerRating(order.sellerId);

    return { message: 'Avis publié avec succès', data: review };
  }

  async replyToReview(reviewId: string, sellerId: string, reply: string) {
    const review = await this.prisma.review.findUnique({ where: { id: reviewId } });
    if (!review) throw new NotFoundException('Avis introuvable');
    if (review.receiverId !== sellerId) throw new ForbiddenException('Non autorisé');

    const updated = await this.prisma.review.update({
      where: { id: reviewId },
      data: { sellerReply: reply },
    });

    return { message: 'Réponse publiée', data: updated };
  }

  async getProductReviews(productId: string, page = 1, limit = 10) {
    const { skip, take } = getPaginationParams(page, limit);
    const [reviews, total] = await Promise.all([
      this.prisma.review.findMany({
        where: { productId },
        skip, take,
        orderBy: { createdAt: 'desc' },
        include: {
          giver: { select: { firstName: true, profile: { select: { avatarUrl: true } } } },
        },
      }),
      this.prisma.review.count({ where: { productId } }),
    ]);

    const stats = await this.prisma.review.aggregate({
      where: { productId },
      _avg: { rating: true, ratingComm: true, ratingDesc: true, ratingDelivery: true },
      _count: { rating: true },
    });

    return {
      message: 'Avis récupérés',
      data: reviews,
      stats: {
        average: Math.round((stats._avg.rating || 0) * 10) / 10,
        total: stats._count.rating,
        avgComm: stats._avg.ratingComm,
        avgDesc: stats._avg.ratingDesc,
        avgDelivery: stats._avg.ratingDelivery,
      },
      meta: paginate(total, page, limit),
    };
  }

  async getSellerReviews(sellerId: string, page = 1, limit = 10) {
    const { skip, take } = getPaginationParams(page, limit);
    const [reviews, total] = await Promise.all([
      this.prisma.review.findMany({
        where: { receiverId: sellerId },
        skip, take,
        orderBy: { createdAt: 'desc' },
        include: {
          giver: { select: { firstName: true, profile: { select: { avatarUrl: true } } } },
          product: { select: { title: true, images: { where: { isPrimary: true }, take: 1 } } },
        },
      }),
      this.prisma.review.count({ where: { receiverId: sellerId } }),
    ]);
    return { message: 'Avis vendeur', data: reviews, meta: paginate(total, page, limit) };
  }

  private async updateSellerRating(sellerId: string) {
    const stats = await this.prisma.review.aggregate({
      where: { receiverId: sellerId },
      _avg: { rating: true },
      _count: { rating: true },
    });

    await this.prisma.sellerProfile.upsert({
      where: { userId: sellerId },
      update: {
        avgRating: Math.round((stats._avg.rating || 0) * 10) / 10,
        totalReviews: stats._count.rating,
      },
      create: {
        userId: sellerId,
        shopName: '',
        shopSlug: `shop-${sellerId.slice(0, 8)}`,
        avgRating: stats._avg.rating || 0,
        totalReviews: stats._count.rating,
      },
    });
  }
}
