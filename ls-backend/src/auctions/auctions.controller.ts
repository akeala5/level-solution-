import {
  Controller,
  Get,
  Post,
  Patch,
  Param,
  Body,
  Query,
  Req,
  ParseUUIDPipe,
  ParseIntPipe,
  DefaultValuePipe,
  HttpCode,
  HttpStatus,
} from '@nestjs/common';
import { AuctionsService } from './auctions.service';
import { AuctionsGateway } from './auctions.gateway';
import { Roles } from '../common/decorators/roles.decorator';
import { Public } from '../common/decorators/public.decorator';
import { AuctionStatus } from '@prisma/client';

@Controller('auctions')
export class AuctionsController {
  constructor(
    private readonly auctionsService: AuctionsService,
    private readonly auctionsGateway: AuctionsGateway,
  ) {}

  @Get()
  @Public()
  findAll(
    @Query('status') status?: AuctionStatus,
    @Query('page', new DefaultValuePipe(1), ParseIntPipe) page?: number,
    @Query('limit', new DefaultValuePipe(20), ParseIntPipe) limit?: number,
  ) {
    return this.auctionsService.findAll({ status, page, limit });
  }

  @Get(':id')
  @Public()
  findOne(@Param('id', ParseUUIDPipe) id: string) {
    return this.auctionsService.findOne(id);
  }

  @Get(':id/bids')
  @Public()
  getBids(
    @Param('id', ParseUUIDPipe) id: string,
    @Query('page', new DefaultValuePipe(1), ParseIntPipe) page: number,
    @Query('limit', new DefaultValuePipe(20), ParseIntPipe) limit: number,
  ) {
    return this.auctionsService.getBidsForAuction(id, page, limit);
  }

  @Post()
  @Roles('SELLER', 'ADMIN')
  async create(@Req() req: any, @Body() body: {
    productId: string;
    startingPrice: number;
    reservePrice?: number;
    minBidIncrement?: number;
    startsAt: string;
    endsAt: string;
  }) {
    return this.auctionsService.createAuction(req.user.id, {
      ...body,
      startsAt: new Date(body.startsAt),
      endsAt: new Date(body.endsAt),
    });
  }

  @Post(':id/bids')
  @HttpCode(HttpStatus.CREATED)
  async placeBid(
    @Param('id', ParseUUIDPipe) id: string,
    @Req() req: any,
    @Body() body: { amount: number; isAuto?: boolean; maxAutoBid?: number },
  ) {
    const result = await this.auctionsService.placeBid(id, req.user.id, body);

    // Broadcast to all clients watching this auction
    this.auctionsGateway.broadcastNewBid(id, {
      bidId: result.bid.id,
      bidderId: req.user.id,
      amount: result.bid.amount,
      currentPrice: result.currentPrice,
      totalBids: 0, // will be updated by client on next poll if needed
      timestamp: result.bid.createdAt,
    });

    return result;
  }

  @Patch(':id/end')
  @Roles('SELLER', 'ADMIN')
  async endAuction(@Param('id', ParseUUIDPipe) id: string, @Req() req: any) {
    const result = await this.auctionsService.endAuction(id, req.user.role === 'ADMIN' ? undefined : req.user.id);

    this.auctionsGateway.broadcastAuctionEnded(id, {
      winnerId: result.winner?.bidderId ?? null,
      finalPrice: result.winner?.amount ?? 0,
      reserveMet: result.winner !== null,
    });

    return result;
  }
}
