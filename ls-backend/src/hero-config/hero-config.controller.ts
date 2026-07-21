import { Controller, Get, Patch, Body, UseGuards } from '@nestjs/common';
import { ApiTags, ApiOperation, ApiBearerAuth } from '@nestjs/swagger';
import { HeroConfigService } from './hero-config.service';
import { UpdateHeroConfigDto } from './dto/update-hero-config.dto';
import { Public } from '../common/decorators/public.decorator';
import { Roles } from '../common/decorators/roles.decorator';
import { RolesGuard } from '../common/guards/roles.guard';

@ApiTags('Hero Config')
@Controller('hero-config')
export class HeroConfigController {
  constructor(private readonly service: HeroConfigService) {}

  @Public()
  @Get()
  @ApiOperation({ summary: 'Config du hero (accroche, encarts, timings) — public' })
  get() {
    return this.service.getConfig();
  }

  @ApiBearerAuth()
  @UseGuards(RolesGuard)
  @Roles('ADMIN' as any)
  @Patch()
  @ApiOperation({ summary: '[Admin] Modifier le contenu du hero' })
  update(@Body() dto: UpdateHeroConfigDto) {
    return this.service.update(dto);
  }
}
