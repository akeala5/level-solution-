import {
  Injectable, NotFoundException, BadRequestException, ForbiddenException,
} from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { CreateSponsoredAdDto } from './dto/create-sponsored-ad.dto';

const AD_INCLUDE = {
  product: {
    select: {
      id: true, title: true, slug: true, price: true,
      images: { where: { isPrimary: true }, take: 1 },
    },
  },
};

@Injectable()
export class SponsoredAdsService {
  constructor(private prisma: PrismaService) {}

  // ─── VENDEUR ─────────────────────────────────────────────────────────────────

  async create(userId: string, dto: CreateSponsoredAdDto) {
    // Vérifier que le produit appartient au vendeur
    const product = await this.prisma.product.findUnique({ where: { id: dto.productId } });
    if (!product) throw new NotFoundException('Produit introuvable');
    if (product.sellerId !== userId) throw new ForbiddenException('Ce produit ne vous appartient pas');
    if (product.status !== 'ACTIVE') throw new BadRequestException('Le produit doit être actif pour être sponsorisé');

    // Un produit ne peut avoir qu'une seule campagne active à la fois
    const existing = await this.prisma.sponsoredAd.findUnique({ where: { productId: dto.productId } });
    if (existing) throw new BadRequestException('Ce produit est déjà sponsorisé. Supprimez la campagne existante d\'abord.');

    const startsAt = new Date(dto.startsAt);
    const endsAt   = new Date(dto.endsAt);

    if (endsAt <= startsAt) throw new BadRequestException('La date de fin doit être après la date de début');
    if (endsAt <= new Date()) throw new BadRequestException('La date de fin doit être dans le futur');

    const ad = await this.prisma.sponsoredAd.create({
      data: {
        productId: dto.productId,
        userId,
        budget: dto.budget,
        startsAt,
        endsAt,
        isActive: true,
      },
      include: AD_INCLUDE,
    });

    return { message: 'Campagne sponsorisée créée', data: ad };
  }

  async findMine(userId: string) {
    const ads = await this.prisma.sponsoredAd.findMany({
      where: { userId },
      orderBy: { createdAt: 'desc' },
      include: AD_INCLUDE,
    });

    const totalViews  = ads.reduce((s, a) => s + a.views, 0);
    const totalClicks = ads.reduce((s, a) => s + a.clicks, 0);
    const totalSpent  = ads.reduce((s, a) => s + a.spent, 0);

    return {
      message: 'Campagnes récupérées',
      data: { ads, stats: { totalViews, totalClicks, totalSpent } },
    };
  }

  async toggle(adId: string, userId: string) {
    const ad = await this.prisma.sponsoredAd.findUnique({ where: { id: adId } });
    if (!ad) throw new NotFoundException('Campagne introuvable');
    if (ad.userId !== userId) throw new ForbiddenException('Non autorisé');

    const updated = await this.prisma.sponsoredAd.update({
      where: { id: adId },
      data: { isActive: !ad.isActive },
      include: AD_INCLUDE,
    });

    return {
      message: updated.isActive ? 'Campagne activée' : 'Campagne mise en pause',
      data: updated,
    };
  }

  async delete(adId: string, userId: string) {
    const ad = await this.prisma.sponsoredAd.findUnique({ where: { id: adId } });
    if (!ad) throw new NotFoundException('Campagne introuvable');
    if (ad.userId !== userId) throw new ForbiddenException('Non autorisé');

    await this.prisma.sponsoredAd.delete({ where: { id: adId } });
    return { message: 'Campagne supprimée' };
  }

  // ─── TRACKING (appelé par le frontend au clic / affichage) ───────────────────

  async recordView(adId: string) {
    const ad = await this.prisma.sponsoredAd.findUnique({ where: { id: adId } });
    if (!ad || !ad.isActive) return;

    // Coût par vue : budget / durée en jours / 100 (estimation)
    const daysDuration = Math.max(1, Math.ceil((ad.endsAt.getTime() - ad.startsAt.getTime()) / 86400000));
    const costPerView  = ad.budget / daysDuration / 100;
    const newSpent     = ad.spent + costPerView;

    await this.prisma.sponsoredAd.update({
      where: { id: adId },
      data: {
        views: { increment: 1 },
        spent: newSpent,
        // Désactiver automatiquement si budget épuisé
        ...(newSpent >= ad.budget ? { isActive: false } : {}),
      },
    });
  }

  async recordClick(adId: string) {
    const ad = await this.prisma.sponsoredAd.findUnique({ where: { id: adId } });
    if (!ad || !ad.isActive) return;

    // Coût par clic fixe : ~50 FCFA
    const costPerClick = 50;
    const newSpent     = ad.spent + costPerClick;

    await this.prisma.sponsoredAd.update({
      where: { id: adId },
      data: {
        clicks: { increment: 1 },
        spent: newSpent,
        ...(newSpent >= ad.budget ? { isActive: false } : {}),
      },
    });
  }

  // ─── PUBLIC — produits sponsorisés à afficher dans les listings ──────────────

  async getFeatured(categoryId?: string, limit = 3) {
    const now = new Date();

    // Prisma ne peut pas comparer deux colonnes directement — on filtre par isActive + dates
    // La désactivation automatique au dépassement de budget est gérée sur recordView/recordClick
    const ads = await this.prisma.sponsoredAd.findMany({
      where: {
        isActive: true,
        startsAt: { lte: now },
        endsAt:   { gte: now },
        ...(categoryId ? { product: { categoryId } } : {}),
      },
      take: limit,
      orderBy: { budget: 'desc' },
      include: {
        product: {
          include: {
            images: { where: { isPrimary: true }, take: 1 },
            category: { select: { name: true, slug: true } },
            seller: {
              select: {
                id: true, firstName: true,
                sellerProfile: { select: { shopName: true, avgRating: true } },
              },
            },
          },
        },
      },
    });

    return { message: 'Annonces sponsorisées', data: ads };
  }

  // ─── ADMIN ────────────────────────────────────────────────────────────────────

  async adminFindAll(page = 1, limit = 20) {
    const skip = (page - 1) * limit;
    const [ads, total] = await Promise.all([
      this.prisma.sponsoredAd.findMany({
        skip, take: limit,
        orderBy: { createdAt: 'desc' },
        include: {
          ...AD_INCLUDE,
          user: { select: { id: true, firstName: true, lastName: true, email: true } },
        },
      }),
      this.prisma.sponsoredAd.count(),
    ]);
    return { data: ads, total, page, limit };
  }
}
