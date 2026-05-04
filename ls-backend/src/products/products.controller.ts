import {
  Controller, Get, Post, Put, Delete, Patch, Body, Param, Query,
  ParseIntPipe, DefaultValuePipe, UseGuards,
} from '@nestjs/common';
import { ApiTags, ApiBearerAuth, ApiOperation } from '@nestjs/swagger';
import { ProductsService } from './products.service';
import { CreateProductDto, UpdateProductDto, ProductQueryDto } from './dto/create-product.dto';
import { Public } from '../common/decorators/public.decorator';
import { CurrentUser } from '../common/decorators/current-user.decorator';
import { Roles } from '../common/decorators/roles.decorator';
import { RolesGuard } from '../common/guards/roles.guard';

@ApiTags('Products')
@Controller('products')
export class ProductsController {
  constructor(private readonly productsService: ProductsService) {}

  @Public()
  @Get()
  @ApiOperation({ summary: 'Liste des annonces (public)' })
  findAll(@Query() query: ProductQueryDto, @CurrentUser() user: any) {
    return this.productsService.findAll(query, user?.id);
  }

  @Public()
  @Get(':slug')
  @ApiOperation({ summary: 'Détail d\'une annonce' })
  findOne(@Param('slug') slug: string, @CurrentUser() user: any) {
    return this.productsService.findOne(slug, user?.id);
  }

  @ApiBearerAuth()
  @Post()
  @ApiOperation({ summary: 'Créer une annonce' })
  create(@CurrentUser() user: any, @Body() dto: CreateProductDto) {
    return this.productsService.create(user.id, dto, user.plan);
  }

  @ApiBearerAuth()
  @Put(':id')
  @ApiOperation({ summary: 'Modifier une annonce' })
  update(@CurrentUser() user: any, @Param('id') id: string, @Body() dto: UpdateProductDto) {
    return this.productsService.update(id, user.id, dto);
  }

  @ApiBearerAuth()
  @Delete(':id')
  @ApiOperation({ summary: 'Supprimer une annonce' })
  delete(@CurrentUser() user: any, @Param('id') id: string) {
    return this.productsService.delete(id, user.id, user.role);
  }

  @ApiBearerAuth()
  @Get('me/listings')
  @ApiOperation({ summary: 'Mes annonces' })
  getMyProducts(
    @CurrentUser('id') userId: string,
    @Query('page', new DefaultValuePipe(1), ParseIntPipe) page: number,
    @Query('limit', new DefaultValuePipe(20), ParseIntPipe) limit: number,
    @Query('status') status?: string,
  ) {
    return this.productsService.getMyProducts(userId, page, limit, status);
  }

  @ApiBearerAuth()
  @UseGuards(RolesGuard)
  @Roles('ADMIN' as any, 'MODERATOR' as any)
  @Get('admin/pending')
  @ApiOperation({ summary: '[Admin] Annonces en attente de validation' })
  getPending(
    @Query('page', new DefaultValuePipe(1), ParseIntPipe) page: number,
    @Query('limit', new DefaultValuePipe(20), ParseIntPipe) limit: number,
  ) {
    return this.productsService.getPendingProducts(page, limit);
  }

  @ApiBearerAuth()
  @UseGuards(RolesGuard)
  @Roles('ADMIN' as any, 'MODERATOR' as any)
  @Patch('admin/:id/approve')
  @ApiOperation({ summary: '[Admin] Approuver ou rejeter une annonce' })
  approve(
    @Param('id') id: string,
    @Body() body: { approved: boolean; reason?: string },
  ) {
    return this.productsService.adminApprove(id, body.approved, body.reason);
  }
}
