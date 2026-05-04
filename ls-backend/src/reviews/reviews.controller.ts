import { Controller, Get, Post, Patch, Body, Param, Query, ParseIntPipe, DefaultValuePipe } from '@nestjs/common';
import { ApiTags, ApiBearerAuth, ApiOperation } from '@nestjs/swagger';
import { ReviewsService } from './reviews.service';
import { CurrentUser } from '../common/decorators/current-user.decorator';
import { Public } from '../common/decorators/public.decorator';

@ApiTags('Reviews')
@Controller('reviews')
export class ReviewsController {
  constructor(private readonly reviewsService: ReviewsService) {}

  @ApiBearerAuth()
  @Post()
  @ApiOperation({ summary: 'Laisser un avis après une commande' })
  create(@CurrentUser('id') userId: string, @Body() data: any) {
    return this.reviewsService.createReview(userId, data);
  }

  @ApiBearerAuth()
  @Patch(':id/reply')
  @ApiOperation({ summary: 'Répondre à un avis (vendeur)' })
  reply(@CurrentUser('id') userId: string, @Param('id') id: string, @Body() body: { reply: string }) {
    return this.reviewsService.replyToReview(id, userId, body.reply);
  }

  @Public()
  @Get('product/:productId')
  @ApiOperation({ summary: 'Avis d\'un produit' })
  productReviews(
    @Param('productId') productId: string,
    @Query('page', new DefaultValuePipe(1), ParseIntPipe) page: number,
    @Query('limit', new DefaultValuePipe(10), ParseIntPipe) limit: number,
  ) {
    return this.reviewsService.getProductReviews(productId, page, limit);
  }

  @Public()
  @Get('seller/:sellerId')
  @ApiOperation({ summary: 'Avis d\'un vendeur' })
  sellerReviews(
    @Param('sellerId') sellerId: string,
    @Query('page', new DefaultValuePipe(1), ParseIntPipe) page: number,
    @Query('limit', new DefaultValuePipe(10), ParseIntPipe) limit: number,
  ) {
    return this.reviewsService.getSellerReviews(sellerId, page, limit);
  }
}
