import { Injectable, Logger } from '@nestjs/common';
import { Cron } from '@nestjs/schedule';
import { SubscriptionsService } from '../../subscriptions/subscriptions.service';

@Injectable()
export class SubscriptionExpiryJob {
  private readonly logger = new Logger(SubscriptionExpiryJob.name);

  constructor(private subscriptionsService: SubscriptionsService) {}

  // Chaque jour à 9h00 : notifications d'expiration + rétrogradation automatique
  @Cron('0 9 * * *')
  async handleSubscriptionExpiry() {
    this.logger.log('Vérification des abonnements expirés...');

    const [expired, expiring] = await Promise.all([
      this.subscriptionsService.handleExpiredSubscriptions(),
      this.subscriptionsService.notifyExpiringSubscriptions(),
    ]);

    this.logger.log(`Abonnements expirés rétrogradés: ${expired} | Notifications d'expiration: ${expiring}`);
  }
}
