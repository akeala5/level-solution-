import { Module } from '@nestjs/common';
import { SponsoredAdsService } from './sponsored-ads.service';
import { SponsoredAdsController } from './sponsored-ads.controller';

@Module({
  controllers: [SponsoredAdsController],
  providers: [SponsoredAdsService],
  exports: [SponsoredAdsService],
})
export class SponsoredAdsModule {}
