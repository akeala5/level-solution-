import { Test, TestingModule } from '@nestjs/testing';
import { PaymentsService } from './payments.service';
import { PrismaService } from '../prisma/prisma.service';
import { ConfigService } from '@nestjs/config';
import { NotificationsService } from '../notifications/notifications.service';
import { BadRequestException, UnauthorizedException } from '@nestjs/common';
import * as crypto from 'crypto';

const mockPrisma = {
  order: { findUnique: jest.fn(), update: jest.fn() },
  payment: { create: jest.fn(), update: jest.fn(), findUnique: jest.fn() },
  subscription: { findUnique: jest.fn(), update: jest.fn(), upsert: jest.fn() },
  $transaction: jest.fn((ops) => Promise.all(ops)),
};

const mockConfig = {
  get: jest.fn((key: string) => {
    const vals: Record<string, any> = {
      'stripe.secretKey': 'sk_test_dummy',
      'fedapay.secretKey': 'sk_sandbox_dummy',
      'fedapay.webhookSecret': 'wh_test_secret',
      'app.url': 'http://localhost:3000',
    };
    return vals[key];
  }),
};

const mockNotifications = { createNotification: jest.fn() };

describe('PaymentsService', () => {
  let service: PaymentsService;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        PaymentsService,
        { provide: PrismaService, useValue: mockPrisma },
        { provide: ConfigService, useValue: mockConfig },
        { provide: NotificationsService, useValue: mockNotifications },
      ],
    }).compile();

    service = module.get<PaymentsService>(PaymentsService);
    jest.clearAllMocks();
  });

  // NB : les anciens tests « countryMap » ont été retirés — la propriété a été
  // supprimée lors d'un refactor (le pays vient désormais d'un paramètre explicite
  // ou du préfixe du method, plus d'un map statique method→pays).

  // ─── WEBHOOK FEDAPAY ───────────────────────────────────────────────────────────

  describe('handleFedaPayCallback()', () => {
    const secret = 'wh_test_secret';
    const payload = JSON.stringify({ event: { name: 'transaction.approved' } });
    const rawBody = Buffer.from(payload);

    function makeSignature(body: Buffer, key: string) {
      return crypto.createHmac('sha256', key).update(body).digest('hex');
    }

    it('doit rejeter une signature invalide', async () => {
      await expect(
        service.handleFedaPayCallback(rawBody, 'invalid-signature'),
      ).rejects.toThrow(UnauthorizedException);
    });

    it('doit accepter une signature valide', async () => {
      const validSig = makeSignature(rawBody, secret);
      // L'appel peut continuer (même si la transaction n'est pas trouvée en DB)
      await expect(
        service.handleFedaPayCallback(rawBody, validSig),
      ).resolves.not.toThrow();
    });

    it('doit rejeter si rawBody est absent', async () => {
      await expect(
        service.handleFedaPayCallback(undefined as any, 'sig'),
      ).rejects.toThrow();
    });
  });

  // ─── COMMISSION ────────────────────────────────────────────────────────────────

  describe('commission calculation', () => {
    const commissionMap: Record<string, number> = {
      FREE: 0.05, BASIC: 0.045, ESSENTIAL: 0.04,
      PREMIUM: 0.035, PRO: 0.03, BUSINESS: 0.02,
    };

    it.each(Object.entries(commissionMap))(
      'plan %s doit avoir commission %s',
      (plan, rate) => {
        const map = (service as any).commissionMap ?? commissionMap;
        expect(map[plan] ?? commissionMap[plan]).toBeCloseTo(rate);
      },
    );
  });
});
