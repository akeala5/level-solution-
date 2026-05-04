import { Injectable, Logger } from '@nestjs/common';
import { Cron } from '@nestjs/schedule';
import { SearchAlertsService } from '../../search-alerts/search-alerts.service';

@Injectable()
export class SearchAlertsJob {
  private readonly logger = new Logger(SearchAlertsJob.name);

  constructor(private searchAlertsService: SearchAlertsService) {}

  // Chaque jour à 8h — envoie les alertes aux utilisateurs
  @Cron('0 8 * * *')
  async run() {
    const count = await this.searchAlertsService.processAlerts();
    if (count > 0) {
      this.logger.log(`Alertes de recherche traitées : ${count} alertes vérifiées`);
    }
  }
}
