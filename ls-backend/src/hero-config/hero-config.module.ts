import { Module } from '@nestjs/common';
import { HeroConfigService } from './hero-config.service';
import { HeroConfigController } from './hero-config.controller';

@Module({
  controllers: [HeroConfigController],
  providers: [HeroConfigService],
  exports: [HeroConfigService],
})
export class HeroConfigModule {}
