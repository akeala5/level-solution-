import { Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { NotificationsService } from '../notifications/notifications.service';

@Injectable()
export class SearchAlertsService {
  constructor(
    private prisma: PrismaService,
    private notifications: NotificationsService,
  ) {}

  async create(userId: string, dto: { query: string; filters?: Record<string, any> }) {
    const alert = await this.prisma.searchAlert.create({
      data: { userId, query: dto.query, filters: dto.filters ?? {} },
    });
    return { message: 'Alerte créée', data: alert };
  }

  async findAllForUser(userId: string) {
    const alerts = await this.prisma.searchAlert.findMany({
      where: { userId },
      orderBy: { createdAt: 'desc' },
    });
    return { data: alerts };
  }

  async toggle(userId: string, alertId: string) {
    const alert = await this.prisma.searchAlert.findFirst({
      where: { id: alertId, userId },
    });
    if (!alert) throw new NotFoundException('Alerte introuvable');

    const updated = await this.prisma.searchAlert.update({
      where: { id: alertId },
      data: { isActive: !alert.isActive },
    });
    return { message: updated.isActive ? 'Alerte activée' : 'Alerte désactivée', data: updated };
  }

  async delete(userId: string, alertId: string) {
    await this.prisma.searchAlert.deleteMany({ where: { id: alertId, userId } });
    return { message: 'Alerte supprimée' };
  }

  // ─── CRON : Vérifier les nouvelles annonces correspondant aux alertes ─────────
  async processAlerts() {
    const cutoff = new Date(Date.now() - 24 * 60 * 60 * 1000); // 24h ago

    const alerts = await this.prisma.searchAlert.findMany({
      where: {
        isActive: true,
        OR: [{ lastSentAt: null }, { lastSentAt: { lte: cutoff } }],
      },
      select: { id: true, userId: true, query: true, filters: true, lastSentAt: true },
    });

    for (const alert of alerts) {
      const since = alert.lastSentAt ?? cutoff;
      const filters = (alert.filters as Record<string, any>) ?? {};

      const where: any = {
        status: 'ACTIVE',
        createdAt: { gte: since },
        OR: [
          { title: { contains: alert.query, mode: 'insensitive' } },
          { description: { contains: alert.query, mode: 'insensitive' } },
        ],
      };

      if (filters.categoryId) where.categoryId = filters.categoryId;
      if (filters.minPrice) where.price = { ...where.price, gte: filters.minPrice };
      if (filters.maxPrice) where.price = { ...where.price, lte: filters.maxPrice };
      if (filters.condition) where.condition = filters.condition;

      const count = await this.prisma.product.count({ where });

      if (count > 0) {
        await this.notifications.createNotification({
          userId: alert.userId,
          type: 'SYSTEM',
          title: `${count} nouvelle${count > 1 ? 's' : ''} annonce${count > 1 ? 's' : ''} pour "${alert.query}"`,
          body: `De nouvelles annonces correspondant à votre alerte sont disponibles.`,
          data: { alertId: alert.id, query: alert.query, count },
        });

        await this.prisma.searchAlert.update({
          where: { id: alert.id },
          data: { lastSentAt: new Date() },
        });
      }
    }

    return alerts.length;
  }
}
