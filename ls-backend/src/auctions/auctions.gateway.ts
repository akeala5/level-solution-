import {
  WebSocketGateway,
  WebSocketServer,
  SubscribeMessage,
  MessageBody,
  ConnectedSocket,
  OnGatewayConnection,
  OnGatewayDisconnect,
} from '@nestjs/websockets';
import { Server, Socket } from 'socket.io';
import { UseGuards } from '@nestjs/common';
import { WsJwtGuard } from '../common/guards/ws-jwt.guard';

@WebSocketGateway({
  namespace: '/auctions',
  cors: { origin: process.env.FRONTEND_URL || '*', credentials: true },
})
export class AuctionsGateway implements OnGatewayConnection, OnGatewayDisconnect {
  @WebSocketServer()
  server: Server;

  handleConnection(client: Socket) {
    const auctionId = client.handshake.query.auctionId as string;
    if (auctionId) {
      client.join(`auction:${auctionId}`);
    }
  }

  handleDisconnect(client: Socket) {
    const auctionId = client.handshake.query.auctionId as string;
    if (auctionId) {
      client.leave(`auction:${auctionId}`);
    }
  }

  @SubscribeMessage('join_auction')
  handleJoin(@MessageBody() data: { auctionId: string }, @ConnectedSocket() client: Socket) {
    client.join(`auction:${data.auctionId}`);
    return { joined: true };
  }

  @SubscribeMessage('leave_auction')
  handleLeave(@MessageBody() data: { auctionId: string }, @ConnectedSocket() client: Socket) {
    client.leave(`auction:${data.auctionId}`);
    return { left: true };
  }

  // Called by AuctionsService after a successful bid
  broadcastNewBid(auctionId: string, payload: {
    bidId: string;
    bidderId: string;
    amount: number;
    currentPrice: number;
    totalBids: number;
    timestamp: Date;
  }) {
    this.server.to(`auction:${auctionId}`).emit('new_bid', payload);
  }

  // Called when auction closes
  broadcastAuctionEnded(auctionId: string, payload: {
    winnerId: string | null;
    finalPrice: number;
    reserveMet: boolean;
  }) {
    this.server.to(`auction:${auctionId}`).emit('auction_ended', payload);
  }

  // Real-time countdown sync (called by cron every minute for active auctions ending soon)
  broadcastTimeUpdate(auctionId: string, secondsRemaining: number) {
    this.server.to(`auction:${auctionId}`).emit('time_update', { secondsRemaining });
  }
}
