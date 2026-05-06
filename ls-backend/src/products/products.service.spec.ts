import { Test, TestingModule } from '@nestjs/testing';
import { ProductsService } from './products.service';
import { PrismaService } from '../prisma/prisma.service';
import { BadRequestException, ForbiddenException, NotFoundException } from '@nestjs/common';

const mockPrisma = {
  product: {
    create: jest.fn(),
    findMany: jest.fn(),
    findFirst: jest.fn(),
    findUnique: jest.fn(),
    update: jest.fn(),
    count: jest.fn(),
  },
  subscription: {
    findUnique: jest.fn(),
  },
  $transaction: jest.fn((fn) => fn(mockPrisma)),
};

const PLAN_LIMITS: Record<string, number> = {
  FREE: 10, BASIC: 30, ESSENTIAL: 60, PREMIUM: 100, PRO: 200, BUSINESS: 999999,
};

describe('ProductsService', () => {
  let service: ProductsService;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        ProductsService,
        { provide: PrismaService, useValue: mockPrisma },
      ],
    }).compile();

    service = module.get<ProductsService>(ProductsService);
    jest.clearAllMocks();
  });

  // ── Listing limits ────────────────────────────────────────────────────────

  describe('Limites d\'annonces par plan', () => {
    Object.entries(PLAN_LIMITS).forEach(([plan, limit]) => {
      it(`plan ${plan} → limite ${limit === 999999 ? 'illimitée' : limit} annonces`, async () => {
        // Simuler un vendeur ayant déjà atteint la limite
        mockPrisma.product.count.mockResolvedValue(limit);
        mockPrisma.subscription.findUnique.mockResolvedValue({ plan });

        if (limit < 999999) {
          await expect(
            service.create('seller-1', {
              title: 'Test', description: 'Desc', price: 10000,
              categoryId: 'cat-1', condition: 'NEW', quantity: 1,
              country: 'TG', guarantee: 'NONE', hasDelivery: false, isNegotiable: false, isReconditioned: false,
            }, plan)
          ).rejects.toThrow(BadRequestException);
        }
      });
    });
  });

  // ── Slug generation ───────────────────────────────────────────────────────

  describe('Génération de slug', () => {
    it('doit créer un slug URL-safe depuis le titre', async () => {
      mockPrisma.subscription.findUnique.mockResolvedValue({ plan: 'PREMIUM' });
      mockPrisma.product.count.mockResolvedValue(5);
      mockPrisma.product.findFirst.mockResolvedValue(null); // pas de doublon slug
      mockPrisma.product.create.mockImplementation(({ data }) => {
        expect(data.slug).toMatch(/^[a-z0-9-]+$/);
        expect(data.slug).not.toContain(' ');
        return Promise.resolve({ ...data, id: 'prod-1' });
      });

      await service.create('seller-1', {
        title: 'MacBook Pro 16" M3 Max',
        description: 'Description test',
        price: 980000,
        categoryId: 'cat-1',
        condition: 'NEW',
        quantity: 1,
        country: 'TG',
        guarantee: 'ONE_YEAR',
        hasDelivery: true,
        isNegotiable: false,
        isReconditioned: false,
      }, 'PREMIUM');
    });
  });

  // ── Ownership ──────────────────────────────────────────────────────────────

  describe('Ownership — suppression/modification', () => {
    it('delete doit lever ForbiddenException si pas propriétaire', async () => {
      mockPrisma.product.findFirst.mockResolvedValue({
        id: 'prod-1', sellerId: 'owner-1', status: 'PUBLISHED',
      });

      await expect(service.delete('prod-1', 'other-user', 'BUYER'))
        .rejects.toThrow(ForbiddenException);
    });

    it('delete doit réussir pour le propriétaire', async () => {
      mockPrisma.product.findFirst.mockResolvedValue({
        id: 'prod-1', sellerId: 'owner-1', status: 'PUBLISHED',
      });
      mockPrisma.product.update.mockResolvedValue({ id: 'prod-1', status: 'ARCHIVED' });

      await service.delete('prod-1', 'owner-1', 'SELLER');
      expect(mockPrisma.product.update).toHaveBeenCalledWith(
        expect.objectContaining({
          data: expect.objectContaining({ status: 'ARCHIVED' }),
        }),
      );
    });

    it('ADMIN peut supprimer n\'importe quel produit', async () => {
      mockPrisma.product.findFirst.mockResolvedValue({
        id: 'prod-1', sellerId: 'owner-1', status: 'PUBLISHED',
      });
      mockPrisma.product.update.mockResolvedValue({ id: 'prod-1', status: 'ARCHIVED' });

      await service.delete('prod-1', 'admin-user', 'ADMIN');
      expect(mockPrisma.product.update).toHaveBeenCalled();
    });
  });

  // ── View count ─────────────────────────────────────────────────────────────

  describe('View count', () => {
    it('findOne doit incrémenter viewCount', async () => {
      const product = {
        id: 'prod-1', slug: 'test-product', sellerId: 'seller-1',
        status: 'PUBLISHED', title: 'Test', price: 50000,
        images: [], category: {}, seller: {}, tags: [],
      };
      mockPrisma.product.findFirst.mockResolvedValue(product);
      mockPrisma.product.update.mockResolvedValue({ ...product, viewCount: 1 });
      mockPrisma.product.findMany.mockResolvedValue([]); // similar products

      await service.findOne('test-product');

      expect(mockPrisma.product.update).toHaveBeenCalledWith(
        expect.objectContaining({
          data: { viewCount: { increment: 1 } },
        }),
      );
    });
  });
});
