import {
  Controller, Get, Post, Patch, Delete, Body, Param, Query,
  DefaultValuePipe, ParseIntPipe,
} from '@nestjs/common';
import { ApiTags, ApiBearerAuth, ApiOperation } from '@nestjs/swagger';
import { WebhooksService } from './webhooks.service';
import { CurrentUser } from '../common/decorators/current-user.decorator';

@ApiTags('Webhooks & API Keys')
@ApiBearerAuth()
@Controller()
export class WebhooksController {
  constructor(private readonly webhooksService: WebhooksService) {}

  // ─── API KEYS ─────────────────────────────────────────────────────────────────

  @Post('api-keys')
  @ApiOperation({ summary: 'Créer une clé API vendeur' })
  createApiKey(@CurrentUser() user: any, @Body() body: { name: string }) {
    return this.webhooksService.createApiKey(user.id, body.name);
  }

  @Get('api-keys')
  @ApiOperation({ summary: 'Lister mes clés API' })
  listApiKeys(@CurrentUser() user: any) {
    return this.webhooksService.listApiKeys(user.id);
  }

  @Delete('api-keys/:id')
  @ApiOperation({ summary: 'Révoquer une clé API' })
  revokeApiKey(@CurrentUser() user: any, @Param('id') id: string) {
    return this.webhooksService.revokeApiKey(id, user.id);
  }

  // ─── WEBHOOK ENDPOINTS ────────────────────────────────────────────────────────

  @Get('webhooks/events')
  @ApiOperation({ summary: 'Événements disponibles' })
  getEvents() {
    return this.webhooksService.getAvailableEvents();
  }

  @Post('webhooks/endpoints')
  @ApiOperation({ summary: 'Créer un endpoint webhook' })
  createEndpoint(
    @CurrentUser() user: any,
    @Body() body: { url: string; events: string[] },
  ) {
    return this.webhooksService.createEndpoint(user.id, body);
  }

  @Get('webhooks/endpoints')
  @ApiOperation({ summary: 'Lister mes endpoints' })
  listEndpoints(@CurrentUser() user: any) {
    return this.webhooksService.listEndpoints(user.id);
  }

  @Patch('webhooks/endpoints/:id')
  @ApiOperation({ summary: 'Modifier un endpoint' })
  updateEndpoint(
    @CurrentUser() user: any,
    @Param('id') id: string,
    @Body() body: { url?: string; events?: string[]; isActive?: boolean },
  ) {
    return this.webhooksService.updateEndpoint(id, user.id, body);
  }

  @Delete('webhooks/endpoints/:id')
  @ApiOperation({ summary: 'Supprimer un endpoint' })
  deleteEndpoint(@CurrentUser() user: any, @Param('id') id: string) {
    return this.webhooksService.deleteEndpoint(id, user.id);
  }

  @Post('webhooks/endpoints/:id/test')
  @ApiOperation({ summary: 'Envoyer un événement test' })
  testEndpoint(@CurrentUser() user: any, @Param('id') id: string) {
    return this.webhooksService.sendTestEvent(id, user.id);
  }

  @Get('webhooks/endpoints/:id/deliveries')
  @ApiOperation({ summary: 'Historique des livraisons' })
  getDeliveries(
    @CurrentUser() user: any,
    @Param('id') id: string,
    @Query('page', new DefaultValuePipe(1), ParseIntPipe) page: number,
    @Query('limit', new DefaultValuePipe(20), ParseIntPipe) limit: number,
  ) {
    return this.webhooksService.getDeliveries(id, user.id, page, limit);
  }
}
