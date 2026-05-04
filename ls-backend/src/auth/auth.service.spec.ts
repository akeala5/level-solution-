import { Test, TestingModule } from '@nestjs/testing';
import { AuthService } from './auth.service';
import { PrismaService } from '../prisma/prisma.service';
import { JwtService } from '@nestjs/jwt';
import { ConfigService } from '@nestjs/config';
import { NotificationsService } from '../notifications/notifications.service';
import { BadRequestException, UnauthorizedException, ConflictException } from '@nestjs/common';
import * as bcrypt from 'bcrypt';

const mockPrisma = {
  user: {
    findUnique: jest.fn(),
    create: jest.fn(),
    update: jest.fn(),
  },
  auditLog: { create: jest.fn() },
};

const mockJwt = {
  sign: jest.fn().mockReturnValue('mock-token'),
  verify: jest.fn(),
};

const mockConfig = {
  get: jest.fn((key: string) => {
    const vals: Record<string, any> = {
      'jwt.accessSecret': 'test-secret',
      'jwt.refreshSecret': 'test-refresh-secret',
      'encryption.key': undefined,
    };
    return vals[key];
  }),
};

const mockNotifications = {
  sendWelcomeEmail: jest.fn(),
  sendPasswordResetEmail: jest.fn(),
  createNotification: jest.fn(),
};

describe('AuthService', () => {
  let service: AuthService;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        AuthService,
        { provide: PrismaService, useValue: mockPrisma },
        { provide: JwtService, useValue: mockJwt },
        { provide: ConfigService, useValue: mockConfig },
        { provide: NotificationsService, useValue: mockNotifications },
      ],
    }).compile();

    service = module.get<AuthService>(AuthService);
    jest.clearAllMocks();
  });

  // ─── REGISTER ──────────────────────────────────────────────────────────────────

  describe('register()', () => {
    it('doit créer un utilisateur avec mot de passe hashé', async () => {
      mockPrisma.user.findUnique.mockResolvedValueOnce(null); // email libre
      const createdUser = {
        id: 'user-1', email: 'test@test.com', firstName: 'Test', lastName: 'User',
        role: 'BUYER', isEmailVerified: false,
      };
      mockPrisma.user.create.mockResolvedValueOnce(createdUser);

      const result = await service.register({
        email: 'test@test.com',
        password: 'Password@123',
        firstName: 'Test',
        lastName: 'User',
      });

      expect(mockPrisma.user.create).toHaveBeenCalledWith(
        expect.objectContaining({
          data: expect.objectContaining({ email: 'test@test.com', role: 'BUYER' }),
        }),
      );
      expect(result).toHaveProperty('accessToken');
    });

    it('doit lancer ConflictException si email déjà utilisé', async () => {
      mockPrisma.user.findUnique.mockResolvedValueOnce({ id: 'existing' });

      await expect(
        service.register({ email: 'taken@test.com', password: 'Password@123', firstName: 'A', lastName: 'B' }),
      ).rejects.toThrow(ConflictException);
    });

    it('ne doit pas permettre d\'injecter le rôle ADMIN', async () => {
      mockPrisma.user.findUnique.mockResolvedValueOnce(null);
      mockPrisma.user.create.mockResolvedValueOnce({
        id: 'u1', email: 'attacker@test.com', firstName: 'X', lastName: 'Y',
        role: 'BUYER', isEmailVerified: false,
      });

      await service.register({
        email: 'attacker@test.com',
        password: 'Password@123',
        firstName: 'X',
        lastName: 'Y',
        role: 'ADMIN' as any,
      });

      const createCall = mockPrisma.user.create.mock.calls[0][0];
      expect(createCall.data.role).toBe('BUYER');
    });
  });

  // ─── LOGIN ─────────────────────────────────────────────────────────────────────

  describe('login()', () => {
    const hashedPwd = bcrypt.hashSync('Password@123', 10);
    const mockUser = {
      id: 'user-1', email: 'user@test.com', firstName: 'User', lastName: 'Test',
      passwordHash: hashedPwd, role: 'BUYER', isSuspended: false,
      isEmailVerified: true, twoFactorEnabled: false, twoFactorSecret: null,
      lastLoginAt: null,
    };

    it('doit retourner les tokens avec credentials valides', async () => {
      mockPrisma.user.findUnique.mockResolvedValueOnce(mockUser);
      mockPrisma.user.update.mockResolvedValueOnce({});

      const result = await service.login({ email: 'user@test.com', password: 'Password@123' });

      expect(result).toHaveProperty('accessToken');
      expect(result).toHaveProperty('refreshToken');
    });

    it('doit rejeter un mot de passe incorrect', async () => {
      mockPrisma.user.findUnique.mockResolvedValueOnce(mockUser);

      await expect(
        service.login({ email: 'user@test.com', password: 'WrongPassword' }),
      ).rejects.toThrow(UnauthorizedException);
    });

    it('doit rejeter un compte suspendu', async () => {
      mockPrisma.user.findUnique.mockResolvedValueOnce({ ...mockUser, isSuspended: true });

      await expect(
        service.login({ email: 'user@test.com', password: 'Password@123' }),
      ).rejects.toThrow();
    });

    it('doit retourner requiresTwoFactor si 2FA activé', async () => {
      mockPrisma.user.findUnique.mockResolvedValueOnce({ ...mockUser, twoFactorEnabled: true, twoFactorSecret: 'encrypted-secret' });

      const result = await service.login({ email: 'user@test.com', password: 'Password@123' });

      expect(result).toHaveProperty('requiresTwoFactor', true);
    });
  });

  // ─── ENCRYPTION 2FA ────────────────────────────────────────────────────────────

  describe('encrypt/decrypt 2FA secret', () => {
    it('doit chiffrer puis déchiffrer correctement', () => {
      const secret = 'JBSWY3DPEHPK3PXP';
      const encrypted = (service as any).encryptSecret(secret);
      const decrypted = (service as any).decryptSecret(encrypted);
      expect(decrypted).toBe(secret);
    });

    it('le chiffré doit avoir le format iv:authTag:ciphertext', () => {
      const encrypted = (service as any).encryptSecret('test-secret');
      const parts = encrypted.split(':');
      expect(parts).toHaveLength(3);
    });
  });
});
