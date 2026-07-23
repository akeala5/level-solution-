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
    const res = await this.prisma.searchAlert.deleteMany({ where: { id: alertId, userId } });
    if (res.count === 0) throw new NotFoundException('Alerte introuvable');
    return { message: 'Alerte supprimée' };
  }

  // ─── ADMIN : Heatmap des requêtes de recherche ───────────────────────────────

  async getSearchHeatmap() {
    // AUD-007 : agregation cote SQL (groupBy) au lieu de charger toute la table.
    const grouped = await this.prisma.searchAlert.groupBy({
      by: ['query'],
      _count: { query: true },
    });

    const counts: Record<string, number> = {};
    for (const g of grouped) {
      const key = g.query.toLowerCase().trim();
      if (key.length > 1) counts[key] = (counts[key] ?? 0) + (g._count.query ?? 0);
    }

    const heatmap = Object.entries(counts)
      .sort(([, a], [, b]) => b - a)
      .slice(0, 60)
      .map(([query, count]) => ({ query, count }));

    return { data: heatmap };
  }

  // ─── CRON : Vérifier les nouvelles annonces correspondant aux alertes ─────────
  async processAlerts() {
    const cutoff = new Date(Date.now() - 24 * 60 * 60 * 1000); // 24h ago

    const BATCH = 200;
    let cursor: string | undefined;
    let processed = 0;

    // AUD-007 : traitement par lots (curseur) au lieu de tout charger en memoire.
    for (;;) {
    const alerts = await this.prisma.searchAlert.findMany({
      where: {
        isActive: true,
        OR: [{ lastSentAt: null }, { lastSentAt: { lte: cutoff } }],
      },
      select: { id: true, userId: true, query: true, filters: true, lastSentAt: true },
      orderBy: { id: 'asc' },
      take: BATCH,
      ...(cursor ? { cursor: { id: cursor }, skip: 1 } : {}),
    });
    if (alerts.length === 0) break;

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
    processed += alerts.length;
    cursor = alerts[alerts.length - 1].id;
    if (alerts.length < BATCH) break;
    }

    return processed;
  }
}
