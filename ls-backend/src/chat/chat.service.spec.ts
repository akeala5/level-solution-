import { Test, TestingModule } from '@nestjs/testing';
import { ChatService } from './chat.service';
import { PrismaService } from '../prisma/prisma.service';
import { ForbiddenException, NotFoundException } from '@nestjs/common';

const mockPrisma = {
  conversation: {
    findFirst: jest.fn(),
    findMany: jest.fn(),
    create: jest.fn(),
    count: jest.fn(),
    update: jest.fn(),
  },
  conversationMember: {
    findUnique: jest.fn(),
    findMany: jest.fn(),
    update: jest.fn(),
  },
  message: {
    findMany: jest.fn(),
    create: jest.fn(),
    findUnique: jest.fn(),
    update: jest.fn(),
    updateMany: jest.fn(),
    count: jest.fn(),
  },
};

describe('ChatService', () => {
  let service: ChatService;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        ChatService,
        { provide: PrismaService, useValue: mockPrisma },
      ],
    }).compile();

    service = module.get<ChatService>(ChatService);
    jest.clearAllMocks();
  });

  // ── Conversation creation ─────────────────────────────────────────────────

  describe('getOrCreateConversation', () => {
    it('doit lever ForbiddenException si userId === otherUserId', async () => {
      await expect(
        service.getOrCreateConversation('user-1', 'user-1')
      ).rejects.toThrow(ForbiddenException);
    });

    it('doit retourner la conversation existante si elle existe', async () => {
      const existing = { id: 'conv-1', members: [], messages: [] };
      mockPrisma.conversation.findFirst.mockResolvedValue(existing);

      const result = await service.getOrCreateConversation('user-1', 'user-2');

      expect(result.data).toEqual(existing);
      expect(mockPrisma.conversation.create).not.toHaveBeenCalled();
    });

    it('doit créer une nouvelle conversation avec deux membres', async () => {
      mockPrisma.conversation.findFirst.mockResolvedValue(null);
      const newConv = {
        id: 'conv-2',
        members: [{ userId: 'user-1' }, { userId: 'user-2' }],
        messages: [],
      };
      mockPrisma.conversation.create.mockResolvedValue(newConv);

      const result = await service.getOrCreateConversation('user-1', 'user-2', 'prod-1');

      expect(mockPrisma.conversation.create).toHaveBeenCalledWith(
        expect.objectContaining({
          data: expect.objectContaining({
            productId: 'prod-1',
            members: {
              create: expect.arrayContaining([
                { userId: 'user-1' },
                { userId: 'user-2' },
              ]),
            },
          }),
        })
      );
      expect(result.message).toBe('Conversation créée');
    });
  });

  // ── Access control ────────────────────────────────────────────────────────

  describe('getMessages — contrôle d\'accès', () => {
    it('doit lever ForbiddenException si non membre', async () => {
      mockPrisma.conversationMember.findUnique.mockResolvedValue(null); // pas membre

      await expect(
        service.getMessages('conv-1', 'outsider', 1, 30)
      ).rejects.toThrow(ForbiddenException);
    });

    it('doit retourner les messages si membre', async () => {
      mockPrisma.conversationMember.findUnique.mockResolvedValue({ conversationId: 'conv-1', userId: 'user-1' });
      const messages = [
        { id: 'msg-1', content: 'Hello', senderId: 'user-2', createdAt: new Date(), isDeleted: false, sender: {} },
      ];
      mockPrisma.message.findMany.mockResolvedValue(messages);
      mockPrisma.message.count.mockResolvedValue(1);
      mockPrisma.conversationMember.update.mockResolvedValue({});
      mockPrisma.message.updateMany.mockResolvedValue({});

      const result = await service.getMessages('conv-1', 'user-1', 1, 30);
      expect(result.data).toHaveLength(1);
    });
  });

  // ── sendMessage ───────────────────────────────────────────────────────────

  describe('sendMessage', () => {
    it('doit lever ForbiddenException si l\'expéditeur n\'est pas membre', async () => {
      mockPrisma.conversationMember.findUnique.mockResolvedValue(null);

      await expect(
        service.sendMessage('conv-1', 'outsider', 'Bonjour !')
      ).rejects.toThrow(ForbiddenException);
    });

    it('doit créer le message et mettre à jour updatedAt de la conversation', async () => {
      mockPrisma.conversationMember.findUnique.mockResolvedValue({ conversationId: 'conv-1', userId: 'user-1' });
      const msg = { id: 'msg-1', content: 'Hello', senderId: 'user-1', sender: {} };
      mockPrisma.message.create.mockResolvedValue(msg);
      mockPrisma.conversation.update.mockResolvedValue({});

      const result = await service.sendMessage('conv-1', 'user-1', 'Hello');

      expect(result).toEqual(msg);
      expect(mockPrisma.conversation.update).toHaveBeenCalledWith(
        expect.objectContaining({ where: { id: 'conv-1' } })
      );
    });
  });

  // ── deleteMessage ─────────────────────────────────────────────────────────

  describe('deleteMessage', () => {
    it('doit lever NotFoundException si message inexistant', async () => {
      mockPrisma.message.findUnique.mockResolvedValue(null);

      await expect(service.deleteMessage('msg-x', 'user-1')).rejects.toThrow(NotFoundException);
    });

    it('doit lever ForbiddenException si pas l\'auteur', async () => {
      mockPrisma.message.findUnique.mockResolvedValue({ id: 'msg-1', senderId: 'user-2' });

      await expect(service.deleteMessage('msg-1', 'user-1')).rejects.toThrow(ForbiddenException);
    });

    it('doit soft-delete le message (isDeleted: true)', async () => {
      mockPrisma.message.findUnique.mockResolvedValue({ id: 'msg-1', senderId: 'user-1' });
      mockPrisma.message.update.mockResolvedValue({});

      await service.deleteMessage('msg-1', 'user-1');

      expect(mockPrisma.message.update).toHaveBeenCalledWith(
        expect.objectContaining({
          data: { isDeleted: true, content: 'Message supprimé' },
        })
      );
    });
  });

  // ── markAsRead ────────────────────────────────────────────────────────────

  describe('markAsRead', () => {
    it('doit mettre à jour lastReadAt et marquer les messages comme lus', async () => {
      mockPrisma.conversationMember.update.mockResolvedValue({});
      mockPrisma.message.updateMany.mockResolvedValue({ count: 3 });

      await service.markAsRead('conv-1', 'user-1');

      expect(mockPrisma.conversationMember.update).toHaveBeenCalledWith(
        expect.objectContaining({
          where: { conversationId_userId: { conversationId: 'conv-1', userId: 'user-1' } },
          data: expect.objectContaining({ lastReadAt: expect.any(Date) }),
        })
      );
      expect(mockPrisma.message.updateMany).toHaveBeenCalledWith(
        expect.objectContaining({
          where: expect.objectContaining({
            conversationId: 'conv-1',
            senderId: { not: 'user-1' },
            isRead: false,
          }),
          data: { isRead: true },
        })
      );
    });
  });
});
