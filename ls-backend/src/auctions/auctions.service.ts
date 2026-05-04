import {
  Injectable,
  NotFoundException,
  BadRequestException,
  ForbiddenException,
} from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { NotificationsService } from '../notifications/notifications.service';
import { AuctionStatus } from '@prisma/client';

@Injectable()
export class AuctionsService {
  constructor(
    private prisma: PrismaService,
    private notifications: NotificationsService,
  ) {}

  async createAuction(sellerId: string, dto: {
    productId: string;
    startingPrice: number;
    reservePrice?: number;
    minBidIncrement?: number;
    startsAt: Date;
    endsAt: Date;
  }) {
    const product = await this.prisma.product.findUnique({
      where: { id: dto.productId },
    });
    if (!product) throw new NotFoundException('Produit introuvable');
    if (product.sellerId !== sellerId) throw new ForbiddenException('Ce produit ne vous appartient pas');

    const existing = await this.prisma.auction.findUnique({
      where: { productId: dto.productId },
    });
    if (existing) throw new BadRequestException('Une enchère existe déjà pour ce produit');

    if (new Date(dto.endsAt) <= new Date(dto.startsAt)) {
      throw new BadRequestException('La date de fin doit être postérieure à la date de début');
    }

    return this.prisma.auction.create({
      data: {
        productId: dto.productId,
        startingPrice: dto.startingPrice,
        reservePrice: dto.reservePrice,
        currentPrice: dto.startingPrice,
        minBidIncrement: dto.minBidIncrement ?? 500,
        startsAt: new Date(dto.startsAt),
        endsAt: new Date(dto.endsAt),
        status: AuctionStatus.ACTIVE,
      },
      include: { product: { select: { title: true, images: true } } },
    });
  }

  async findAll(filters: { status?: AuctionStatus; page?: number; limit?: number }) {
    const page = filters.page ?? 1;
    const limit = Math.min(filters.limit ?? 20, 50);
    const skip = (page - 1) * limit;

    const where: any = {};
    if (filters.status) where.status = filters.status;
    else where.status = AuctionStatus.ACTIVE;

    const [auctions, total] = await Promise.all([
      this.prisma.auction.findMany({
        where,
        skip,
        take: limit,
        orderBy: { endsAt: 'asc' },
        include: {
          product: { select: { id: true, title: true, images: true, sellerId: true } },
          _count: { select: { bids: true } },
        },
      }),
      this.prisma.auction.count({ where }),
    ]);

    return { auctions, total, page, totalPages: Math.ceil(total / limit) };
  }

  async findOne(id: string) {
    const auction = await this.prisma.auction.findUnique({
      where: { id },
      include: {
        product: {
          select: { id: true, title: true, description: true, images: true, seller: { select: { id: true, firstName: true, lastName: true } } },
        },
        bids: {
          orderBy: { createdAt: 'desc' },
          take: 20,
          select: {
            id: true,
            amount: true,
            isAuto: true,
            createdAt: true,
            bidderId: true,
          },
        },
        _count: { select: { bids: true } },
      },
    });
    if (!auction) throw new NotFoundException('Enchère introuvable');
    return auction;
  }

  async placeBid(auctionId: string, bidderId: string, dto: { amount: number; isAuto?: boolean; maxAutoBid?: number }) {
    const auction = await this.prisma.auction.findUnique({
      where: { id: auctionId },
      include: { product: { select: { sellerId: true, title: true } } },
    });
    if (!auction) throw new NotFoundException('Enchère introuvable');
    if (auction.status !== AuctionStatus.ACTIVE) throw new BadRequestException('Cette enchère n\'est plus active');

    const now = new Date();
    if (now < auction.startsAt) throw new BadRequestException('L\'enchère n\'a pas encore commencé');
    if (now > auction.endsAt) throw new BadRequestException('L\'enchère est terminée');
    if (auction.product.sellerId === bidderId) throw new ForbiddenException('Vous ne pouvez pas enchérir sur votre propre produit');

    const minRequired = auction.currentPrice + auction.minBidIncrement;
    if (dto.amount < minRequired) {
      throw new BadRequestException(`L'offre minimum est de ${minRequired} FCFA`);
    }

    const bid = await this.prisma.$transaction(async (tx) => {
      const newBid = await tx.bid.create({
        data: {
          auctionId,
          bidderId,
          amount: dto.amount,
          isAuto: dto.isAuto ?? false,
          maxAutoBid: dto.maxAutoBid,
        },
      });

      await tx.auction.update({
        where: { id: auctionId },
        data: { currentPrice: dto.amount },
      });

      return newBid;
    });

    // Notify previous highest bidder (outbid)
    const previousTopBid = await this.prisma.bid.findFirst({
      where: { auctionId, id: { not: bid.id } },
      orderBy: { amount: 'desc' },
    });
    if (previousTopBid && previousTopBid.bidderId !== bidderId) {
      await this.notifications.createNotification({
        userId: previousTopBid.bidderId,
        type: 'SYSTEM',
        title: 'Surenchère',
        body: `Vous avez été surenchéri sur "${auction.product.title}". Nouvelle offre: ${dto.amount} FCFA`,
        data: { auctionId },
      });
    }

    return { bid, currentPrice: dto.amount };
  }

  async endAuction(auctionId: string, sellerId?: string) {
    const auction = await this.prisma.auction.findUnique({
      where: { id: auctionId },
      include: {
        product: { select: { sellerId: true, title: true } },
        bids: { orderBy: { amount: 'desc' }, take: 1 },
      },
    });
    if (!auction) throw new NotFoundException('Enchère introuvable');

    if (sellerId && auction.product.sellerId !== sellerId) {
      throw new ForbiddenException('Action non autorisée');
    }

    const topBid = auction.bids[0];
    const reserveMet = !auction.reservePrice || (topBid && topBid.amount >= auction.reservePrice);
    const hasWinner = topBid && reserveMet;

    await this.prisma.auction.update({
      where: { id: auctionId },
      data: {
        status: topBid ? AuctionStatus.ENDED : AuctionStatus.NO_BIDS,
        winnerId: hasWinner ? topBid.bidderId : null,
      },
    });

    if (hasWinner) {
      await this.notifications.createNotification({
        userId: topBid.bidderId,
        type: 'ORDER_UPDATE',
        title: 'Vous avez remporté l\'enchère !',
        body: `Félicitations ! Vous avez remporté "${auction.product.title}" pour ${topBid.amount} FCFA`,
        data: { auctionId },
      });
      await this.notifications.createNotification({
        userId: auction.product.sellerId,
        type: 'ORDER_UPDATE',
        title: 'Enchère terminée',
        body: `Votre enchère pour "${auction.product.title}" s'est terminée à ${topBid.amount} FCFA`,
        data: { auctionId },
      });
    }

    return { ended: true, winner: hasWinner ? topBid : null };
  }

  async getBidsForAuction(auctionId: string, page = 1, limit = 20) {
    const skip = (page - 1) * Math.min(limit, 50);
    const [bids, total] = await Promise.all([
      this.prisma.bid.findMany({
        where: { auctionId },
        orderBy: { amount: 'desc' },
        skip,
        take: Math.min(limit, 50),
        select: { id: true, amount: true, isAuto: true, createdAt: true, bidderId: true },
      }),
      this.prisma.bid.count({ where: { auctionId } }),
    ]);
    return { bids, total };
  }

  // Called by cron job — close auctions past their endsAt
  async closeExpiredAuctions() {
    const expired = await this.prisma.auction.findMany({
      where: { status: AuctionStatus.ACTIVE, endsAt: { lte: new Date() } },
      select: { id: true },
    });
    for (const { id } of expired) {
      await this.endAuction(id).catch(() => null);
    }
    return expired.length;
  }
}
