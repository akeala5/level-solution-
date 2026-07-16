import {
  Controller, Get, Post, Patch, Body, Param, Query,
  ParseIntPipe, DefaultValuePipe, UseGuards,
} from '@nestjs/common';
import { Throttle } from '@nestjs/throttler';
import { ApiTags, ApiBearerAuth, ApiOperation } from '@nestjs/swagger';
import { ReportsService } from './reports.service';
import { CreateReportDto } from './dto/create-report.dto';
import { HandleReportDto } from './dto/handle-report.dto';
import { CurrentUser } from '../common/decorators/current-user.decorator';
import { Roles } from '../common/decorators/roles.decorator';
import { RolesGuard } from '../common/guards/roles.guard';

@ApiTags('Reports')
@ApiBearerAuth()
@Controller('reports')
export class ReportsController {
  constructor(private readonly reportsService: ReportsService) {}

  @Post()
  @Throttle({ default: { limit: 5, ttl: 60000 } })
  @ApiOperation({ summary: 'Signaler un élément (annonce, utilisateur, avis)' })
  create(@CurrentUser('id') userId: string, @Body() dto: CreateReportDto) {
    return this.reportsService.create(userId, dto);
  }

  @Get('mine')
  @ApiOperation({ summary: 'Mes signalements' })
  mine(
    @CurrentUser('id') userId: string,
    @Query('page', new DefaultValuePipe(1), ParseIntPipe) page: number,
    @Query('limit', new DefaultValuePipe(20), ParseIntPipe) limit: number,
  ) {
    return this.reportsService.mine(userId, page, limit);
  }

  // ─── ADMIN / MODERATION ─────────────────────────────────────────────────────

  @UseGuards(RolesGuard)
  @Roles('ADMIN' as any, 'MODERATOR' as any)
  @Get('admin')
  @ApiOperation({ summary: '[Admin/Modérateur] File de modération des signalements' })
  adminList(
    @Query('page', new DefaultValuePipe(1), ParseIntPipe) page: number,
    @Query('limit', new DefaultValuePipe(20), ParseIntPipe) limit: number,
    @Query('status') status?: string,
    @Query('targetType') targetType?: string,
  ) {
    return this.reportsService.adminList(status, targetType, page, limit);
  }

  @UseGuards(RolesGuard)
  @Roles('ADMIN' as any, 'MODERATOR' as any)
  @Patch('admin/:id')
  @ApiOperation({ summary: '[Admin/Modérateur] Traiter un signalement (REVIEWING | ACTIONED | DISMISSED)' })
  handle(
    @CurrentUser('id') adminId: string,
    @Param('id') id: string,
    @Body() dto: HandleReportDto,
  ) {
    return this.reportsService.handle(id, adminId, dto);
  }
}
