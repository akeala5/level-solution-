import { Global, Module } from '@nestjs/common';
import { PlanConfigService } from './services/plan-config.service';

// Global : PlanConfigService injectable partout (products, subscriptions, admin…)
// sans réimporter le module dans chacun. PrismaModule est déjà @Global.
@Global()
@Module({
  providers: [PlanConfigService],
  exports: [PlanConfigService],
})
export class PlanConfigModule {}
