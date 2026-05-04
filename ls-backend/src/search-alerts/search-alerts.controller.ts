import {
  Controller, Get, Post, Delete, Patch,
  Body, Param, ParseUUIDPipe,
} from '@nestjs/common';
import { SearchAlertsService } from './search-alerts.service';
import { CurrentUser } from '../common/decorators/current-user.decorator';

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
}
