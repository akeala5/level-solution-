import {
  Controller, Get, Post, Patch, Delete,
  Body, Param, Query, ParseIntPipe, DefaultValuePipe,
  UseGuards,
} from '@nestjs/common';
import { ApiTags, ApiBearerAuth, ApiOperation } from '@nestjs/swagger';
import { SponsoredAdsService } from './sponsored-ads.service';
import { CreateSponsoredAdDto } from './dto/create-sponsored-ad.dto';
import { CurrentUser } from '../common/decorators/current-user.decorator';
import { Public } from '../common/decorators/public.decorator';
import { Roles } from '../common/decorators/roles.decorator';
import { RolesGuard } from '../common/guards/roles.guard';

@ApiTags('Sponsored Ads')
@Controller('sponsored-ads')
export class SponsoredAdsController {
  constructor(private readonly service: SponsoredAdsService) {}

  // ─── VENDEUR ─────────────────────────────────────────────────────────────────

  @ApiBearerAuth()
  @Get()
  @ApiOperation({ summary: 'Mes campagnes sponsorisées' })
  findMine(@CurrentUser('id') userId: string) {
    return this.service.findMine(userId);
  }

  @ApiBearerAuth()
  @Post()
  @ApiOperation({ summary: 'Créer une campagne sponsorisée' })
  create(@CurrentUser('id') userId: string, @Body() dto: CreateSponsoredAdDto) {
    return this.service.create(userId, dto);
  }

  @ApiBearerAuth()
  @Patch(':id/toggle')
  @ApiOperation({ summary: 'Activer / mettre en pause une campagne' })
  toggle(@Param('id') id: string, @CurrentUser('id') userId: string) {
    return this.service.toggle(id, userId);
  }

  @ApiBearerAuth()
  @Delete(':id')
  @ApiOperation({ summary: 'Supprimer une campagne' })
  delete(@Param('id') id: string, @CurrentUser('id') userId: string) {
    return this.service.delete(id, userId);
  }

  // ─── TRACKING ─────────────────────────────────────────────────────────────────

  @Public()
  @Post(':id/view')
  @ApiOperation({ summary: 'Enregistrer une vue (appelé côté frontend)' })
  recordView(@Param('id') id: string) {
    return this.service.recordView(id);
  }

  @Public()
  @Post(':id/click')
  @ApiOperation({ summary: 'Enregistrer un clic (appelé côté frontend)' })
  recordClick(@Param('id') id: string) {
    return this.service.recordClick(id);
  }

  // ─── PUBLIC ───────────────────────────────────────────────────────────────────

  @Public()
  @Get('featured')
  @ApiOperation({ summary: 'Produits sponsorisés actifs (affichage dans les listings)' })
  getFeatured(
    @Query('categoryId') categoryId?: string,
    @Query('limit', new DefaultValuePipe(3), ParseIntPipe) limit?: number,
  ) {
    return this.service.getFeatured(categoryId, limit);
  }

  // ─── ADMIN ────────────────────────────────────────────────────────────────────

  @ApiBearerAuth()
  @UseGuards(RolesGuard)
  @Roles('ADMIN' as any)
  @Get('admin/all')
  @ApiOperation({ summary: '[Admin] Toutes les campagnes' })
  adminFindAll(
    @Query('page', new DefaultValuePipe(1), ParseIntPipe) page: number,
    @Query('limit', new DefaultValuePipe(20), ParseIntPipe) limit: number,
  ) {
    return this.service.adminFindAll(page, limit);
  }
}
