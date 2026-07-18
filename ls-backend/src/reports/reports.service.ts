import {
  Injectable,
  BadRequestException,
  NotFoundException,
} from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { NotificationsService } from '../notifications/notifications.service';
import { getPaginationParams, paginate } from '../common/utils/pagination.util';
import { CreateReportDto } from './dto/create-report.dto';
import { HandleReportDto } from './dto/handle-report.dto';
import { ReportTargetType } from '@prisma/client';

@Injectable()
export class ReportsService {
  constructor(
    private prisma: PrismaService,
    private notifications: NotificationsService,
  ) {}

  // ─── UTILISATEUR ────────────────────────────────────────────────────────────

  async create(reporterId: string, dto: CreateReportDto) {
    // 1) La cible doit exister (évite les signalements fantômes).
    await this.assertTargetExists(dto.targetType, dto.targetId);

    // 2) Anti-spam : un seul signalement PENDING par (reporter, cible).
    const existing = await this.prisma.report.findFirst({
      where: {
        reporterId,
        targetType: dto.targetType,
        targetId: dto.targetId,
        status: 'PENDING',
      },
      select: { id: true },
    });
    if (existing) {
      throw new BadRequestException('Vous avez déjà un signalement en cours pour cet élément.');
    }

    const report = await this.prisma.report.create({
      data: {
        reporterId,
        targetType: dto.targetType,
        targetId: dto.targetId,
        reason: dto.reason,
        description: dto.description ?? null,
      },
    });
    return { message: 'Signalement enregistré', data: report };
  }

  async mine(reporterId: string, page = 1, limit = 20) {
    const { skip, take } = getPaginationParams(page, limit);
    const [items, total] = await Promise.all([
      this.prisma.report.findMany({
        where: { reporterId },
        skip,
        take,
        orderBy: { createdAt: 'desc' },
      }),
      this.prisma.report.count({ where: { reporterId } }),
    ]);
    return { message: 'Mes signalements', data: items, meta: paginate(total, page, limit) };
  }

  // ─── ADMIN / MODERATION ─────────────────────────────────────────────────────

  async adminList(status?: string, targetType?: string, page = 1, limit = 20) {
    const { skip, take } = getPaginationParams(page, limit);
    const where: any = {};
    if (status) where.status = status;
    if (targetType) where.targetType = targetType;

    const [items, total] = await Promise.all([
      this.prisma.report.findMany({
        where,
        skip,
        take,
        orderBy: { createdAt: 'asc' }, // le plus ancien en attente d'abord
        include: {
          reporter: { select: { id: true, firstName: true, lastName: true, email: true } },
        },
      }),
      this.prisma.report.count({ where }),
    ]);

    // Enrichissement best-effort d'un libellé lisible de la cible pour l'admin.
    const data = await Promise.all(
      items.map(async (r) => ({
        ...r,
        targetLabel: await this.targetLabel(r.targetType, r.targetId),
      })),
    );
    return { message: 'Signalements', data, meta: paginate(total, page, limit) };
  }

  async handle(id: string, adminId: string, dto: HandleReportDto) {
    const report = await this.prisma.report.findUnique({ where: { id } });
    if (!report) throw new NotFoundException('Signalement introuvable');
    if (report.status === 'ACTIONED' || report.status === 'DISMISSED') {
      throw new BadRequestException('Ce signalement est déjà clôturé.');
    }

    const isClosing = dto.status === 'ACTIONED' || dto.status === 'DISMISSED';

    const updated = await this.prisma.report.update({
      where: { id },
      data: {
        status: dto.status,
        resolution: dto.resolution ?? report.resolution,
        handledBy: adminId,
        handledAt: isClosing ? new Date() : null,
      },
    });

    // Notifie le reporter uniquement à la clôture (ACTIONED / DISMISSED).
    if (isClosing) {
      await this.notifications.createNotification({
        userId: report.reporterId,
        type: 'SYSTEM',
        title: 'Votre signalement a été traité',
        body:
          dto.status === 'ACTIONED'
            ? `Merci — des mesures ont été prises suite à votre signalement.${dto.resolution ? ' ' + dto.resolution : ''}`
            : `Après examen, aucune action n'a été retenue pour votre signalement.${dto.resolution ? ' ' + dto.resolution : ''}`,
      });
    }
    return { message: 'Signalement mis à jour', data: updated };
  }

  // ─── HELPERS ──────────────────────────────────────────────────────────────────

  private async assertTargetExists(type: ReportTargetType, id: string) {
    let exists = false;
    if (type === 'PRODUCT') {
      exists = !!(await this.prisma.product.findUnique({ where: { id }, select: { id: true } }));
    } else if (type === 'USER') {
      exists = !!(await this.prisma.user.findUnique({ where: { id }, select: { id: true } }));
    } else if (type === 'REVIEW') {
      exists = !!(await this.prisma.review.findUnique({ where: { id }, select: { id: true } }));
    }
    if (!exists) throw new NotFoundException('Élément signalé introuvable');
  }

  private async targetLabel(type: ReportTargetType, id: string): Promise<string | null> {
    try {
      if (type === 'PRODUCT') {
        const p = await this.prisma.product.findUnique({
          where: { id },
          select: { title: true },
        });
        return p?.title ?? null;
      }
      if (type === 'USER') {
        const u = await this.prisma.user.findUnique({
          where: { id },
          select: { firstName: true, lastName: true },
        });
        return u ? `${u.firstName} ${u.lastName}` : null;
      }
      return null; // REVIEW : pas de libellé simple
    } catch {
      return null;
    }
  }
}
