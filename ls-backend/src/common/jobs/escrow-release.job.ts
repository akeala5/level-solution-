import { Injectable, Logger } from '@nestjs/common';
import { Cron, CronExpression } from '@nestjs/schedule';
import { PrismaService } from '../../prisma/prisma.service';
import { NotificationsService } from '../../notifications/notifications.service';
import { WalletService } from '../../wallet/wallet.service';

@Injectable()
export class EscrowReleaseJob {
  private readonly logger = new Logger(EscrowReleaseJob.name);

  constructor(
    private prisma: PrismaService,
    private notifications: NotificationsService,
    private wallet: WalletService,
  ) {}

  // Vérifie toutes les heures les escrows expirés
  @Cron(CronExpression.EVERY_HOUR)
  async releaseExpiredEscrows() {
    const now = new Date();

    const ordersToComplete = await this.prisma.order.findMany({
      where: {
        status: 'DELIVERED',
        escrowReleaseAt: { lte: now },
        payment: { escrowReleasedAt: null },
      },
      include: {
        buyer: { select: { id: true, email: true, firstName: true } },
        seller: { select: { id: true, email: true, firstName: true } },
        payment: { select: { id: true } },
        items: { select: { productId: true, quantity: true } },
      },
    });

    if (ordersToComplete.length === 0) return;

    this.logger.log(`Libération automatique de ${ordersToComplete.length} escrow(s)`);

    for (const order of ordersToComplete) {
      try {
        // Libère l'escrow + crédite le PORTEFEUILLE VENDEUR + fidélité acheteur
        // via la source unique de vérité (idempotent : flip escrowReleasedAt).
        await this.wallet.creditSellerFromOrder(order.id);

        // Marquer la commande comme terminée (gardé : uniquement depuis DELIVERED)
        await this.prisma.order.updateMany({
          where: { id: order.id, status: 'DELIVERED' },
          data: { status: 'COMPLETED', completedAt: now },
        });

        // Notification au vendeur
        await this.notifications.createNotification({
          userId: order.seller.id,
          type: 'PAYMENT_RECEIVED',
          title: 'Fonds libérés !',
          titleEn: 'Funds released!',
          body: `Les fonds de la commande #${order.orderNumber} (${order.sellerAmount.toLocaleString()} XOF) ont été libérés.`,
          data: { orderId: order.id },
        });

        this.logger.log(`Escrow libéré pour commande ${order.orderNumber}`);
      } catch (error) {
        this.logger.error(`Erreur libération escrow ${order.id}: ${error.message}`);
      }
    }
  }
}
