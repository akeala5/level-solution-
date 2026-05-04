import { Injectable, ForbiddenException, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { getPaginationParams, paginate } from '../common/utils/pagination.util';

@Injectable()
export class ChatService {
  constructor(private prisma: PrismaService) {}

  async getOrCreateConversation(userId: string, otherUserId: string, productId?: string) {
    if (userId === otherUserId) throw new ForbiddenException('Vous ne pouvez pas vous envoyer un message');

    // Chercher une conversation existante entre ces deux utilisateurs pour ce produit
    const existing = await this.prisma.conversation.findFirst({
      where: {
        productId: productId || null,
        members: {
          every: { userId: { in: [userId, otherUserId] } },
        },
      },
      include: {
        members: true,
        messages: { take: 20, orderBy: { createdAt: 'desc' }, include: { sender: { select: { id: true, firstName: true } } } },
      },
    });

    if (existing) return { message: 'Conversation récupérée', data: existing };

    const conversation = await this.prisma.conversation.create({
      data: {
        productId: productId || null,
        members: {
          create: [{ userId }, { userId: otherUserId }],
        },
      },
      include: {
        members: { include: { user: { select: { id: true, firstName: true, lastName: true, profile: { select: { avatarUrl: true } } } } } },
        messages: { take: 20, orderBy: { createdAt: 'desc' } },
      },
    });

    return { message: 'Conversation créée', data: conversation };
  }

  async getMyConversations(userId: string, page = 1, limit = 20) {
    const { skip, take } = getPaginationParams(page, limit);

    const [conversations, total] = await Promise.all([
      this.prisma.conversation.findMany({
        where: { members: { some: { userId } } },
        skip, take,
        orderBy: { updatedAt: 'desc' },
        include: {
          members: {
            include: {
              user: { select: { id: true, firstName: true, lastName: true, profile: { select: { avatarUrl: true } } } },
            },
          },
          messages: {
            take: 1,
            orderBy: { createdAt: 'desc' },
          },
        },
      }),
      this.prisma.conversation.count({ where: { members: { some: { userId } } } }),
    ]);

    // Calculer les non lus
    const unreadCounts = await Promise.all(
      conversations.map(async (conv) => {
        const member = await this.prisma.conversationMember.findUnique({
          where: { conversationId_userId: { conversationId: conv.id, userId } },
        });
        const count = await this.prisma.message.count({
          where: {
            conversationId: conv.id,
            senderId: { not: userId },
            createdAt: member?.lastReadAt ? { gt: member.lastReadAt } : undefined,
          },
        });
        return { conversationId: conv.id, unread: count };
      }),
    );

    const enriched = conversations.map((c) => ({
      ...c,
      unreadCount: unreadCounts.find((u) => u.conversationId === c.id)?.unread || 0,
    }));

    return { message: 'Conversations récupérées', data: enriched, meta: paginate(total, page, limit) };
  }

  async getMessages(conversationId: string, userId: string, page = 1, limit = 30) {
    const hasAccess = await this.checkConversationAccess(conversationId, userId);
    if (!hasAccess) throw new ForbiddenException('Accès refusé');

    const { skip, take } = getPaginationParams(page, limit);

    const [messages, total] = await Promise.all([
      this.prisma.message.findMany({
        where: { conversationId, isDeleted: false },
        skip, take,
        orderBy: { createdAt: 'desc' },
        include: {
          sender: { select: { id: true, firstName: true, lastName: true, profile: { select: { avatarUrl: true } } } },
        },
      }),
      this.prisma.message.count({ where: { conversationId, isDeleted: false } }),
    ]);

    await this.markAsRead(conversationId, userId);

    return {
      message: 'Messages récupérés',
      data: messages.reverse(),
      meta: paginate(total, page, limit),
    };
  }

  async sendMessage(conversationId: string, senderId: string, content: string, imageUrl?: string) {
    const hasAccess = await this.checkConversationAccess(conversationId, senderId);
    if (!hasAccess) throw new ForbiddenException('Accès refusé');

    const message = await this.prisma.message.create({
      data: { conversationId, senderId, content, imageUrl },
      include: {
        sender: { select: { id: true, firstName: true, lastName: true, profile: { select: { avatarUrl: true } } } },
      },
    });

    await this.prisma.conversation.update({
      where: { id: conversationId },
      data: { updatedAt: new Date() },
    });

    return message;
  }

  async checkConversationAccess(conversationId: string, userId: string): Promise<boolean> {
    const member = await this.prisma.conversationMember.findUnique({
      where: { conversationId_userId: { conversationId, userId } },
    });
    return !!member;
  }

  async markAsRead(conversationId: string, userId: string) {
    await this.prisma.conversationMember.update({
      where: { conversationId_userId: { conversationId, userId } },
      data: { lastReadAt: new Date() },
    });
    await this.prisma.message.updateMany({
      where: { conversationId, senderId: { not: userId }, isRead: false },
      data: { isRead: true },
    });
  }

  async getConversationMembers(conversationId: string): Promise<string[]> {
    const members = await this.prisma.conversationMember.findMany({
      where: { conversationId },
      select: { userId: true },
    });
    return members.map((m) => m.userId);
  }

  async deleteMessage(messageId: string, userId: string) {
    const msg = await this.prisma.message.findUnique({ where: { id: messageId } });
    if (!msg) throw new NotFoundException('Message introuvable');
    if (msg.senderId !== userId) throw new ForbiddenException('Non autorisé');

    await this.prisma.message.update({
      where: { id: messageId },
      data: { isDeleted: true, content: 'Message supprimé' },
    });

    return { message: 'Message supprimé' };
  }
}
