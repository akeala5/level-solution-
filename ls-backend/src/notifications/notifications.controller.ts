import { Controller, Get, Patch, Post, Body, Param, Query, ParseIntPipe, DefaultValuePipe } from '@nestjs/common';
import { ApiTags, ApiBearerAuth, ApiOperation, ApiBody } from '@nestjs/swagger';
import { NotificationsService } from './notifications.service';
import { CurrentUser } from '../common/decorators/current-user.decorator';

@ApiTags('Notifications')
@ApiBearerAuth()
@Controller('notifications')
export class NotificationsController {
  constructor(private readonly notificationsService: NotificationsService) {}

  @Get()
  @ApiOperation({ summary: 'Mes notifications paginées + compteur non-lues' })
  getNotifications(
    @CurrentUser('id') userId: string,
    @Query('page', new DefaultValuePipe(1), ParseIntPipe) page: number,
    @Query('limit', new DefaultValuePipe(20), ParseIntPipe) limit: number,
  ) {
    return this.notificationsService.getUserNotifications(userId, page, limit);
  }

  @Patch('read-all')
  @ApiOperation({ summary: 'Marquer toutes les notifications comme lues' })
  markAllRead(@CurrentUser('id') userId: string) {
    return this.notificationsService.markAsRead(userId);
  }

  @Patch(':id/read')
  @ApiOperation({ summary: 'Marquer une notification comme lue' })
  markOneRead(@CurrentUser('id') userId: string, @Param('id') id: string) {
    return this.notificationsService.markAsRead(userId, id);
  }

  // ── Push Notifications (Web Push / PWA) ──────────────────────────────────

  @Post('push/subscribe')
  @ApiOperation({ summary: 'Enregistrer un abonnement push navigateur' })
  @ApiBody({
    schema: {
      type: 'object',
      properties: {
        endpoint: { type: 'string' },
        keys: {
          type: 'object',
          properties: {
            p256dh: { type: 'string' },
            auth: { type: 'string' },
          },
        },
      },
    },
  })
  subscribePush(
    @CurrentUser('id') userId: string,
    @Body() subscription: { endpoint: string; keys: { p256dh: string; auth: string } },
  ) {
    return this.notificationsService.savePushSubscription(userId, subscription);
  }

  @Post('push/test')
  @ApiOperation({ summary: 'Envoyer une notification push de test' })
  testPush(@CurrentUser('id') userId: string) {
    return this.notificationsService.sendPushNotification(userId, {
      title: '🎉 LS Marketplace',
      body: 'Les notifications push fonctionnent !',
      url: '/dashboard',
    });
  }

  // ── WhatsApp ─────────────────────────────────────────────────────────────

  @Post('whatsapp/test')
  @ApiOperation({ summary: 'Envoyer un message WhatsApp de test' })
  @ApiBody({
    schema: {
      type: 'object',
      required: ['phone'],
      properties: { phone: { type: 'string', example: '+22890000000' } },
    },
  })
  testWhatsApp(
    @CurrentUser() user: any,
    @Body('phone') phone: string,
  ) {
    const target = phone || user.phone;
    if (!target) return { message: 'Numéro de téléphone requis' };
    return this.notificationsService.sendWhatsApp(
      target,
      `✅ *LS Marketplace* — Test WhatsApp\n\nBonjour *${user.firstName}* !\n\nLes notifications WhatsApp sont opérationnelles.`,
    );
  }
}
