import { Module } from '@nestjs/common';
import { SearchAlertsService } from './search-alerts.service';
import { SearchAlertsController } from './search-alerts.controller';
import { NotificationsModule } from '../notifications/notifications.module';

@Module({
  imports: [NotificationsModule],
  controllers: [SearchAlertsController],
  providers: [SearchAlertsService],
  exports: [SearchAlertsService],
})
export class SearchAlertsModule {}
