import { Injectable, Logger } from '@nestjs/common';
import { Cron, CronExpression } from '@nestjs/schedule';
import { PrismaService } from '../../prisma/prisma.service';
import { NotificationsService } from '../../notifications/notifications.service';

@Injectable()
export class EscrowReleaseJob {
  private readonly logger = new Logger(EscrowReleaseJob.name);

  constructor(
    private prisma: PrismaService,
    private notifications: NotificationsService,
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
        await this.prisma.$transaction([
          // Marquer la commande comme terminée
          this.prisma.order.update({
            where: { id: order.id },
            data: { status: 'COMPLETED', completedAt: now },
          }),
          // Libérer l'escrow
          this.prisma.payment.update({
            where: { orderId: order.id },
            data: { escrowReleasedAt: now },
          }),
          // Créditer les points de fidélité de l'acheteur
          this.prisma.loyaltyAccount.upsert({
            where: { userId: order.buyerId },
            update: {
              points: { increment: Math.floor(order.totalAmount / 1000) },
              totalEarned: { increment: Math.floor(order.totalAmount / 1000) },
            },
            create: {
              userId: order.buyerId,
              points: Math.floor(order.totalAmount / 1000),
              totalEarned: Math.floor(order.totalAmount / 1000),
            },
          }),
        ]);

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
