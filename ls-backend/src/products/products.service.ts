import {
  Injectable,
  NotFoundException,
  ForbiddenException,
  BadRequestException,
} from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { generateSlug } from '../common/utils/slug.util';
import { getPaginationParams, paginate } from '../common/utils/pagination.util';
import { CreateProductDto, UpdateProductDto, ProductQueryDto } from './dto/create-product.dto';

const PLAN_LIMITS: Record<string, number> = {
  FREE: 10, BASIC: 30, ESSENTIAL: 60, PREMIUM: 100, PRO: 200, BUSINESS: 999999,
};

const PRODUCT_INCLUDE = {
  images: { orderBy: { order: 'asc' as any } },
  category: { select: { id: true, name: true, nameEn: true, slug: true } },
  seller: {
    select: {
      id: true, firstName: true, lastName: true, isKycVerified: true,
      sellerProfile: { select: { shopName: true, shopSlug: true, avgRating: true, totalSales: true, isBadgePro: true, isBadgeVerified: true } },
      profile: { select: { avatarUrl: true } },
    },
  },
  tags: true,
  _count: { select: { reviews: true, favorites: true } },
};

@Injectable()
export class ProductsService {
  constructor(private prisma: PrismaService) {}

  // ─── LISTE PUBLIQUE ──────────────────────────────────────────────────────────

  async findAll(query: ProductQueryDto, userId?: string) {
    const { skip, take, page, limit } = getPaginationParams(query.page, query.limit);

    const where: any = { status: 'ACTIVE' };

    if (query.search) {
      where.OR = [
        { title: { contains: query.search, mode: 'insensitive' } },
        { description: { contains: query.search, mode: 'insensitive' } },
        { brand: { contains: query.search, mode: 'insensitive' } },
        { model: { contains: query.search, mode: 'insensitive' } },
      ];
    }

    if (query.categoryId) where.categoryId = query.categoryId;
    if (query.categorySlug) {
      const cat = await this.prisma.category.findUnique({ where: { slug: query.categorySlug } });
      if (cat) {
        const childIds = await this.prisma.category.findMany({
          where: { parentId: cat.id },
          select: { id: true },
        });
        where.categoryId = { in: [cat.id, ...childIds.map((c) => c.id)] };
      }
    }
    if (query.condition) where.condition = query.condition;
    if (query.brand) where.brand = { contains: query.brand, mode: 'insensitive' };
    if (query.city) where.city = { contains: query.city, mode: 'insensitive' };
    if (query.country) where.country = query.country;
    if (query.minPrice !== undefined || query.maxPrice !== undefined) {
      where.price = {};
      if (query.minPrice !== undefined) where.price.gte = query.minPrice;
      if (query.maxPrice !== undefined) where.price.lte = query.maxPrice;
    }
    if (query.hasDelivery !== undefined) where.hasDelivery = query.hasDelivery;
    if (query.isReconditioned !== undefined) where.isReconditioned = query.isReconditioned;
    if (query.sellerId) where.sellerId = query.sellerId;

    const sortMap: Record<string, any> = {
      price_asc: { price: 'asc' },
      price_desc: { price: 'desc' },
      oldest: { createdAt: 'asc' },
      popular: { viewCount: 'desc' },
      newest: { createdAt: 'desc' },
    };
    const orderBy = sortMap[query.sortBy] || { isFeatured: 'desc', createdAt: 'desc' };

    const [products, total] = await Promise.all([
      this.prisma.product.findMany({
        where,
        skip,
        take,
        orderBy,
        include: {
          images: { where: { isPrimary: true }, take: 1 },
          category: { select: { name: true, slug: true } },
          seller: {
            select: {
              id: true, firstName: true,
              sellerProfile: { select: { shopName: true, avgRating: true, isBadgeVerified: true } },
            },
          },
          _count: { select: { reviews: true, favorites: true } },
        },
      }),
      this.prisma.product.count({ where }),
    ]);

    // Marquer les favoris si l'user est connecté
    let favoriteIds: Set<string> = new Set();
    if (userId) {
      const favs = await this.prisma.favorite.findMany({
        where: { userId, productId: { in: products.map((p) => p.id) } },
        select: { productId: true },
      });
      favoriteIds = new Set(favs.map((f) => f.productId));
    }

    const enriched = products.map((p) => ({ ...p, isFavorite: favoriteIds.has(p.id) }));

    return {
      message: 'Annonces récupérées',
      data: enriched,
      meta: paginate(total, page, limit),
    };
  }

  async findOne(slug: string, userId?: string) {
    const product = await this.prisma.product.findUnique({
      where: { slug },
      include: PRODUCT_INCLUDE as any,
    });

    if (!product || (product.status !== 'ACTIVE' && product.sellerId !== userId)) {
      throw new NotFoundException('Annonce introuvable');
    }

    // Incrémenter le compteur de vues
    await this.prisma.product.update({
      where: { id: product.id },
      data: { viewCount: { increment: 1 } },
    });

    // Vérifier si c'est un favori
    let isFavorite = false;
    if (userId) {
      const fav = await this.prisma.favorite.findUnique({
        where: { userId_productId: { userId, productId: product.id } },
      });
      isFavorite = !!fav;
    }

    // Produits similaires
    const similar = await this.prisma.product.findMany({
      where: {
        categoryId: product.categoryId,
        status: 'ACTIVE',
        id: { not: product.id },
      },
      take: 6,
      include: {
        images: { where: { isPrimary: true }, take: 1 },
        seller: { select: { sellerProfile: { select: { shopName: true } } } },
      },
    });

    // Récupérer les avis
    const reviews = await this.prisma.review.findMany({
      where: { productId: product.id },
      take: 5,
      orderBy: { createdAt: 'desc' },
      include: {
        giver: {
          select: {
            firstName: true,
            profile: { select: { avatarUrl: true } },
          },
        },
      },
    });

    return {
      message: 'Annonce récupérée',
      data: { ...product, isFavorite, similar, reviews },
    };
  }

  // ─── GESTION VENDEUR ──────────────────────────────────────────────────────────

  async create(sellerId: string, dto: CreateProductDto, plan: string) {
    // Vérifier la limite du forfait
    const activeCount = await this.prisma.product.count({
      where: { sellerId, status: { in: ['ACTIVE', 'PENDING_REVIEW', 'DRAFT'] } },
    });
    const maxAllowed = PLAN_LIMITS[plan] || 10;
    if (activeCount >= maxAllowed) {
      throw new ForbiddenException(
        `Votre forfait ${plan} est limité à ${maxAllowed} annonces actives. Upgradez pour publier plus.`,
      );
    }

    const slug = generateSlug(dto.title);
    const { tags, imageUrls, ...productData } = dto;

    const product = await this.prisma.product.create({
      data: {
        ...productData,
        sellerId,
        slug,
        condition: (productData.condition as any) || 'NEW',
        guarantee: (productData.guarantee as any) || 'NONE',
        status: 'PENDING_REVIEW',
        images: imageUrls ? {
          create: imageUrls.map((url, i) => ({
            url,
            order: i,
            isPrimary: i === 0,
          })),
        } : undefined,
        tags: tags ? {
          create: tags.map((tag) => ({ tag })),
        } : undefined,
      },
      include: PRODUCT_INCLUDE as any,
    });

    return { message: 'Annonce créée et en attente de validation', data: product };
  }

  async update(productId: string, sellerId: string, dto: UpdateProductDto) {
    const product = await this.prisma.product.findUnique({ where: { id: productId } });
    if (!product) throw new NotFoundException('Annonce introuvable');
    if (product.sellerId !== sellerId) throw new ForbiddenException('Non autorisé');

    const { tags, imageUrls, ...productData } = dto;

    const updated = await this.prisma.product.update({
      where: { id: productId },
      data: {
        ...productData,
        status: 'PENDING_REVIEW',
        ...(tags && {
          tags: {
            deleteMany: {},
            create: tags.map((tag) => ({ tag })),
          },
        }),
        ...(imageUrls && {
          images: {
            deleteMany: {},
            create: imageUrls.map((url, i) => ({
              url, order: i, isPrimary: i === 0,
            })),
          },
        }),
      },
      include: PRODUCT_INCLUDE as any,
    });

    return { message: 'Annonce mise à jour', data: updated };
  }

  async delete(productId: string, sellerId: string, role: string) {
    const product = await this.prisma.product.findUnique({ where: { id: productId } });
    if (!product) throw new NotFoundException('Annonce introuvable');
    if (product.sellerId !== sellerId && role !== 'ADMIN') throw new ForbiddenException('Non autorisé');

    await this.prisma.product.update({
      where: { id: productId },
      data: { status: 'ARCHIVED' },
    });

    return { message: 'Annonce supprimée' };
  }

  async getMyProducts(sellerId: string, page = 1, limit = 20, status?: string) {
    const { skip, take } = getPaginationParams(page, limit);
    const where: any = { sellerId };
    if (status) where.status = status;

    const [products, total] = await Promise.all([
      this.prisma.product.findMany({
        where,
        skip,
        take,
        orderBy: { createdAt: 'desc' },
        include: {
          images: { where: { isPrimary: true }, take: 1 },
          category: { select: { name: true } },
          _count: { select: { reviews: true, favorites: true, orderItems: true } },
        },
      }),
      this.prisma.product.count({ where }),
    ]);

    return { message: 'Mes annonces', data: products, meta: paginate(total, page, limit) };
  }

  // ─── ADMIN ────────────────────────────────────────────────────────────────────

  async adminApprove(productId: string, approved: boolean, reason?: string) {
    const product = await this.prisma.product.update({
      where: { id: productId },
      data: {
        status: approved ? 'ACTIVE' : 'SUSPENDED',
        rejectionReason: approved ? null : reason,
        publishedAt: approved ? new Date() : null,
      },
    });
    return { message: approved ? 'Annonce approuvée' : 'Annonce rejetée', data: product };
  }

  async getPendingProducts(page = 1, limit = 20) {
    const { skip, take } = getPaginationParams(page, limit);
    const [products, total] = await Promise.all([
      this.prisma.product.findMany({
        where: { status: 'PENDING_REVIEW' },
        skip, take,
        orderBy: { createdAt: 'asc' },
        include: {
          images: { take: 1 },
          seller: { select: { email: true, firstName: true, lastName: true } },
          category: { select: { name: true } },
        },
      }),
      this.prisma.product.count({ where: { status: 'PENDING_REVIEW' } }),
    ]);
    return { data: products, meta: paginate(total, page, limit) };
  }

  async getStats() {
    const [total, active, pending, sold] = await Promise.all([
      this.prisma.product.count(),
      this.prisma.product.count({ where: { status: 'ACTIVE' } }),
      this.prisma.product.count({ where: { status: 'PENDING_REVIEW' } }),
      this.prisma.product.count({ where: { status: 'SOLD' } }),
    ]);
    return { total, active, pending, sold };
  }
}
