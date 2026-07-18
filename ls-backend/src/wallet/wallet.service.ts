import { Injectable, Logger, BadRequestException, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { getPaginationParams, paginate } from '../common/utils/pagination.util';

export const PAYOUT_MIN_AMOUNT = 1000; // XOF
export const PAYOUT_METHODS = ['FEDAPAY', 'BANK_TRANSFER'] as const;

@Injectable()
export class WalletService {
  private readonly logger = new Logger(WalletService.name);

  constructor(private prisma: PrismaService) {}

  // ─── CRÉDIT VENDEUR (libération d'escrow) ────────────────────────────────────
  // Source unique de vérité, appelée par OrdersService.releaseEscrow ET par le
  // cron EscrowReleaseJob. Idempotente : le flip atomique de escrowReleasedAt
  // (updateMany where null) garantit qu'un même ordre ne crédite qu'UNE fois,
  // même sous appels concurrents. Tout est dans une seule transaction : si le
  // crédit échoue, le flip est annulé aussi.
  async creditSellerFromOrder(orderId: string): Promise<boolean> {
    const order = await this.prisma.order.findUnique({
      where: { id: orderId },
      select: {
        id: true, orderNumber: true, buyerId: true, sellerId: true,
        totalAmount: true, sellerAmount: true,
        payment: { select: { id: true } },
      },
    });
    if (!order?.payment) return false;

    const loyaltyPoints = Math.floor(order.totalAmount / 1000);

    try {
      return await this.prisma.$transaction(async (tx) => {
        const flip = await tx.payment.updateMany({
          where: { orderId, escrowReleasedAt: null },
          data: { escrowReleasedAt: new Date() },
        });
        if (flip.count === 0) return false; // déjà libéré → no-op

        await tx.sellerWallet.upsert({
          where: { sellerId: order.sellerId },
          update: { balance: { increment: order.sellerAmount } },
          create: { sellerId: order.sellerId, balance: order.sellerAmount },
        });
        await tx.walletTransaction.create({
          data: {
            sellerId: order.sellerId,
            orderId: order.id,
            type: 'CREDIT',
            amount: order.sellerAmount,
            label: `Vente ${order.orderNumber}`,
          },
        });
        // Points de fidélité acheteur (comportement conservé)
        await tx.loyaltyAccount.upsert({
          where: { userId: order.buyerId },
          update: {
            points: { increment: loyaltyPoints },
            totalEarned: { increment: loyaltyPoints },
          },
          create: { userId: order.buyerId, points: loyaltyPoints, totalEarned: loyaltyPoints },
        });

        this.logger.log(
          `Wallet crédité: vendeur ${order.sellerId} +${order.sellerAmount} XOF (commande ${order.orderNumber})`,
        );
        return true;
      });
    } catch (error) {
      this.logger.error(`Échec crédit wallet commande ${orderId}: ${error.message}`);
      throw error;
    }
  }

  // ─── CONSULTATION ────────────────────────────────────────────────────────────

  async getWallet(sellerId: string) {
    const [wallet, pending, totalCredited, lastTransactions] = await Promise.all([
      this.prisma.sellerWallet.findUnique({ where: { sellerId } }),
      this.prisma.payoutRequest.aggregate({
        where: { sellerId, status: { in: ['PENDING', 'APPROVED'] } },
        _sum: { amount: true },
      }),
      this.prisma.walletTransaction.aggregate({
        where: { sellerId, type: 'CREDIT' },
        _sum: { amount: true },
      }),
      this.prisma.walletTransaction.findMany({
        where: { sellerId },
        orderBy: { createdAt: 'desc' },
        take: 10,
      }),
    ]);

    return {
      message: 'Portefeuille',
      data: {
        balance: wallet?.balance ?? 0,
        currency: wallet?.currency ?? 'XOF',
        pendingPayouts: pending._sum.amount ?? 0,
        totalEarned: totalCredited._sum.amount ?? 0,
        lastTransactions,
      },
    };
  }

  async getTransactions(sellerId: string, page = 1, limit = 20) {
    const { skip, take } = getPaginationParams(page, limit);
    const [transactions, total] = await Promise.all([
      this.prisma.walletTransaction.findMany({
        where: { sellerId },
        skip, take,
        orderBy: { createdAt: 'desc' },
      }),
      this.prisma.walletTransaction.count({ where: { sellerId } }),
    ]);
    return { message: 'Mouvements du portefeuille', data: transactions, meta: paginate(total, page, limit) };
  }

  async getMyPayouts(sellerId: string, page = 1, limit = 20) {
    const { skip, take } = getPaginationParams(page, limit);
    const [payouts, total] = await Promise.all([
      this.prisma.payoutRequest.findMany({
        where: { sellerId },
        skip, take,
        orderBy: { createdAt: 'desc' },
      }),
      this.prisma.payoutRequest.count({ where: { sellerId } }),
    ]);
    return { message: 'Mes demandes de retrait', data: payouts, meta: paginate(total, page, limit) };
  }

  // ─── DEMANDE DE RETRAIT (vendeur) ────────────────────────────────────────────
  // Débit ATOMIQUE sous garde balance >= amount : deux demandes simultanées ne
  // peuvent pas retirer plus que le solde.
  async requestPayout(sellerId: string, dto: { amount: number; method: string; destination: any }) {
    const amount = Number(dto.amount);
    if (!Number.isFinite(amount) || amount < PAYOUT_MIN_AMOUNT) {
      throw new BadRequestException(`Montant minimum de retrait : ${PAYOUT_MIN_AMOUNT} XOF`);
    }
    if (!PAYOUT_METHODS.includes(dto.method as any)) {
      throw new BadRequestException(`Méthode invalide (${PAYOUT_METHODS.join(' | ')})`);
    }
    if (!dto.destination) {
      throw new BadRequestException('Destination du versement requise (n° Mobile Money ou IBAN)');
    }

    const payout = await this.prisma.$transaction(async (tx) => {
      const debit = await tx.sellerWallet.updateMany({
        where: { sellerId, balance: { gte: amount } },
        data: { balance: { decrement: amount } },
      });
      if (debit.count === 0) {
        throw new BadRequestException('Solde insuffisant');
      }
      const req = await tx.payoutRequest.create({
        data: { sellerId, amount, method: dto.method, destination: dto.destination },
      });
      await tx.walletTransaction.create({
        data: {
          sellerId,
          payoutRequestId: req.id,
          type: 'PAYOUT',
          amount,
          label: `Demande de retrait ${req.id.slice(0, 8).toUpperCase()}`,
        },
      });
      return req;
    });

    this.logger.log(`Payout demandé: vendeur ${sellerId}, ${amount} XOF (${payout.id})`);
    return { message: 'Demande de retrait enregistrée — en attente de validation', data: payout };
  }

  // ─── ADMINISTRATION DES RETRAITS ─────────────────────────────────────────────

  async adminListPayouts(status?: string, page = 1, limit = 20) {
    const { skip, take } = getPaginationParams(page, limit);
    const where: any = {};
    if (status) where.status = status;
    const [payouts, total] = await Promise.all([
      this.prisma.payoutRequest.findMany({
        where, skip, take,
        orderBy: { createdAt: 'desc' },
        include: {
          seller: {
            select: {
              id: true, email: true, firstName: true, lastName: true,
              sellerProfile: { select: { shopName: true } },
            },
          },
        },
      }),
      this.prisma.payoutRequest.count({ where }),
    ]);
    return { message: 'Demandes de retrait', data: payouts, meta: paginate(total, page, limit) };
  }

  // APPROVED = validé (à verser) ; PAID = versement effectué (référence en notes).
  async adminProcessPayout(
    payoutId: string,
    adminId: string,
    action: 'APPROVE' | 'PAID' | 'REJECT',
    notes?: string,
  ) {
    const payout = await this.prisma.payoutRequest.findUnique({ where: { id: payoutId } });
    if (!payout) throw new NotFoundException('Demande de retrait introuvable');

    if (action === 'APPROVE') {
      const res = await this.prisma.payoutRequest.updateMany({
        where: { id: payoutId, status: 'PENDING' },
        data: { status: 'APPROVED', processedBy: adminId, processedAt: new Date(), notes },
      });
      if (res.count === 0) throw new BadRequestException(`Transition impossible depuis ${payout.status}`);
    } else if (action === 'PAID') {
      const res = await this.prisma.payoutRequest.updateMany({
        where: { id: payoutId, status: { in: ['PENDING', 'APPROVED'] } },
        data: { status: 'PAID', processedBy: adminId, processedAt: new Date(), notes },
      });
      if (res.count === 0) throw new BadRequestException(`Transition impossible depuis ${payout.status}`);
    } else if (action === 'REJECT') {
      // Rejet = re-créditer le vendeur, atomiquement et une seule fois
      // (la garde updateMany empêche un double re-crédit sur double clic admin).
      await this.prisma.$transaction(async (tx) => {
        const res = await tx.payoutRequest.updateMany({
          where: { id: payoutId, status: { in: ['PENDING', 'APPROVED'] } },
          data: { status: 'REJECTED', processedBy: adminId, processedAt: new Date(), notes },
        });
        if (res.count === 0) throw new BadRequestException(`Transition impossible depuis ${payout.status}`);
        await tx.sellerWallet.update({
          where: { sellerId: payout.sellerId },
          data: { balance: { increment: payout.amount } },
        });
        await tx.walletTransaction.create({
          data: {
            sellerId: payout.sellerId,
            payoutRequestId: payout.id,
            type: 'REFUND_CREDIT',
            amount: payout.amount,
            label: `Retrait ${payout.id.slice(0, 8).toUpperCase()} rejeté — solde restauré`,
          },
        });
      });
    } else {
      throw new BadRequestException('Action invalide (APPROVE | PAID | REJECT)');
    }

    await this.prisma.auditLog.create({
      data: { userId: adminId, action: `PAYOUT_${action}`, entity: 'PayoutRequest', entityId: payoutId },
    }).catch(() => null);

    const updated = await this.prisma.payoutRequest.findUnique({ where: { id: payoutId } });
    return { message: `Retrait ${action === 'REJECT' ? 'rejeté (solde restauré)' : action === 'PAID' ? 'marqué versé' : 'validé'}`, data: updated };
  }
}
