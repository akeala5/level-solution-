import {
  WebSocketGateway,
  WebSocketServer,
  SubscribeMessage,
  OnGatewayConnection,
  OnGatewayDisconnect,
  ConnectedSocket,
  MessageBody,
} from '@nestjs/websockets';
import { Server, Socket } from 'socket.io';
import { JwtService } from '@nestjs/jwt';
import { ConfigService } from '@nestjs/config';
import { Logger } from '@nestjs/common';
import { ChatService } from './chat.service';

@WebSocketGateway({
  cors: { origin: '*', credentials: true },
  namespace: '/chat',
})
export class ChatGateway implements OnGatewayConnection, OnGatewayDisconnect {
  @WebSocketServer()
  server: Server;

  private readonly logger = new Logger(ChatGateway.name);
  private connectedUsers: Map<string, string> = new Map(); // userId -> socketId

  constructor(
    private jwtService: JwtService,
    private configService: ConfigService,
    private chatService: ChatService,
  ) {}

  async handleConnection(client: Socket) {
    try {
      // Cookie httpOnly (envoyé automatiquement à l'upgrade WS, même origine) en 3e recours.
      const cookieHeader = client.handshake.headers?.cookie;
      const cookieToken = cookieHeader
        ? cookieHeader.split(';').map((c) => c.trim()).find((c) => c.startsWith('accessToken='))?.slice('accessToken='.length)
        : undefined;
      const token =
        client.handshake.auth?.token ||
        client.handshake.headers?.authorization?.replace('Bearer ', '') ||
        (cookieToken ? decodeURIComponent(cookieToken) : undefined);
      if (!token) { client.disconnect(); return; }

      const payload = this.jwtService.verify(token, {
        secret: this.configService.get('jwt.secret'),
      });

      client.data.userId = payload.sub;
      this.connectedUsers.set(payload.sub, client.id);
      client.join(`user:${payload.sub}`);
      this.logger.log(`Client connecté: ${payload.sub}`);
    } catch {
      client.disconnect();
    }
  }

  handleDisconnect(client: Socket) {
    if (client.data.userId) {
      this.connectedUsers.delete(client.data.userId);
      this.logger.log(`Client déconnecté: ${client.data.userId}`);
    }
  }

  @SubscribeMessage('join_conversation')
  async handleJoinConversation(@ConnectedSocket() client: Socket, @MessageBody() data: { conversationId: string }) {
    const { conversationId } = data;
    const userId = client.data.userId;

    const hasAccess = await this.chatService.checkConversationAccess(conversationId, userId);
    if (!hasAccess) { client.emit('error', { message: 'Accès refusé' }); return; }

    client.join(`conversation:${conversationId}`);
    await this.chatService.markAsRead(conversationId, userId);
    client.emit('joined_conversation', { conversationId });
  }

  @SubscribeMessage('send_message')
  async handleMessage(
    @ConnectedSocket() client: Socket,
    @MessageBody() data: { conversationId: string; content: string; imageUrl?: string },
  ) {
    const userId = client.data.userId;
    const { conversationId, content, imageUrl } = data;

    if (!content?.trim() && !imageUrl) return;

    const message = await this.chatService.sendMessage(conversationId, userId, content, imageUrl);

    // Envoyer à tous les membres de la conversation
    this.server.to(`conversation:${conversationId}`).emit('new_message', message);

    // Notification push aux membres hors ligne
    const members = await this.chatService.getConversationMembers(conversationId);
    for (const memberId of members) {
      if (memberId !== userId && !this.connectedUsers.has(memberId)) {
        // Ici on enverrait une notification push / email
      }
    }
  }

  @SubscribeMessage('typing')
  handleTyping(@ConnectedSocket() client: Socket, @MessageBody() data: { conversationId: string }) {
    client.to(`conversation:${data.conversationId}`).emit('user_typing', {
      userId: client.data.userId,
    });
  }

  @SubscribeMessage('stop_typing')
  handleStopTyping(@ConnectedSocket() client: Socket, @MessageBody() data: { conversationId: string }) {
    client.to(`conversation:${data.conversationId}`).emit('user_stop_typing', {
      userId: client.data.userId,
    });
  }

  // Méthode publique pour notifier depuis d'autres services
  notifyUser(userId: string, event: string, data: any) {
    this.server.to(`user:${userId}`).emit(event, data);
  }
}
