import {
  Controller, Get, Post, Delete, Body, Param, Query,
  ParseIntPipe, DefaultValuePipe,
} from '@nestjs/common';
import { ApiTags, ApiBearerAuth, ApiOperation } from '@nestjs/swagger';
import { ChatService } from './chat.service';
import { CurrentUser } from '../common/decorators/current-user.decorator';

@ApiTags('Chat')
@ApiBearerAuth()
@Controller('chat')
export class ChatController {
  constructor(private readonly chatService: ChatService) {}

  @Get('conversations')
  @ApiOperation({ summary: 'Mes conversations' })
  getConversations(
    @CurrentUser('id') userId: string,
    @Query('page', new DefaultValuePipe(1), ParseIntPipe) page: number,
    @Query('limit', new DefaultValuePipe(20), ParseIntPipe) limit: number,
  ) {
    return this.chatService.getMyConversations(userId, page, limit);
  }

  @Post('conversations')
  @ApiOperation({ summary: 'Démarrer ou récupérer une conversation' })
  startConversation(
    @CurrentUser('id') userId: string,
    @Body() body: { otherUserId: string; productId?: string },
  ) {
    return this.chatService.getOrCreateConversation(userId, body.otherUserId, body.productId);
  }

  @Get('conversations/:id/messages')
  @ApiOperation({ summary: 'Messages d\'une conversation' })
  getMessages(
    @CurrentUser('id') userId: string,
    @Param('id') id: string,
    @Query('page', new DefaultValuePipe(1), ParseIntPipe) page: number,
    @Query('limit', new DefaultValuePipe(30), ParseIntPipe) limit: number,
  ) {
    return this.chatService.getMessages(id, userId, page, limit);
  }

  @Post('conversations/:id/messages')
  @ApiOperation({ summary: 'Envoyer un message dans une conversation' })
  async sendMessage(
    @CurrentUser('id') userId: string,
    @Param('id') convId: string,
    @Body() body: { content: string; imageUrl?: string },
  ) {
    const message = await this.chatService.sendMessage(convId, userId, body.content, body.imageUrl);
    return { message: 'Message envoyé', data: message };
  }

  @Delete('messages/:id')
  @ApiOperation({ summary: 'Supprimer un message' })
  deleteMessage(@CurrentUser('id') userId: string, @Param('id') id: string) {
    return this.chatService.deleteMessage(id, userId);
  }
}
