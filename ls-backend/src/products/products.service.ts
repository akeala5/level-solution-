import {
  Injectable,
  NotFoundException,
  ForbiddenException,
  BadRequestException,
} from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { SearchService } from '../search/search.service';
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
  constructor(
    private prisma: PrismaService,
    private search: SearchService,
  ) {}

  // ─── LISTE PUBLIQUE ──────────────────────────────────────────────────────────

  async findAll(query: ProductQueryDto, userId?: string) {
    const { skip, take, page, limit } = getPaginationParams(query.page, query.limit);

    // ── Recherche textuelle → Meilisearch ────────────────────────────────────
    if (query.search) {
      // Résoudre le categoryId depuis le slug si fourni
      let categoryId = query.categoryId;
      if (!categoryId && query.categorySlug) {
        const cat = await this.prisma.category.findUnique({ where: { slug: query.categorySlug } });
        if (cat) categoryId = cat.id;
      }

      const { ids, total } = await this.search.search(query.search, {
        categoryId,
        condition: query.condition,
        country: query.country,
        city: query.city,
        minPrice: query.minPrice,
        maxPrice: query.maxPrice,
        hasDelivery: query.hasDelivery,
        isReconditioned: query.isReconditioned,
        sellerId: query.sellerId,
        sortBy: query.sortBy,
        page,
        limit,
      });

      if (!ids.length) {
        return { message: 'Annonces récupérées', data: [], meta: paginate(0, page, limit) };
      }

      const products = await this.prisma.product.findMany({
        where: { id: { in: ids } },
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
      });

      // Remettre dans l'ordre retourné par Meilisearch (tri par pertinence)
      const idOrder = new Map(ids.map((id, i) => [id, i]));
      products.sort((a, b) => (idOrder.get(a.id) ?? 0) - (idOrder.get(b.id) ?? 0));

      let favoriteIds: Set<string> = new Set();
      if (userId) {
        const favs = await this.prisma.favorite.findMany({
          where: { userId, productId: { in: products.map((p) => p.id) } },
          select: { productId: true },
        });
        favoriteIds = new Set(favs.map((f) => f.productId));
      }

      return {
        message: 'Annonces récupérées',
        data: products.map((p) => ({ ...p, isFavorite: favoriteIds.has(p.id) })),
        meta: paginate(total, page, limit),
      };
    }

    // ── Pas de recherche textuelle → Prisma seul (filtres + tri) ────────────
    const where: any = { status: 'ACTIVE' };

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
    if (query.isFlash) { where.isFlash = true; where.flashEndsAt = { gt: new Date() }; }
    if (query.sellerId) where.sellerId = query.sellerId;

    const sortMap: Record<string, any> = {
      price_asc: { price: 'asc' },
      price_desc: { price: 'desc' },
      oldest: { createdAt: 'asc' },
      popular: { viewCount: 'desc' },
      newest: { createdAt: 'desc' },
    };
    const orderBy = sortMap[query.sortBy] || [{ isFeatured: 'desc' }, { createdAt: 'desc' }];

    const [products, total] = await Promise.all([
      this.prisma.product.findMany({
        where, skip, take, orderBy,
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

    let favoriteIds: Set<string> = new Set();
    if (userId) {
      const favs = await this.prisma.favorite.findMany({
        where: { userId, productId: { in: products.map((p) => p.id) } },
        select: { productId: true },
      });
      favoriteIds = new Set(favs.map((f) => f.productId));
    }

    return {
      message: 'Annonces récupérées',
      data: products.map((p) => ({ ...p, isFavorite: favoriteIds.has(p.id) })),
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

  async getForEdit(productId: string, sellerId: string) {
    const product = await this.prisma.product.findUnique({
      where: { id: productId },
      include: PRODUCT_INCLUDE as any,
    });
    if (!product) throw new NotFoundException('Annonce introuvable');
    if (product.sellerId !== sellerId) throw new ForbiddenException('Non autorisé');
    return { message: 'Annonce récupérée', data: product };
  }

  async updateProductStatus(productId: string, sellerId: string, role: string, status: string) {
    const product = await this.prisma.product.findUnique({ where: { id: productId } });
    if (!product) throw new NotFoundException('Annonce introuvable');
    if (product.sellerId !== sellerId && role !== 'ADMIN') throw new ForbiddenException('Non autorisé');

    const allowed = ['ACTIVE', 'DRAFT'];
    if (!allowed.includes(status)) {
      throw new BadRequestException(`Statut ${status} non autorisé`);
    }

    const updated = await this.prisma.product.update({
      where: { id: productId },
      data: { status: status as any },
    });

    if (status === 'ACTIVE') {
      this.search.indexProduct(updated).catch(() => null);
    } else {
      this.search.deleteProduct(productId).catch(() => null);
    }

    return { message: 'Statut mis à jour', data: updated };
  }

  // ─── GESTION VENDEUR ──────────────────────────────────────────────────────────

  async create(sellerId: string, dto: CreateProductDto, plan: string) {
    // Gate KYC : interdire la vente tant que l'identité n'est pas vérifiée.
    // Activable via REQUIRE_KYC_TO_SELL=true (désactivé par défaut pour ne pas
    // bloquer rétroactivement les vendeurs déjà actifs).
    if (process.env.REQUIRE_KYC_TO_SELL === 'true') {
      const seller = await this.prisma.user.findUnique({
        where: { id: sellerId },
        select: { isKycVerified: true },
      });
      if (!seller?.isKycVerified) {
        throw new ForbiddenException(
          'Vérification d\'identité (KYC) requise avant de publier une annonce.',
        );
      }
    }

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

    // Indexer dans Meilisearch (statut PENDING_REVIEW — sera visible une fois approuvé)
    this.search.indexProduct(product).catch(() => null);

    return { message: 'Annonce créée et en attente de validation', data: product };
  }

  async update(productId: string, sellerId: string, dto: UpdateProductDto) {
    const product = await this.prisma.product.findUnique({ where: { id: productId } });
    if (!product) throw new NotFoundException('Annonce introuvable');
    if (product.sellerId !== sellerId) throw new ForbiddenException('Non autorisé');

    const { tags, imageUrls, categoryId, ...productData } = dto as any;

    const updated = await this.prisma.product.update({
      where: { id: productId },
      data: {
        ...productData,
        ...(categoryId && { category: { connect: { id: categoryId } } }),
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

    // Mettre à jour l'index Meilisearch
    this.search.indexProduct(updated).catch(() => null);

    return { message: 'Annonce mise à jour', data: updated };
  }

  async deleteProductImage(productId: string, imageId: string, sellerId: string) {
    const product = await this.prisma.product.findUnique({ where: { id: productId } });
    if (!product) throw new NotFoundException('Annonce introuvable');
    if (product.sellerId !== sellerId) throw new ForbiddenException('Non autorisé');

    const image = await this.prisma.productImage.findUnique({ where: { id: imageId } });
    if (!image || image.productId !== productId) throw new NotFoundException('Image introuvable');

    await this.prisma.productImage.delete({ where: { id: imageId } });

    // Si l'image supprimée était la principale, promouvoir la suivante
    if (image.isPrimary) {
      const next = await this.prisma.productImage.findFirst({
        where: { productId },
        orderBy: { order: 'asc' },
      });
      if (next) {
        await this.prisma.productImage.update({ where: { id: next.id }, data: { isPrimary: true } });
      }
    }

    return { message: 'Image supprimée' };
  }

  async delete(productId: string, sellerId: string, role: string) {
    const product = await this.prisma.product.findUnique({ where: { id: productId } });
    if (!product) throw new NotFoundException('Annonce introuvable');
    if (product.sellerId !== sellerId && role !== 'ADMIN') throw new ForbiddenException('Non autorisé');

    await this.prisma.product.update({
      where: { id: productId },
      data: { status: 'ARCHIVED' },
    });

    // Retirer de l'index de recherche
    this.search.deleteProduct(productId).catch(() => null);

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
      include: { category: { select: { name: true } }, tags: true },
    });

    // Indexer si approuvé, retirer si suspendu
    if (approved) {
      this.search.indexProduct(product).catch(() => null);
    } else {
      this.search.deleteProduct(productId).catch(() => null);
    }

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

  // ─── RÉINDEXATION BULK (admin) ───────────────────────────────────────────────

  async reindexAll() {
    const products = await this.prisma.product.findMany({
      where: { status: 'ACTIVE' },
      include: { category: { select: { name: true } }, tags: true },
    });
    await this.search.bulkIndex(products);
    return { message: `${products.length} annonces réindexées dans Meilisearch` };
  }

  // ─── FLASH SALES ──────────────────────────────────────────────────────────────
  async setFlash(productId: string, sellerId: string, role: string, dto: { hours: number }) {
    const product = await this.prisma.product.findUnique({ where: { id: productId } });
    if (!product) throw new NotFoundException('Produit introuvable');
    if (role !== 'ADMIN' && role !== 'MODERATOR' && product.sellerId !== sellerId) {
      throw new ForbiddenException('Accès refusé');
    }
    const flashEndsAt = dto.hours > 0
      ? new Date(Date.now() + dto.hours * 3_600_000)
      : null;
    return this.prisma.product.update({
      where: { id: productId },
      data: { isFlash: dto.hours > 0, flashEndsAt },
    });
  }

  // ─── BUNDLE SELLER ───────────────────────────────────────────────────────────
  async setBundle(
    productId: string,
    sellerId: string,
    role: string,
    dto: { isBundle: boolean; bundleItems?: { name: string; quantity: number; unitPrice?: number }[]; bundleDiscount?: number },
  ) {
    const product = await this.prisma.product.findUnique({ where: { id: productId } });
    if (!product) throw new NotFoundException('Produit introuvable');
    if (role !== 'ADMIN' && role !== 'MODERATOR' && product.sellerId !== sellerId) {
      throw new ForbiddenException('Accès refusé');
    }
    if (dto.isBundle && (!dto.bundleItems || dto.bundleItems.length < 2)) {
      throw new BadRequestException('Un lot doit contenir au moins 2 articles');
    }
    return this.prisma.product.update({
      where: { id: productId },
      data: {
        isBundle: dto.isBundle,
        bundleItems: dto.isBundle ? (dto.bundleItems as any) : null,
        bundleDiscount: dto.isBundle ? (dto.bundleDiscount ?? null) : null,
      },
    });
  }

  // ─── SMART PRICING ────────────────────────────────────────────────────────────
  async getPriceStats(categoryId: string) {
    const rows = await this.prisma.product.findMany({
      where: { categoryId, status: 'ACTIVE' },
      select: { price: true },
      orderBy: { price: 'asc' },
    });
    if (rows.length === 0) return null;
    const values = rows.map((r) => r.price);
    const n = values.length;
    const median = n % 2 === 0
      ? (values[n / 2 - 1] + values[n / 2]) / 2
      : values[Math.floor(n / 2)];
    return {
      median: Math.round(median),
      min:    values[0],
      max:    values[n - 1],
      count:  n,
      suggested: Math.round(median / 500) * 500,
    };
  }
}
