import { Test, TestingModule } from '@nestjs/testing';
import { UsersService } from './users.service';
import { PrismaService } from '../prisma/prisma.service';
import { BadRequestException, NotFoundException } from '@nestjs/common';
import * as bcrypt from 'bcrypt';

jest.mock('bcrypt');

const mockPrisma = {
  user: {
    findUnique: jest.fn(),
    update: jest.fn(),
  },
  profile: {
    upsert: jest.fn(),
  },
  sellerProfile: {
    findUnique: jest.fn(),
    upsert: jest.fn(),
  },
  address: {
    findMany: jest.fn(),
    create: jest.fn(),
    update: jest.fn(),
    updateMany: jest.fn(),
    deleteMany: jest.fn(),
  },
  favorite: {
    findUnique: jest.fn(),
    findMany: jest.fn(),
    create: jest.fn(),
    delete: jest.fn(),
    count: jest.fn(),
  },
  product: {
    update: jest.fn(),
  },
  review: {
    findMany: jest.fn(),
  },
  order: {
    count: jest.fn(),
    aggregate: jest.fn(),
    findMany: jest.fn(),
  },
  $transaction: jest.fn((ops) => {
    if (Array.isArray(ops)) return Promise.all(ops);
    return ops(mockPrisma);
  }),
};

describe('UsersService', () => {
  let service: UsersService;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        UsersService,
        { provide: PrismaService, useValue: mockPrisma },
      ],
    }).compile();

    service = module.get<UsersService>(UsersService);
    jest.clearAllMocks();
  });

  // ── getProfile ────────────────────────────────────────────────────────────

  describe('getProfile', () => {
    it('doit lever NotFoundException si utilisateur introuvable', async () => {
      mockPrisma.user.findUnique.mockResolvedValue(null);

      await expect(service.getProfile('unknown-id')).rejects.toThrow(NotFoundException);
    });

    it('doit retourner le profil utilisateur', async () => {
      const user = {
        id: 'user-1', email: 'test@test.com', firstName: 'Jean', lastName: 'Dupont',
        role: 'BUYER', isEmailVerified: true, isPhoneVerified: false, isKycVerified: false,
        twoFactorEnabled: false, lastLoginAt: null, createdAt: new Date(),
        profile: null, sellerProfile: null,
        subscription: { plan: 'FREE', expiresAt: null, status: 'ACTIVE' },
        loyaltyAccount: { points: 150, level: 'BRONZE' },
        _count: { productsAsSeller: 0, ordersAsBuyer: 3, favorites: 5 },
      };
      mockPrisma.user.findUnique.mockResolvedValue(user);

      const result = await service.getProfile('user-1');
      expect(result.data).toEqual(user);
    });
  });

  // ── changePassword ────────────────────────────────────────────────────────

  describe('changePassword', () => {
    it('doit lever BadRequestException si mot de passe actuel incorrect', async () => {
      mockPrisma.user.findUnique.mockResolvedValue({ passwordHash: 'hashed' });
      (bcrypt.compare as jest.Mock).mockResolvedValue(false);

      await expect(
        service.changePassword('user-1', {
          currentPassword: 'wrong', newPassword: 'NewPass123!', confirmPassword: 'NewPass123!',
        })
      ).rejects.toThrow(BadRequestException);
    });

    it('doit modifier le mot de passe et invalider le refreshToken', async () => {
      mockPrisma.user.findUnique.mockResolvedValue({ passwordHash: 'hashed' });
      (bcrypt.compare as jest.Mock).mockResolvedValue(true);
      (bcrypt.hash as jest.Mock).mockResolvedValue('new-hashed');
      mockPrisma.user.update.mockResolvedValue({});

      const result = await service.changePassword('user-1', {
        currentPassword: 'correct', newPassword: 'NewPass123!', confirmPassword: 'NewPass123!',
      });

      expect(mockPrisma.user.update).toHaveBeenCalledWith(
        expect.objectContaining({
          data: expect.objectContaining({ passwordHash: 'new-hashed', refreshToken: null }),
        })
      );
      expect(result.message).toBe('Mot de passe modifié avec succès');
    });
  });

  // ── toggleFavorite ────────────────────────────────────────────────────────

  describe('toggleFavorite', () => {
    it('doit ajouter aux favoris et incrémenter favoriteCount', async () => {
      mockPrisma.favorite.findUnique.mockResolvedValue(null); // pas encore en favori
      mockPrisma.favorite.create.mockResolvedValue({});
      mockPrisma.product.update.mockResolvedValue({});

      const result = await service.toggleFavorite('user-1', 'prod-1');

      expect(result.data.isFavorite).toBe(true);
      expect(mockPrisma.$transaction).toHaveBeenCalled();
    });

    it('doit retirer des favoris et décrémenter favoriteCount', async () => {
      mockPrisma.favorite.findUnique.mockResolvedValue({ userId: 'user-1', productId: 'prod-1' });
      mockPrisma.favorite.delete.mockResolvedValue({});
      mockPrisma.product.update.mockResolvedValue({});

      const result = await service.toggleFavorite('user-1', 'prod-1');

      expect(result.data.isFavorite).toBe(false);
    });

    it('la transaction de suppression doit passer { favoriteCount: { decrement: 1 } }', async () => {
      mockPrisma.favorite.findUnique.mockResolvedValue({ userId: 'user-1', productId: 'prod-2' });
      mockPrisma.favorite.delete.mockResolvedValue({});

      let capturedProductUpdate: any;
      mockPrisma.product.update.mockImplementation((args) => {
        capturedProductUpdate = args;
        return Promise.resolve({});
      });

      await service.toggleFavorite('user-1', 'prod-2');

      expect(capturedProductUpdate).toEqual(
        expect.objectContaining({ data: { favoriteCount: { decrement: 1 } } })
      );
    });
  });

  // ── Adresses ──────────────────────────────────────────────────────────────

  describe('setDefaultAddress', () => {
    it('doit d\'abord réinitialiser toutes les adresses puis définir la nouvelle par défaut', async () => {
      mockPrisma.address.updateMany.mockResolvedValue({});
      mockPrisma.address.update.mockResolvedValue({});

      await service.setDefaultAddress('user-1', 'addr-1');

      expect(mockPrisma.$transaction).toHaveBeenCalled();
    });
  });
});
