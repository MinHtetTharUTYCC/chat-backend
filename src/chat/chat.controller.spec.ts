import { Test, TestingModule } from '@nestjs/testing';
import { ChatController } from './chat.controller';
import { MessageService } from 'src/message/message.service';
import { ChatService } from './chat.service';
import { StartChatDto } from './dto/startChat.dto';
import { PaginationDto } from './dto/pagination.dto';
import { SendMessageDto } from './dto/sendMessage.dto';
import { EditMessageDto } from './dto/edit-message.dto';
import { UpdateChatTitleDto } from './dto/update-chat-title.dto';
import { CreateGroupChatDto } from './dto/create-group-chat.dto';
import { AddToChatDto } from './dto/add-to-chat.dto';

describe('ChatController', () => {
    let controller: ChatController;
    let chatService: ChatService;
    let messageService: MessageService;

    const mockChatService = {
        getAllChats: jest.fn(),
        viewChat: jest.fn(),
        startChat: jest.fn(),
        updateChatTitle: jest.fn(),
        createGroupChat: jest.fn(),
        addToGroupChat: jest.fn(),
        joinGroup: jest.fn(),
        leaveGroup: jest.fn(),
    };

    const mockMessageService = {
        getMessages: jest.fn(),
        sendMessage: jest.fn(),
        deleteMessage: jest.fn(),
        editMessage: jest.fn(),
        getPinnedMessages: jest.fn(),
        pinMessage: jest.fn(),
        unpinMessage: jest.fn(),
    };

    const mockRequest = {
        user: { sub: 'user-id-123' },
    };

    beforeEach(async () => {
        const module: TestingModule = await Test.createTestingModule({
            controllers: [ChatController],
            providers: [
                //mocks instead of actual services
                {
                    provide: ChatService,
                    useValue: mockChatService,
                },
                {
                    provide: MessageService,
                    useValue: mockMessageService,
                },
            ],
        }).compile();

        controller = module.get<ChatController>(ChatController);
        chatService = module.get<ChatService>(ChatService);
        messageService = module.get<MessageService>(MessageService);

        //clear mock history before each test
        jest.clearAllMocks();
    });

    it('should be defined', () => {
        expect(controller).toBeDefined();
    });

    describe('getAllChats', () => {
        it('shuld return a list of chats for the user', async () => {
            const mockResult = [{ id: '1' }, { id: '2' }];
            mockChatService.getAllChats.mockResolvedValue(mockResult);

            const result = await controller.getAllChats(mockRequest);

            expect(chatService.getAllChats).toHaveBeenCalledWith(
                mockRequest.user.sub,
            );
            expect(result).toEqual(mockResult);
        });
    });

    describe('viewChat', () => {
        it('shuld return a specific chat view', async () => {
            const chatId = 'chat-id-1';
            const mockResult = {
                id: chatId,
                messages: [],
                participants: [],
                pinnedMessages: [],
            };

            mockChatService.viewChat.mockResolvedValue(mockResult);

            const result = await controller.viewChat(mockRequest, chatId);

            expect(chatService.viewChat).toHaveBeenCalledWith(
                mockRequest.user.sub,
                chatId,
            );
            expect(result).toEqual(mockResult);
        });
    });

    describe('startChat', () => {
        it('shuld start a chat with another user', async () => {
            const dto: StartChatDto = { otherUserId: 'other-user-id' };
            const mockResult = { id: 'new-chat-id' };
            mockChatService.startChat.mockResolvedValue(mockResult);

            const result = await controller.startChat(mockRequest, dto);
            expect(chatService.startChat).toHaveBeenCalledWith(
                mockRequest.user.sub,
                dto.otherUserId,
            );
            expect(result).toEqual(mockResult);
        });
    });

    describe('getMessages', () => {
        it('shuld return a list of messages', async () => {
            const chatIdFromParams = 'chat-id-1';
            const dto: PaginationDto = {
                cursor: 'latest-loaded-msg-id',
                limit: 20,
            };
            const mockResult = [
                { id: 'msg-1', content: 'content-1' },
                { id: 'msg-2', content: 'conent-2' },
            ];
            mockMessageService.getMessages.mockResolvedValue(mockResult);

            const result = await controller.getMessages(
                mockRequest,
                chatIdFromParams,
                dto,
            );
            expect(messageService.getMessages).toHaveBeenCalledWith(
                mockRequest.user.sub,
                chatIdFromParams,
                dto.cursor,
                dto.limit,
            );
            expect(result).toEqual(mockResult);
        });
    });

    describe('send Message', () => {
        it('should return a new message', async () => {
            const chatIdFromParams = 'chat-id-1';
            const dto: SendMessageDto = { content: 'new message' };
            const mockResult = { id: 'msg-id-new', content: 'new message' };
            mockMessageService.sendMessage.mockResolvedValue(mockResult);

            const result = await controller.sendMessage(
                mockRequest,
                chatIdFromParams,
                dto,
            );
            expect(messageService.sendMessage).toHaveBeenCalledWith(
                mockRequest.user.sub,
                chatIdFromParams,
                dto.content,
            );
            expect(result).toEqual(mockResult);
        });
    });

    describe('delete Message', () => {
        it('should successfully delete a message', async () => {
            const chatId = 'chat-id-1';
            const messageId = 'msg-id-1';
            const mockResult = {
                success: true,
                message: 'Successfully delete message',
            };
            mockMessageService.deleteMessage.mockResolvedValue(mockResult);

            const result = await controller.deleteMessage(
                mockRequest,
                chatId,
                messageId,
            );
            expect(messageService.deleteMessage).toHaveBeenCalledWith(
                mockRequest.user.sub,
                chatId,
                messageId,
            );
            expect(result).toEqual(mockResult);
        });
    });

    describe('edit Message', () => {
        it('should return an edited message', async () => {
            const chatId = 'chat-id-1';
            const messageId = 'msg-id-1';
            const dto: EditMessageDto = { content: 'newly updated message' };
            const mockResult = {
                id: 'msg-id-1',
                content: 'newly updated message',
            };
            mockMessageService.editMessage.mockResolvedValue(mockResult);

            const result = await controller.editMessage(
                mockRequest,
                chatId,
                messageId,
                dto,
            );
            expect(messageService.editMessage).toHaveBeenCalledWith(
                mockRequest.user.sub,
                chatId,
                messageId,
                dto.content,
            );
            expect(result).toEqual(mockResult);
        });
    });

    describe('get pinned Messages', () => {
        it('should return a list of pinned messages', async () => {
            const chatId = 'chat-id-1';
            const dto: PaginationDto = {
                cursor: 'latest-loaded-pinned-id',
                limit: 20,
            };
            const mockResult = [{ id: 'pinned-id-1', message: {} }];
            mockMessageService.getPinnedMessages.mockResolvedValue(mockResult);

            const result = await controller.getPinnedMessages(
                mockRequest,
                chatId,
                dto,
            );
            expect(messageService.getPinnedMessages).toHaveBeenCalledWith(
                mockRequest.user.sub,
                chatId,
                dto.cursor,
                dto.limit,
            );
            expect(result).toEqual(mockResult);
        });
    });

    describe('pin Message', () => {
        it('should return a newly created pin message', async () => {
            const chatId = 'chat-id-1';
            const messageId = 'msg-id-1';
            const mockResult = { id: 'pinned-id-1', message: {} };
            mockMessageService.pinMessage.mockResolvedValue(mockResult);

            const result = await controller.pinMessage(
                mockRequest,
                chatId,
                messageId,
            );
            expect(messageService.pinMessage).toHaveBeenCalledWith(
                mockRequest.user.sub,
                chatId,
                messageId,
            );
            expect(result).toEqual(mockResult);
        });

        describe('unpin Message', () => {
            it('should successfully delete pinned message', async () => {
                const chatId = 'chat-id-1';
                const messageId = 'msg-id-1';
                const mockResult = {
                    success: true,
                    message: 'Successfully unpineed message',
                };
                mockMessageService.unpinMessage.mockResolvedValue(mockResult);

                const result = await controller.unpinMessage(
                    mockRequest,
                    chatId,
                    messageId,
                );
                expect(messageService.unpinMessage).toHaveBeenCalledWith(
                    mockRequest.user.sub,
                    chatId,
                    messageId,
                );
                expect(result).toEqual(mockResult);
            });
        });

        describe('update chat title', () => {
            it('should successfully update title of the chat', async () => {
                const chatId = 'chat-id-1';
                const dto: UpdateChatTitleDto = { title: 'New Title' };
                const mockResult = {
                    success: true,
                    chatId: chatId,
                    title: 'New Title',
                };
                mockChatService.updateChatTitle.mockResolvedValue(mockResult);

                const result = await controller.updateChatTitle(
                    mockRequest,
                    chatId,
                    dto,
                );
                expect(chatService.updateChatTitle).toHaveBeenCalledWith(
                    mockRequest.user.sub,
                    chatId,
                    dto.title,
                );
                expect(result).toEqual(mockResult);
            });
        });

        describe('create group chat', () => {
            it('should successfully create a new group chat', async () => {
                const dto: CreateGroupChatDto = {
                    title: 'New Group',
                    userIds: ['user-1', 'user-2'],
                };
                const mockResult = {
                    id: 'new-chat-id',
                    title: 'Group',
                    messages: [],
                    participants: [],
                };
                mockChatService.createGroupChat.mockResolvedValue(mockResult);

                const result = await controller.createGroupChat(
                    mockRequest,
                    dto,
                );
                expect(chatService.createGroupChat).toHaveBeenCalledWith(
                    mockRequest.user.sub,
                    dto.title,
                    dto.userIds,
                );
                expect(result).toEqual(mockResult);
            });
        });

        describe('add others to group chat', () => {
            it('should added others as chat participants', async () => {
                const chatId = 'chat-id-1';
                const dto: AddToChatDto = { userIds: ['user-2', 'user-3'] };
                const mockResult = {
                    id: chatId,
                    messages: [],
                    participants: [],
                };
                mockChatService.addToGroupChat.mockResolvedValue(mockResult);

                const result = await controller.addToGroupChat(
                    mockRequest,
                    chatId,
                    dto,
                );
                expect(chatService.addToGroupChat).toHaveBeenCalledWith(
                    mockRequest.user.sub,
                    chatId,
                    dto.userIds,
                );
                expect(result).toEqual(mockResult);
            });
        });

        describe('join group', () => {
            it('should successfully joined the group chat', async () => {
                const chatId = 'chat-id-1';
                const mockResult = {
                    success: true,
                    message: 'Successfully joined the group chat',
                };
                mockChatService.joinGroup.mockResolvedValue(mockResult);

                const result = await controller.joinGroup(mockRequest, chatId);
                expect(chatService.joinGroup).toHaveBeenCalledWith(
                    mockRequest.user.sub,
                    chatId,
                );
                expect(result).toEqual(mockResult);
            });
        });

        describe('leave group', () => {
            it('should successfully leaved the group chat', async () => {
                const chatId = 'chat-id-1';
                const mockResult = {
                    success: true,
                    message: 'Successfully leaved the group chat',
                };
                mockChatService.leaveGroup.mockResolvedValue(mockResult);

                const result = await controller.leaveGroup(mockRequest, chatId);
                expect(chatService.leaveGroup).toHaveBeenCalledWith(
                    mockRequest.user.sub,
                    chatId,
                );
                expect(result).toEqual(mockResult);
            });
        });
    });
});
