import { Test, TestingModule } from '@nestjs/testing';
import { ChatService } from './chat.service';
import { MessageService } from 'src/message/message.service';
import { ChatGateway } from './chat.gateway';
import { NotificationService } from 'src/notification/notification.service';
import { DatabaseService } from 'src/database/database.service';
import { Cache, CACHE_MANAGER } from '@nestjs/cache-manager';
import { BadRequestException, ForbiddenException, NotFoundException } from '@nestjs/common';

describe('ChatService', () => {
  let service: ChatService;
  let databaseService: DatabaseService;
  let messageService: MessageService;
  let chatGatway: ChatGateway;
  let notificationService: NotificationService;
  let cacheManager: Cache;

  const mockDatabaseService = {
    user: {
      findUnique: jest.fn(),
    },
    chat: {
      findMany: jest.fn(),
      findUnique: jest.fn(),
      findFirst: jest.fn(),
      create: jest.fn(),
    },
    participant: {
      findUnique: jest.fn(),
    }

  }
  const mockMessageService = {
    verifyMembership: jest.fn(),
  }

  const mockEmit = jest.fn();
  const mockChatGateway = {
    server: {
      to: jest.fn(() => ({
        emit: mockEmit,
      })),
    }
  };

  const mockNotificationService = {
    createNotification: jest.fn(),

  }
  const mockCacheManager = {
    get: jest.fn(),
    set: jest.fn(),
    del: jest.fn(),
  }

  beforeEach(async () => {
    jest.clearAllMocks()

    const module: TestingModule = await Test.createTestingModule({
      providers: [ChatService,
        {
          provide: DatabaseService,
          useValue: mockDatabaseService,
        },
        {
          provide: MessageService,
          useValue: mockMessageService,
        },
        {
          provide: ChatGateway,
          useValue: mockChatGateway,
        },
        {
          provide: NotificationService,
          useValue: mockNotificationService,
        },
        {
          provide: CACHE_MANAGER, //is a token (not a class)
          useValue: mockCacheManager,
        },
      ],

    }).compile();

    service = module.get<ChatService>(ChatService);
    databaseService = module.get<DatabaseService>(DatabaseService);
    messageService = module.get<MessageService>(MessageService);
    chatGatway = module.get<ChatGateway>(ChatGateway);
    notificationService = module.get<NotificationService>(NotificationService);
    cacheManager = module.get<Cache>(CACHE_MANAGER);
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });

  describe("getAllChats", () => {

    const userId = 'user-1';
    const cachedKey = `user:${userId}:chats`;
    const TTL = 300 * 1000; //5 minutes

    const mockChatsResult = [
      {
        id: 'chat123',
        isGroup: false,
        lastMessageAt: new Date(),
        messages: [{ id: 'msg1', content: 'Hello' }],
        participants: [{ user: { id: 'userA', username: 'Alice' } }, { user: { id: 'userB', username: 'Bob' } }],
      },
    ]

    it('should return cached data if available (Cache Hit)', async () => {
      mockCacheManager.get.mockResolvedValue(mockChatsResult);

      const result = await service.getAllChats(userId);

      expect(cacheManager.get).toHaveBeenCalledWith(cachedKey);
      expect(cacheManager.set).not.toHaveBeenCalled(); //should not save to cache on a hit
      expect(result).toEqual(mockChatsResult);
    });

    it('should fetch database, cache the result and return it (Cache Miss)', async () => {
      mockCacheManager.get.mockResolvedValue(null); //to be missed
      mockDatabaseService.chat.findMany.mockResolvedValue(mockChatsResult);

      const result = await service.getAllChats(userId);

      expect(cacheManager.get).toHaveBeenCalledWith(cachedKey);
      expect(databaseService.chat.findMany).toHaveBeenCalledTimes(1);

      //check if findMany was called with correct query struture
      expect(databaseService.chat.findMany).toHaveBeenCalledWith({
        where: {
          participants: {
            some: { userId: userId }
          }
        },
        include: {
          messages: {
            orderBy: {
              createdAt: 'desc'
            },
            take: 1,
          },
          participants: {
            include: {
              user: {
                select: {
                  id: true,
                  username: true,
                }
              }
            }
          }
        },
        orderBy: [
          { lastMessageAt: 'desc' },
          { updatedAt: 'desc' },
        ]
      });

      expect(cacheManager.set).toHaveBeenCalledWith(cachedKey, mockChatsResult, TTL);
      expect(result).toEqual(mockChatsResult);
    })
  })

  describe("viewChat", () => {
    const userId = 'user-viewer';
    const chatId = 'chat-to-view';
    let getChatSpy: jest.SpyInstance;

    const mockResult = {
      id: 'chat_g_456',
      isGroup: true,
      participants: [],
    }

    beforeEach(() => {
      //Isolate the internal call to getChat
      getChatSpy = jest.spyOn(service, 'getChat').mockResolvedValue(mockResult);

    })

    // Path 1: Success - User is already a participant
    it('should call getChat and return the result if user is a participant', async () => {
      //mock succeed
      mockDatabaseService.participant.findUnique.mockResolvedValue({ id: 'parti-1234' });

      //ACT
      const result = await service.viewChat(userId, chatId);

      //ASSERT
      expect(mockDatabaseService.participant.findUnique).toHaveBeenCalled();
      expect(mockDatabaseService.chat.findUnique).not.toHaveBeenCalled()
      expect(getChatSpy).toHaveBeenCalledWith(chatId)
      expect(result).toEqual(mockResult);
    })

    // Path 2: Fail - Chat not found
    it('should throw NotFoundException if chat is not found after participant check fails', async () => {
      //mock parti-fail + chat-fail
      mockDatabaseService.participant.findUnique.mockResolvedValue(null);
      mockDatabaseService.chat.findUnique.mockResolvedValue(null);

      //ASSERT
      await expect(service.viewChat(userId, chatId)).rejects.toThrow(NotFoundException);
      expect(getChatSpy).not.toHaveBeenCalled();
    });

    // Path: 3 Fail - Private chat of others
    it('should throw ForbittenException if user is not participant and chat is NOT a group', async () => {
      //mock parti-fail + chat-fail
      mockDatabaseService.participant.findUnique.mockResolvedValue(null);
      mockDatabaseService.chat.findUnique.mockResolvedValue({ id: 'chat-found-id', isGroup: false, _count: { participants: 2 } });

      // ASSERT
      await expect(service.viewChat(userId, chatId)).rejects.toThrow(ForbiddenException);
      expect(getChatSpy).not.toHaveBeenCalled();
    });

    // Path: 4 Success - New Group View (Allowing non-members to view group chats)
    it('should return group chat details with isNewGroupChat flag if user is NOT a participant and it is a group chat', async () => {
      const mockGroupChatResut = {
        id: chatId,
        isGroup: true,
        _count: {
          participants: true,
        }
      }

      // mock parti:fail + return group chat
      mockDatabaseService.participant.findUnique.mockResolvedValue(null);
      mockDatabaseService.chat.findUnique.mockResolvedValue(mockGroupChatResut);

      // ACT
      const result = await service.viewChat(userId, chatId);

      // ASSET
      expect(getChatSpy).not.toHaveBeenCalled();
      expect(databaseService.chat.findUnique).toHaveBeenCalled();
      expect(result).toEqual({
        chat: mockGroupChatResut,
        isNewGroupChat: true,
      });

    })
  });

  describe("getChat", () => {
    const chatId = 'chat-id-1';
    const cachedKey = `chat:${chatId}:latest`;

    const mockResult = {
      id: chatId,
      partipants: [],
      messages: [],
    }

    it('should return cached chat if avaiable (Cache Hit)', async () => {
      // mock cached-exists
      mockCacheManager.get.mockResolvedValue(mockResult);

      //ACT
      const result = await service.getChat(chatId);

      //ASSERT
      expect(cacheManager.get).toHaveBeenCalledWith(cachedKey);
      expect(databaseService.chat.findUnique).not.toHaveBeenCalled();
      expect(cacheManager.set).not.toHaveBeenCalled();
      expect(result).toEqual(mockResult);
    });

    // Fail - Chat not found (after cached-missed)
    it('should return NotFoundException if chat is not found after(Cache Miss)', async () => {
      //mock cached-fails + no chat
      mockCacheManager.get.mockResolvedValue(null);
      mockDatabaseService.chat.findUnique.mockResolvedValue(null);

      // ASSERT
      await expect(service.getChat(chatId)).rejects.toThrow(NotFoundException);
      expect(cacheManager.set).not.toHaveBeenCalled();
    })

    it('should return fetched data  and set catch-data (Cache Miss)', async () => {
      //mock cached-miss + findUnique
      mockCacheManager.get.mockResolvedValue(null);
      mockDatabaseService.chat.findUnique.mockResolvedValue(mockResult);

      // ACT
      const result = await service.getChat(chatId);

      // ASSERT
      expect(mockCacheManager.get).toHaveBeenCalled();
      expect(databaseService.chat.findUnique).toHaveBeenCalledTimes(1);
      expect(cacheManager.set).toHaveBeenCalledWith(cachedKey, result, 300 * 1000);
      expect(result).toEqual(mockResult);
    })
  })

  describe('startChat', () => {
    const userId = 'my-initiator-id';
    const otherUserId = 'other-recipient-id';
    const existingChatId = 'existing-chat-dm-1';

    const mockExistingChat = {
      id: existingChatId,
      isGroup: false,
      participants: [{ userId }, { userId: otherUserId }],
      messages: []
    }
    const mockNewChat = {
      id: 'new-dm-chat-id',
      isGroup: false,
      participants: [{ userId }, { userId: otherUserId }],
      messages: [{}]
    }

    // Path 1: Fail- User tries to chat with themselves
    it('should throw BadReqeustException if user ids are the same', async () => {
      // ACT and ASSERT
      await expect(service.startChat(userId, userId)).rejects.toThrow(BadRequestException);
      expect(databaseService.user.findUnique).not.toHaveBeenCalled();
    })

    // Path 2: Fail - OtherUserId is invalid/not found
    it('should throw NotFoundException if other user does not exists', async () => {
      //mock -user lookup fails
      mockDatabaseService.user.findUnique.mockResolvedValue(null);

      //ACT && ASSERT
      await expect(service.startChat(userId, otherUserId)).rejects.toThrow(NotFoundException);
      expect(databaseService.user.findUnique).toHaveBeenCalledWith({
        where: { id: otherUserId },
        select: { id: true }
      });
      expect(databaseService.chat.findFirst).not.toHaveBeenCalled();
    })

    // Path: 3 Success - Chat already exists
    it('should return the existing chat if a DM already exists between the users', async () => {
      // mock otherUser loopup + chat find --success
      mockDatabaseService.user.findUnique.mockResolvedValue({ id: otherUserId });
      mockDatabaseService.chat.findFirst.mockResolvedValue(mockExistingChat);

      //ACT
      const result = await service.startChat(userId, otherUserId);

      //ASSERT
      expect(databaseService.user.findUnique).toHaveBeenCalled()
      expect(databaseService.chat.findFirst).toHaveBeenCalled()
      expect(databaseService.chat.create).not.toHaveBeenCalled();
      expect(notificationService.createNotification).not.toHaveBeenCalled();
      expect(mockEmit).not.toHaveBeenCalled();
      expect(cacheManager.del).not.toHaveBeenCalledTimes(2);
      expect(result).toEqual(mockExistingChat);
    })
  })
});

