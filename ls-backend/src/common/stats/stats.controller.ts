import { Controller, Get } from '@nestjs/common';
import { ApiTags, ApiOperation } from '@nestjs/swagger';
import { PrismaService } from '../../prisma/prisma.service';
import { Public } from '../decorators/public.decorator';

@ApiTags('Stats')
@Controller('stats')
export class StatsController {
  constructor(private prisma: PrismaService) {}

  @Public()
  @Get()
  @ApiOperation({ summary: 'Statistiques publiques de la plateforme (comptes réels)' })
  async platform() {
    const [activeProducts, members, completedOrders, rating] = await this.prisma.$transaction([
      this.prisma.product.count({ where: { status: 'ACTIVE' } }),
      this.prisma.user.count(),
      this.prisma.order.count({ where: { status: 'COMPLETED' } }),
      this.prisma.review.aggregate({ _avg: { rating: true }, _count: true }),
    ]);

    return {
      message: 'Statistiques',
      data: {
        activeProducts,
        members,
        completedOrders,
        reviewsCount: rating._count,
        avgRating: rating._count > 0 ? Number((rating._avg.rating ?? 0).toFixed(1)) : null,
      },
    };
  }
}
