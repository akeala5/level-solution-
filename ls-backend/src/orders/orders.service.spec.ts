import { Test, TestingModule } from '@nestjs/testing';
import { OrdersService } from './orders.service';
import { PrismaService } from '../prisma/prisma.service';
import { NotificationsService } from '../notifications/notifications.service';
import { WebhooksService } from '../webhooks/webhooks.service';
import { WalletService } from '../wallet/wallet.service';
import { PlanConfigService } from '../common/services/plan-config.service';
import { ForbiddenException } from '@nestjs/common';

// ── Mocks ──────────────────────────────────────────────────────────────────

const mockPrisma = {
  order: {
    create: jest.fn(),
    findMany: jest.fn(),
    findFirst: jest.fn(),
    findUnique: jest.fn(),
    update: jest.fn(),
    count: jest.fn(),
  },
  product: {
    findUnique: jest.fn(),
    update: jest.fn(),
    updateMany: jest.fn().mockResolvedValue({ count: 1 }),
  },
  dispute: { create: jest.fn() },
  loyaltyAccount: { update: jest.fn() },
  loyaltyTransaction: { create: jest.fn() },
  stockReservation: {
    create: jest.fn().mockResolvedValue({}),
    updateMany: jest.fn().mockResolvedValue({ count: 0 }),
  },
  // Gère les deux formes : $transaction(cb) et $transaction([promesses]).
  $transaction: jest.fn((arg) => (Array.isArray(arg) ? Promise.all(arg) : arg(mockPrisma))),
};

const mockNotifications = {
  sendOrderConfirmation: jest.fn(),
  sendOrderShipped: jest.fn(),
  createNotification: jest.fn(),
};

const mockWebhooks = {
  dispatch: jest.fn().mockResolvedValue(undefined),
};

const PLAN_COMMISSION: Record<string, number> = {
  FREE: 0.05, BASIC: 0.045, ESSENTIAL: 0.04, PREMIUM: 0.035, PRO: 0.03, BUSINESS: 0.02,
};
const mockPlanConfig = {
  getConfig: jest.fn((plan: string) => Promise.resolve({ plan, commission: PLAN_COMMISSION[plan] ?? 0.05, maxProducts: 10 })),
  getActivePlans: jest.fn().mockResolvedValue([]),
  invalidate: jest.fn(),
};

const mockWallet = {
  creditSellerFromOrder: jest.fn().mockResolvedValue(true),
};

// ── Tests ──────────────────────────────────────────────────────────────────

describe('OrdersService', () => {
  let service: OrdersService;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        OrdersService,
        { provide: PrismaService, useValue: mockPrisma },
        { provide: NotificationsService, useValue: mockNotifications },
        { provide: WebhooksService, useValue: mockWebhooks },
        { provide: WalletService, useValue: mockWallet },
        { provide: PlanConfigService, useValue: mockPlanConfig },
      ],
    }).compile();

    service = module.get<OrdersService>(OrdersService);
    jest.clearAllMocks();
  });

  // ── Commission rates ─────────────────────────────────────────────────────

  describe('Commission dynamique par plan', () => {
    const plans = [
      { plan: 'FREE',      expected: 0.05 },
      { plan: 'BASIC',     expected: 0.045 },
      { plan: 'ESSENTIAL', expected: 0.04 },
      { plan: 'PREMIUM',   expected: 0.035 },
      { plan: 'PRO',       expected: 0.03 },
      { plan: 'BUSINESS',  expected: 0.02 },
    ];

    plans.forEach(({ plan, expected }) => {
      it(`plan ${plan} → commission ${expected * 100}%`, async () => {
        const price = 100_000;
        const product = {
          id: 'prod-1',
          title: 'Test Product',
          price,
          quantity: 5,
          sellerId: 'seller-1',
          status: 'PUBLISHED',
          seller: {
            id: 'seller-1',
            subscription: { plan },
            phone: null,
          },
          images: [],
        };

        mockPrisma.product.findUnique.mockResolvedValue(product);
        mockPrisma.order.create.mockImplementation(({ data }) => {
          // Vérifie que la commission est correcte
          expect(data.commissionAmount).toBeCloseTo(price * expected);
          expect(data.sellerAmount).toBeCloseTo(price * (1 - expected));
          return Promise.resolve({ ...data, id: 'order-1', orderNumber: 'LS-001' });
        });

        await service.createOrder('buyer-1', { productId: 'prod-1', quantity: 1 });
        expect(mockPrisma.order.create).toHaveBeenCalled();
      });
    });
  });

  // ── Escrow timing ────────────────────────────────────────────────────────

  describe('Escrow — calcul du délai', () => {
    it('escrowReleaseAt ne doit PAS être défini à la création de commande', async () => {
      const product = {
        id: 'prod-1', title: 'P', price: 50000, quantity: 3,
        sellerId: 'seller-1', status: 'PUBLISHED',
        seller: { id: 'seller-1', subscription: { plan: 'FREE' }, phone: null },
        images: [],
      };
      mockPrisma.product.findUnique.mockResolvedValue(product);
      mockPrisma.order.create.mockImplementation(({ data }) => {
        // escrowReleaseAt ne doit pas être dans les données de création
        expect(data.escrowReleaseAt).toBeUndefined();
        return Promise.resolve({ ...data, id: 'order-1', orderNumber: 'LS-002' });
      });

      await service.createOrder('buyer-1', { productId: 'prod-1', quantity: 1 });
    });

    it('escrowReleaseAt doit être défini lors du passage à DELIVERED', async () => {
      const order = {
        id: 'order-1', status: 'SHIPPED', buyerId: 'buyer-1', sellerId: 'seller-1',
        totalAmount: 50000,
        items: [{ productId: 'prod-1', quantity: 1 }],
        buyer: { firstName: 'Jean', email: 'jean@test.com', phone: null },
        seller: { firstName: 'Marc', email: 'marc@test.com', phone: null },
      };
      mockPrisma.order.findUnique.mockResolvedValue(order);
      mockPrisma.order.update.mockImplementation(({ data }) => {
        // escrowReleaseAt doit être ~48h dans le futur
        if (data.status === 'DELIVERED') {
          expect(data.escrowReleaseAt).toBeDefined();
          const releaseTime = new Date(data.escrowReleaseAt).getTime();
          const now = Date.now();
          const diffHours = (releaseTime - now) / (1000 * 3600);
          expect(diffHours).toBeGreaterThan(47);
          expect(diffHours).toBeLessThan(49);
        }
        return Promise.resolve({ ...order, ...data });
      });

      await service.updateStatus('order-1', 'buyer-1', 'BUYER', 'DELIVERED');
    });
  });

  // ── Stock restoration ────────────────────────────────────────────────────

  describe('Stock — restauration à l\'annulation', () => {
    it('doit incrémenter le stock quand status = CANCELLED', async () => {
      const order = {
        id: 'order-1', status: 'PENDING', buyerId: 'buyer-1', sellerId: 'seller-1',
        totalAmount: 50000,
        items: [{ productId: 'prod-1', quantity: 2 }],
        buyer: { firstName: 'Jean', email: 'jean@test.com', phone: null },
        seller: { firstName: 'Marc', email: 'marc@test.com', phone: null },
      };
      mockPrisma.order.findUnique.mockResolvedValue(order);
      mockPrisma.product.update.mockResolvedValue({});
      mockPrisma.order.update.mockResolvedValue({ ...order, status: 'CANCELLED' });

      await service.updateStatus('order-1', 'buyer-1', 'BUYER', 'CANCELLED');

      expect(mockPrisma.product.update).toHaveBeenCalledWith(
        expect.objectContaining({
          where: { id: 'prod-1' },
          data: { quantity: { increment: 2 } },
        }),
      );
    });

    it('ne doit PAS modifier le stock si status !== CANCELLED', async () => {
      const order = {
        id: 'order-1', status: 'PAYMENT_CONFIRMED', buyerId: 'seller-1', sellerId: 'seller-1',
        totalAmount: 50000,
        items: [{ productId: 'prod-1', quantity: 1 }],
        buyer: { firstName: 'Jean', email: 'j@test.com', phone: null },
        seller: { firstName: 'Marc', email: 'm@test.com', phone: null },
      };
      mockPrisma.order.findUnique.mockResolvedValue(order);
      mockPrisma.order.update.mockResolvedValue({ ...order, status: 'PROCESSING' });

      await service.updateStatus('order-1', 'seller-1', 'SELLER', 'PROCESSING');

      expect(mockPrisma.product.update).not.toHaveBeenCalled();
    });
  });

  // ── Access control ───────────────────────────────────────────────────────

  describe('Contrôle d\'accès', () => {
    it('getOrderById doit lever ForbiddenException si ni buyer ni seller', async () => {
      mockPrisma.order.findUnique.mockResolvedValue({
        id: 'order-1', buyerId: 'user-A', sellerId: 'user-B',
        items: [], buyer: {}, seller: {}, payment: null,
      });

      await expect(service.getOrderById('order-1', 'user-C', 'BUYER'))
        .rejects.toThrow(ForbiddenException);
    });

    it('getOrderById doit réussir pour le buyer', async () => {
      const order = {
        id: 'order-1', buyerId: 'user-A', sellerId: 'user-B',
        items: [], buyer: {}, seller: {}, payment: null,
      };
      mockPrisma.order.findUnique.mockResolvedValue(order);

      const result = await service.getOrderById('order-1', 'user-A', 'BUYER');
      expect(result.data).toEqual(order);
    });
  });
});
