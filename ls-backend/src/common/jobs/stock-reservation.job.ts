import { Injectable, Logger } from '@nestjs/common';
import { Cron, CronExpression } from '@nestjs/schedule';
import { PrismaService } from '../../prisma/prisma.service';

@Injectable()
export class StockReservationJob {
  private readonly logger = new Logger(StockReservationJob.name);

  constructor(private prisma: PrismaService) {}

  // Libère toutes les 5 min les réservations expirées dont la commande
  // est restée PENDING : restaure le stock et annule la commande fantôme.
  @Cron(CronExpression.EVERY_5_MINUTES)
  async releaseExpiredReservations() {
    const now = new Date();

    const expired = await this.prisma.stockReservation.findMany({
      where: {
        expiresAt: { lt: now },
        releasedAt: null,
        order: { status: 'PENDING' },
      },
    });

    if (expired.length === 0) return;

    // Regrouper par commande : une commande peut porter plusieurs réservations
    const byOrder = new Map<string, typeof expired>();
    for (const r of expired) {
      const list = byOrder.get(r.orderId) ?? [];
      list.push(r);
      byOrder.set(r.orderId, list);
    }

    this.logger.log(
      `Libération de ${expired.length} réservation(s) sur ${byOrder.size} commande(s) expirée(s)`,
    );

    for (const [orderId, reservations] of byOrder) {
      try {
        await this.prisma.$transaction(async (tx) => {
          // On annule D'ABORD sous garde PENDING. Si une confirmation de
          // paiement a gagné la course juste après le SELECT, count === 0 et
          // on ne restaure surtout PAS le stock d'une commande payée.
          const cancel = await tx.order.updateMany({
            where: { id: orderId, status: 'PENDING' },
            data: {
              status: 'CANCELLED',
              cancelledAt: now,
              cancellationReason: 'Paiement non finalisé (réservation expirée)',
            },
          });
          if (cancel.count === 0) return;

          for (const r of reservations) {
            await tx.product.update({
              where: { id: r.productId },
              data: { quantity: { increment: r.quantity } },
            });
          }
          await tx.stockReservation.updateMany({
            where: { id: { in: reservations.map((r) => r.id) }, releasedAt: null },
            data: { releasedAt: now },
          });
        });
        this.logger.log(`Réservation expirée libérée pour commande ${orderId}`);
      } catch (error) {
        this.logger.error(`Erreur libération réservation ${orderId}: ${error.message}`);
      }
    }
  }
}
