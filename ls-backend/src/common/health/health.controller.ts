import { Controller, Get } from '@nestjs/common';
import { ApiTags, ApiOperation } from '@nestjs/swagger';
import { PrismaService } from '../../prisma/prisma.service';
import { SearchService } from '../../search/search.service';
import { Public } from '../decorators/public.decorator';

@ApiTags('Health')
@Controller('health')
export class HealthController {
  private readonly startTime = Date.now();

  constructor(
    private prisma: PrismaService,
    private search: SearchService,
  ) {}

  @Public()
  @Get()
  @ApiOperation({ summary: "Vérification de santé de l'API (readiness)" })
  async check() {
    const checks: Record<string, any> = {};

    // Base de données
    try {
      await this.prisma.$queryRaw`SELECT 1`;
      checks.database = { status: 'up' };
    } catch {
      checks.database = { status: 'down' };
    }

    // Moteur de recherche (Meilisearch) — 'disabled' n'est pas un échec.
    const searchStatus = await this.search.ping();
    if (searchStatus !== 'disabled') {
      checks.search = { status: searchStatus };
    }

    // On ne considère « down » que les dépendances réellement présentes.
    const allUp = Object.values(checks).every((c: any) => c.status === 'up');

    const mem = process.memoryUsage();

    return {
      status: allUp ? 'ok' : 'degraded',
      version: process.env.npm_package_version || '1.0.0',
      environment: process.env.NODE_ENV || 'development',
      uptime: Math.floor((Date.now() - this.startTime) / 1000),
      memory: {
        rssMb: Math.round(mem.rss / 1048576),
        heapUsedMb: Math.round(mem.heapUsed / 1048576),
      },
      timestamp: new Date().toISOString(),
      checks,
    };
  }
}
