import {
  Controller, Get, Put, Post, Delete, Patch, Body, Param,
  Query, ParseIntPipe, DefaultValuePipe, UseGuards,
} from '@nestjs/common';
import { ApiTags, ApiBearerAuth, ApiOperation, ApiQuery } from '@nestjs/swagger';
import { UsersService } from './users.service';
import { CurrentUser } from '../common/decorators/current-user.decorator';
import { Roles } from '../common/decorators/roles.decorator';
import { RolesGuard } from '../common/guards/roles.guard';
import {
  UpdateProfileDto,
  UpdateSellerProfileDto,
  ChangePasswordDto,
  CreateAddressDto,
} from './dto/update-user.dto';

@ApiTags('Users')
@ApiBearerAuth()
@Controller('users')
export class UsersController {
  constructor(private readonly usersService: UsersService) {}

  @Get('me')
  @ApiOperation({ summary: 'Mon profil complet' })
  getMyProfile(@CurrentUser('id') userId: string) {
    return this.usersService.getProfile(userId);
  }

  @Put('me')
  @ApiOperation({ summary: 'Mettre à jour mon profil' })
  updateProfile(@CurrentUser('id') userId: string, @Body() dto: UpdateProfileDto) {
    return this.usersService.updateProfile(userId, dto);
  }

  @Put('me/password')
  @ApiOperation({ summary: 'Changer mon mot de passe' })
  changePassword(@CurrentUser('id') userId: string, @Body() dto: ChangePasswordDto) {
    return this.usersService.changePassword(userId, dto);
  }

  @Put('me/seller-profile')
  @ApiOperation({ summary: 'Créer/mettre à jour ma boutique vendeur' })
  updateSellerProfile(@CurrentUser('id') userId: string, @Body() dto: UpdateSellerProfileDto) {
    return this.usersService.createOrUpdateSellerProfile(userId, dto);
  }

  @Get('me/dashboard')
  @ApiOperation({ summary: 'Dashboard vendeur' })
  getSellerDashboard(@CurrentUser('id') userId: string) {
    return this.usersService.getSellerDashboard(userId);
  }

  @Get('me/analytics')
  @ApiOperation({ summary: 'Analytiques vendeur (revenus, commandes, top produits, conversion)' })
  @ApiQuery({ name: 'period', enum: ['7d', '30d', '90d'], required: false })
  getSellerAnalytics(
    @CurrentUser('id') userId: string,
    @Query('period') period: '7d' | '30d' | '90d' = '30d',
  ) {
    return this.usersService.getSellerAnalytics(userId, period || '30d');
  }

  @Get('me/favorites')
  @ApiOperation({ summary: 'Mes favoris' })
  getFavorites(
    @CurrentUser('id') userId: string,
    @Query('page', new DefaultValuePipe(1), ParseIntPipe) page: number,
    @Query('limit', new DefaultValuePipe(20), ParseIntPipe) limit: number,
  ) {
    return this.usersService.getFavorites(userId, page, limit);
  }

  @Post('me/favorites/:productId')
  @ApiOperation({ summary: 'Ajouter/retirer un favori' })
  toggleFavorite(@CurrentUser('id') userId: string, @Param('productId') productId: string) {
    return this.usersService.toggleFavorite(userId, productId);
  }

  @Get('me/loyalty')
  @ApiOperation({ summary: 'Mon programme de fidélité' })
  getLoyalty(@CurrentUser('id') userId: string) {
    return this.usersService.getLoyaltyInfo(userId);
  }

  @Get('me/loyalty/transactions')
  @ApiOperation({ summary: 'Historique de mes points de fidélité' })
  getLoyaltyTransactions(
    @CurrentUser('id') userId: string,
    @Query('page', new DefaultValuePipe(1), ParseIntPipe) page: number,
    @Query('limit', new DefaultValuePipe(20), ParseIntPipe) limit: number,
  ) {
    return this.usersService.getLoyaltyTransactions(userId, page, limit);
  }

  @Post('me/loyalty/redeem')
  @ApiOperation({ summary: 'Échanger des points contre un bon de réduction' })
  redeemPoints(
    @CurrentUser('id') userId: string,
    @Body() body: { points: number },
  ) {
    return this.usersService.redeemPoints(userId, body.points);
  }

  @Get('me/addresses')
  @ApiOperation({ summary: 'Mes adresses de livraison' })
  getAddresses(@CurrentUser('id') userId: string) {
    return this.usersService.getAddresses(userId);
  }

  @Post('me/addresses')
  @ApiOperation({ summary: 'Ajouter une adresse' })
  createAddress(@CurrentUser('id') userId: string, @Body() dto: CreateAddressDto) {
    return this.usersService.createAddress(userId, dto);
  }

  @Patch('me/addresses/:id/default')
  @ApiOperation({ summary: 'Définir adresse par défaut' })
  setDefaultAddress(@CurrentUser('id') userId: string, @Param('id') id: string) {
    return this.usersService.setDefaultAddress(userId, id);
  }

  @Delete('me/addresses/:id')
  @ApiOperation({ summary: 'Supprimer une adresse' })
  deleteAddress(@CurrentUser('id') userId: string, @Param('id') id: string) {
    return this.usersService.deleteAddress(userId, id);
  }

  @Post('me/kyc')
  @ApiOperation({ summary: 'Soumettre documents KYC' })
  submitKyc(
    @CurrentUser('id') userId: string,
    @Body() data: { documentType: string; frontUrl: string; backUrl?: string; selfieUrl?: string },
  ) {
    return this.usersService.submitKyc(userId, data);
  }

  @Get('shop/:slug')
  @ApiOperation({ summary: 'Page boutique publique d\'un vendeur' })
  getShop(@Param('slug') slug: string) {
    return this.usersService.getSellerProfile(slug);
  }
}
