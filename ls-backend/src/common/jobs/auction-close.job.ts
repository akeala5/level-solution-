import { Injectable, Logger } from '@nestjs/common';
import { Cron, CronExpression } from '@nestjs/schedule';
import { AuctionsService } from '../../auctions/auctions.service';
import { AuctionsGateway } from '../../auctions/auctions.gateway';

@Injectable()
export class AuctionCloseJob {
  private readonly logger = new Logger(AuctionCloseJob.name);

  constructor(
    private auctionsService: AuctionsService,
    private auctionsGateway: AuctionsGateway,
  ) {}

  @Cron(CronExpression.EVERY_MINUTE)
  async closeExpiredAuctions() {
    const closed = await this.auctionsService.closeExpiredAuctions();
    if (closed > 0) {
      this.logger.log(`${closed} enchère(s) clôturée(s) automatiquement`);
    }
  }
}
