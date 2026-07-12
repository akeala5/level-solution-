import {
  Controller, Get, Post, Delete, Patch,
  Body, Param, ParseUUIDPipe, UseGuards,
} from '@nestjs/common';
import { ApiTags, ApiBearerAuth, ApiOperation } from '@nestjs/swagger';
import { SearchAlertsService } from './search-alerts.service';
import { CurrentUser } from '../common/decorators/current-user.decorator';
import { Roles } from '../common/decorators/roles.decorator';
import { RolesGuard } from '../common/guards/roles.guard';

@Controller('search-alerts')
export class SearchAlertsController {
  constructor(private readonly searchAlertsService: SearchAlertsService) {}

  @Get()
  findAll(@CurrentUser('id') userId: string) {
    return this.searchAlertsService.findAllForUser(userId);
  }

  @Post()
  create(
    @CurrentUser('id') userId: string,
    @Body() body: { query: string; filters?: Record<string, any> },
  ) {
    return this.searchAlertsService.create(userId, body);
  }

  @Patch(':id/toggle')
  toggle(
    @CurrentUser('id') userId: string,
    @Param('id', ParseUUIDPipe) alertId: string,
  ) {
    return this.searchAlertsService.toggle(userId, alertId);
  }

  @Delete(':id')
  delete(
    @CurrentUser('id') userId: string,
    @Param('id', ParseUUIDPipe) alertId: string,
  ) {
    return this.searchAlertsService.delete(userId, alertId);
  }

  @UseGuards(RolesGuard)
  @Roles('ADMIN' as any, 'MODERATOR' as any)
  @Get('admin/heatmap')
  @ApiOperation({ summary: '[Admin] Top requêtes de recherche (heatmap)' })
  getSearchHeatmap() {
    return this.searchAlertsService.getSearchHeatmap();
  }
}
