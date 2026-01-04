import {
    ConflictException,
    ForbiddenException,
    Injectable,
    Logger,
    NotFoundException,
} from '@nestjs/common';
import { NotificationType } from 'generated/prisma';
import { PrismaClientKnownRequestError } from 'generated/prisma/runtime/client';
import { RequestUser } from 'src/auth/interfaces/request-user.interface';
import { ChatGateway } from 'src/chat/chat.gateway';
import { DatabaseService } from 'src/database/database.service';
import { NotificationService } from 'src/notification/notification.service';
import { RedisService } from 'src/redis/redis.service';

@Injectable()
export class MessageService {
    private readonly logger = new Logger(MessageService.name);

    constructor(
        private readonly databaseService: DatabaseService,
        private readonly chatGateway: ChatGateway,
        private readonly notificationService: NotificationService,
        private redisService: RedisService,
    ) {}

    async sendMessage(userId: string, chatId: string, content: string) {
        const result = await this.databaseService.$transaction(async (tx) => {
            const [membership, participantIds] = await Promise.all([
                tx.participant.findUnique({
                    where: {
                        userId_chatId: { userId, chatId },
                    },
                    select: {
                        id: true,
                    },
                }),
                tx.participant.findMany({
                    where: { chatId },
                    select: { userId: true },
                }),
            ]);

            if (!membership) {
                throw new ForbiddenException(
                    'You are not a member of this chat',
                );
            }

            const [newMessage, _] = await Promise.all([
                tx.message.create({
                    data: {
                        content,
                        chatId,
                        senderId: userId,
                    },
                    select: {
                        id: true,
                        content: true,
                        chatId: true,
                        senderId: true,
                        createdAt: true,
                        updatedAt: true,
                        sender: {
                            select: {
                                id: true,
                                username: true,
                            },
                        },
                    },
                }),
                tx.chat.update({
                    where: { id: chatId },
                    data: { lastMessageAt: new Date() },
                    select: { id: true },
                }),
            ]);

            return { newMessage, participantIds };
        });

        // Broadcast via WS
        this.chatGateway.server
            .to(`chat_${chatId}`)
            .emit('new_message', result.newMessage);

        // invalidate cache
        const keysToDelete = [
            `chat:${chatId}:messages`,
            ...result.participantIds.map((p) => `user:${p.userId}:chats`),
        ];

        // fire and forgot
        this.redisService
            .del(...keysToDelete)
            .catch((err) =>
                this.logger.error('Cache invalidation error: ', err),
            );

        return result.newMessage;
    }

    async getMessages(
        userId: string,
        chatId: string,
        searchParams: {
            prevCursor?: string;
            nextCursor?: string;
            aroundMessageId?: string;
            aroundDate?: number;
        },
        limit: number = 20,
    ) {
        await this.verifyMembership(userId, chatId);

        const latestMessageKey = `chat:${chatId}:messages`;

        // const fetchingToUp = !!searchParams.nextCursor; //GETTTING OLDER
        const fetchingToBottom = !!searchParams.prevCursor; //GETTING NEWER
        const jumpingToMessage = !!searchParams.aroundMessageId; //PINNED OR SEARCH
        const jumpingToDate = !!searchParams.aroundDate;

        const activeCursor = searchParams.nextCursor || searchParams.prevCursor;

        // Cache only for initial load (latest messages, no params)
        if (!activeCursor && !jumpingToMessage && !jumpingToDate) {
            const cacheded = await this.redisService.get(latestMessageKey);
            const cachedResult = cacheded ? JSON.parse(cacheded) : null;

            if (cachedResult) {
                this.logger.debug('Returning messages + meta from cache...');
                return cachedResult;
            }
        }

        let messages: any[];
        let anchorMessage: any = null;

        if (jumpingToMessage) {
            anchorMessage = await this.databaseService.message.findUnique({
                where: { id: searchParams.aroundMessageId },
                include: {
                    sender: {
                        select: { id: true, username: true },
                    },
                },
            });

            if (!anchorMessage) {
                throw new NotFoundException('Message not found');
            }
            // Get messages around this anchor (half before, half after)
            const halfLimit = Math.floor(limit / 2);

            const [olderMessages, newerMessages] = await Promise.all([
                // Older messages
                this.databaseService.message.findMany({
                    where: {
                        chatId,
                        createdAt: { lt: anchorMessage.createdAt },
                    },
                    take: halfLimit,
                    orderBy: { createdAt: 'desc' },
                    include: {
                        sender: {
                            select: { id: true, username: true },
                        },
                    },
                }),
                // Newer messages
                this.databaseService.message.findMany({
                    where: {
                        chatId,
                        createdAt: { gt: anchorMessage.createdAt },
                    },
                    take: halfLimit,
                    orderBy: { createdAt: 'asc' },
                    include: {
                        sender: {
                            select: { id: true, username: true },
                        },
                    },
                }),
            ]);

            // Combine: older (reversed) + anchor + newer
            messages = [
                ...olderMessages.reverse(),
                anchorMessage,
                ...newerMessages,
            ];
        } else if (jumpingToDate && !!searchParams.aroundDate) {
            const targetDate = new Date(searchParams.aroundDate);
            const halfLimit = Math.floor(limit / 2);

            const [olderMessages, newerMessages] = await Promise.all([
                // Older messages
                this.databaseService.message.findMany({
                    where: {
                        chatId,
                        createdAt: { lt: targetDate },
                    },
                    take: halfLimit,
                    orderBy: { createdAt: 'desc' },
                    include: {
                        sender: {
                            select: { id: true, username: true },
                        },
                    },
                }),
                // Newer messages
                this.databaseService.message.findMany({
                    where: {
                        chatId,
                        createdAt: { gte: targetDate },
                    },
                    take: halfLimit,
                    orderBy: { createdAt: 'asc' },
                    include: {
                        sender: {
                            select: { id: true, username: true },
                        },
                    },
                }),
            ]);

            messages = [...olderMessages.reverse(), ...newerMessages];
        } else {
            // Regular (forward or backward)
            const orderByDirection: 'desc' | 'asc' = fetchingToBottom
                ? 'asc'
                : 'desc';

            messages = await this.databaseService.message.findMany({
                where: { chatId },
                take: limit,
                skip: activeCursor ? 1 : 0, //skip the cursor itself
                cursor: activeCursor ? { id: activeCursor } : undefined,
                orderBy: { createdAt: orderByDirection },
                include: {
                    sender: {
                        select: { id: true, username: true },
                    },
                },
            });
        }

        let nextCursor: string | null = null; // for OLDER items
        let prevCursor: string | null = null; // for NEWER items
        let messagesSorted: any[] = [];

        if (messages.length > 0) {
            // find oldest and newest
            messagesSorted = [...messages].sort(
                (a, b) =>
                    new Date(a.createdAt).getTime() -
                    new Date(b.createdAt).getTime(),
            );

            const oldestMessage = messagesSorted[0];
            const newestMessage = messagesSorted[messagesSorted.length - 1];

            // Check if there are older messages
            const hasOlderCount = await this.databaseService.message.count({
                where: {
                    chatId,
                    createdAt: { lt: oldestMessage.createdAt },
                },
            });
            // Check if there are newer messages
            const hasNewerCount = await this.databaseService.message.count({
                where: {
                    chatId,
                    createdAt: { gt: newestMessage.createdAt },
                },
            });

            if (!fetchingToBottom) {
                nextCursor = hasOlderCount > 0 ? oldestMessage.id : null;
            }

            if (jumpingToMessage || jumpingToDate || fetchingToBottom) {
                prevCursor = hasNewerCount > 0 ? newestMessage.id : null;
            }
        }

        //for pinned
        const messageIds = messagesSorted.map((msg) => msg.id);
        const pinned = await this.databaseService.pinnedMessage.findMany({
            where: {
                chatId,
                messageId: { in: messageIds },
            },
            select: {
                messageId: true,
                pinnedByUserId: true,
            },
        });
        const pinnedMap = new Map(
            pinned.map((p) => [p.messageId, p.pinnedByUserId]),
        );
        messagesSorted = messagesSorted.map((msg) => {
            const pinInfo = pinnedMap.get(msg.id);

            return {
                ...msg,
                isPinned: !!pinInfo,
                pinnedByUserId: pinInfo ?? null,
            };
        });

        const response = {
            messages: messagesSorted,
            meta: {
                nextCursor, //to load newers(upward)
                prevCursor, //to load olders(downward)
                hasMoreNext: nextCursor !== null,
                hasMorePrev: prevCursor !== null,
                anchorMessageId: searchParams.aroundMessageId, //for frontend
            },
        };

        // Cache only initial load
        if (!activeCursor && !jumpingToMessage && !jumpingToDate) {
            this.logger.debug('Setting messages cache...');
            await this.redisService.set(
                latestMessageKey,
                JSON.stringify(response),
                300, //5 minute
            );
        }

        return response;
    }

    async deleteMessage(userId: string, chatId: string, messageId: string) {
        const result = await this.databaseService.$transaction(async (tx) => {
            const [membership, deleteResult] = await Promise.all([
                tx.participant.findUnique({
                    where: {
                        userId_chatId: { userId, chatId },
                    },
                    select: { id: true },
                }),
                // Try to delete the message (only works if user is the sender)
                tx.message.deleteMany({
                    where: {
                        id: messageId,
                        senderId: userId,
                        chatId,
                    },
                }),
            ]);

            if (!membership)
                throw new ForbiddenException(
                    'You are not a member of this chat',
                );

            if (deleteResult.count === 0)
                throw new NotFoundException(
                    'Message not found or you are not the sender',
                );

            const participants = await tx.participant.findMany({
                where: { chatId },
                select: {
                    userId: true,
                },
            });

            return { participants };
        });

        this.chatGateway.server
            .to(`chat_${chatId}`)
            .emit('message_deleted', { messageId });

        const cacheKeys = [
            `chat:${chatId}:messages`,
            ...result.participants.map((p) => `user:${p.userId}:chats`),
        ];

        // fire and forgot
        cacheKeys.forEach((key) =>
            this.redisService
                .del(key)
                .catch((err) =>
                    this.logger.error(
                        `Error deleting cache for key ${key}:`,
                        err,
                    ),
                ),
        );

        return { messageId, chatId };
    }

    async editMessage(
        me: RequestUser,
        chatId: string,
        messageId: string,
        content: string,
    ) {
        const result = await this.databaseService.$transaction(async (tx) => {
            const [membership, message] = await Promise.all([
                // Check membership first
                tx.participant.findUnique({
                    where: {
                        userId_chatId: { userId: me.sub, chatId },
                    },
                    select: { id: true },
                }),
                // Find the message (only if user is sender)
                tx.message.findFirst({
                    where: {
                        id: messageId,
                        senderId: me.sub,
                        chatId: chatId,
                    },
                    select: { id: true, content: true },
                }),
            ]);

            if (!membership) {
                throw new ForbiddenException(
                    'You are not a member of this chat',
                );
            }
            if (!message) {
                throw new NotFoundException(
                    'Message not found or you are not the sender',
                );
            }

            const [updatedMessage, participants] = await Promise.all([
                tx.message.update({
                    where: { id: messageId },
                    data: { content },
                    select: {
                        id: true,
                        content: true,
                        chatId: true,
                    },
                }),
                tx.participant.findMany({
                    where: { chatId },
                    select: { userId: true },
                }),
            ]);

            return { updatedMessage, participants };
        });

        const payload = {
            messageId,
            chatId,
            content: result.updatedMessage.content,
            actor: {
                id: me.sub,
                username: me.username,
            },
        };

        this.chatGateway.server
            .to(`chat_${chatId}`)
            .emit('message_edited', payload);

        const cacheKeys = [
            `chat:${chatId}:messages`,
            ...result.participants.map((p) => `user:${p.userId}:chats`),
        ];

        cacheKeys.forEach((key) =>
            this.redisService
                .del(key)
                .catch((err) =>
                    this.logger.error(`Error deleting cache key ${key}:`, err),
                ),
        );

        return {
            messageId,
            chatId,
            content: result.updatedMessage.content,
        };
    }

    async getPinnedMessages(
        userId: string,
        chatId: string,
        cursor?: string,
        limit: number = 20,
    ) {
        const cachedKey = `chat:${chatId}:messages:pinned`;

        if (!cursor) {
            const cached = await this.redisService.get(cachedKey);
            const cachedResult = cached ? JSON.parse(cached) : null;

            if (cachedResult) {
                this.logger.debug('Returning pinned messages from cache...');
                return cachedResult;
            }
        }

        const result = await this.databaseService.$transaction(async (tx) => {
            const [membership, pinnedMessage] = await Promise.all([
                tx.participant.findUnique({
                    where: {
                        userId_chatId: { userId, chatId },
                    },
                    select: { id: true },
                }),
                tx.pinnedMessage.findMany({
                    where: {
                        chatId,
                    },
                    skip: cursor ? 1 : 0,
                    cursor: cursor ? { id: cursor } : undefined,
                    take: limit,
                    orderBy: {
                        createdAt: 'desc',
                    },
                    select: {
                        id: true,
                        chatId: true,
                        messageId: true,
                        pinnedByUserId: true,
                        user: {
                            select: {
                                id: true,
                                username: true,
                            },
                        },
                        message: {
                            select: {
                                id: true,
                                content: true,
                                senderId: true, //used at frontend
                            },
                        },
                        createdAt: true,
                    },
                }),
            ]);

            if (!membership) {
                throw new ForbiddenException(
                    'You are not a member of this chat',
                );
            }
            return pinnedMessage;
        });

        let nextCursor: string | null = null;
        if (result.length === limit) {
            nextCursor = result[result.length - 1].id;
        }

        const response = {
            pinnedMessages: result,
            meta: {
                nextCursor,
                hasMore: nextCursor !== null,
            },
        };

        // cache first page only
        //fire and forgot - let it run in background
        if (!cursor) {
            this.redisService
                .set(
                    cachedKey,
                    JSON.stringify(response),
                    1800, //30 minutes
                )
                .catch((err) => this.logger.error('Cache Set Error', err));
        }

        return response;
    }

    async pinMessage(
        userId: string,
        username: string,
        chatId: string,
        messageId: string,
    ) {
        const startTime = Date.now();
        this.logger.debug('[PIN] Starting pinMessage');

        const t1 = Date.now();
        const [membershipResult, message, chatInfo, pinnedByUser] =
            await Promise.all([
                // Check 1: Verify membership
                this.databaseService.participant.findFirst({
                    where: { chatId, userId },
                    select: { userId: true },
                }),

                // Check 2: Verify message exists + get sender
                this.databaseService.message.findFirst({
                    where: { id: messageId, chatId },
                    select: {
                        id: true,
                        content: true,
                        senderId: true,
                        sender: {
                            select: { id: true, username: true },
                        },
                    },
                }),

                // Check 3: Get chat info + other participants
                this.databaseService.chat.findUnique({
                    where: { id: chatId },
                    select: {
                        isGroup: true,
                        participants: {
                            where: { userId: { not: userId } },
                            select: { userId: true },
                            take: 1,
                        },
                    },
                }),

                // Check 4: Get pinning user details
                this.databaseService.user.findUnique({
                    where: { id: userId },
                    select: { id: true, username: true },
                }),
            ]);
        this.logger.debug(`[PIN] ALL parallel checks: ${Date.now() - t1}ms`);

        // Validate results
        if (!membershipResult) {
            throw new ForbiddenException('User is not a member of this chat');
        }
        if (!message) {
            throw new NotFoundException('Message not found in the chat');
        }

        try {
            // Create pin (lean)
            const t2 = Date.now();
            const pinMessage = await this.databaseService.pinnedMessage.create({
                data: {
                    pinnedByUserId: userId,
                    chatId,
                    messageId,
                },
                select: {
                    id: true,
                    pinnedByUserId: true,
                    chatId: true,
                    messageId: true,
                },
            });
            this.logger.debug(
                `[PIN] pinnedMessage.create: ${Date.now() - t2}ms`,
            );

            if (!chatInfo) throw new NotFoundException('Chat not found');

            const socketPayload = {
                chatId,
                messageId: message.id,
                actor: {
                    id: userId,
                    username,
                },
            };

            // Fire socket events + notification in background
            const t3 = Date.now();

            if (chatInfo.isGroup) {
                this.chatGateway.server
                    .to(`chat_${chatId}`)
                    .emit('pin_added', socketPayload);

                if (message.senderId !== userId) {
                    // (fire-and-forget)
                    this.notificationService
                        .createNotification(userId, chatId, {
                            receiverId: message.senderId,
                            type: NotificationType.MESSAGE_PINNED,
                            data: {
                                messageId,
                            },
                        })
                        .catch((err) =>
                            this.logger.error('Notification error:', err),
                        );
                }
            } else {
                const otherParticipant = chatInfo.participants[0];

                if (otherParticipant) {
                    this.chatGateway.server
                        .to(`chat_${chatId}`)
                        .emit('pin_added', socketPayload);

                    // (fire-and-forget)
                    this.notificationService
                        .createNotification(userId, chatId, {
                            receiverId: otherParticipant.userId,
                            type: NotificationType.MESSAGE_PINNED,
                            data: {
                                messageId,
                            },
                        })
                        .catch((err) =>
                            this.logger.error('Notification error:', err),
                        );
                }
            }
            this.logger.debug(`[PIN] Socket events: ${Date.now() - t3}ms`);

            // Clear cache (parallel if possible)
            const t4 = Date.now();
            await Promise.all([
                this.redisService.del(`chat:${chatId}:messages`),
                this.redisService.del(`chat:${chatId}:messages:pinned`),
            ]);

            this.logger.debug(`[PIN] Redis del: ${Date.now() - t4}ms`);

            const totalTime = Date.now() - startTime;
            this.logger.log(`[PIN] TOTAL TIME: ${totalTime}ms`);

            return { messageId, chatId };
        } catch (error) {
            this.logger.error(
                `[PIN] Error after ${Date.now() - startTime}ms`,
                error,
            );
            if (error instanceof PrismaClientKnownRequestError) {
                if (error.code === 'P2002') {
                    throw new ConflictException('Message is already pinned');
                }
            }
            throw error;
        }
    }

    async unpinMessage(userId: string, chatId: string, messageId: string) {
        const startTime = Date.now();
        this.logger.debug('[UNPIN] Starting unpinMessage');

        const t1 = Date.now();

        const result = await this.databaseService.$transaction(async (tx) => {
            //run in parallel
            const [membership, pinnedRecord] = await Promise.all([
                tx.participant.findUnique({
                    where: {
                        userId_chatId: { userId, chatId },
                    },
                    select: { id: true },
                }),
                tx.pinnedMessage.findFirst({
                    where: { chatId, messageId },
                    select: {
                        id: true,
                        pinnedByUserId: true,
                        message: {
                            select: {
                                senderId: true,
                            },
                        },
                    },
                }),
            ]);
            if (!membership)
                throw new ForbiddenException(
                    'You are not a participant of this chat',
                );

            if (!pinnedRecord)
                throw new NotFoundException('This message is not pinned');

            // allow only to pin-creator or message-owner
            const isPinCreator = pinnedRecord.pinnedByUserId === userId;
            const isMessageOwner = pinnedRecord.message.senderId === userId;

            if (!isPinCreator && !isMessageOwner)
                throw new ForbiddenException(
                    'You can only unpin your own pins or your own messages',
                );

            await tx.pinnedMessage.delete({
                where: {
                    id: pinnedRecord.id,
                },
            });

            return { messageId, chatId };
        });
        this.logger.debug(
            `[UNPIN] Transaction (all DB ops): ${Date.now() - t1}ms`,
        );

        // Emit socket event + clear cache in parallel (non-blocking)
        const t2 = Date.now();
        await Promise.all([
            // socket emit(sync, fast)
            Promise.resolve(
                this.chatGateway.server
                    .to(`chat_${chatId}`)
                    .emit('pin_removed', { messageId }),
            ),
            // clear cache
            this.redisService.del(`chat:${chatId}:messages`),
            this.redisService.del(`chat:${chatId}:messages:pinned`),
        ]);
        this.logger.debug(`[UNPIN] socket + cache: ${Date.now() - t2}ms`);

        const totalTime = Date.now() - startTime;
        this.logger.log(`[UNPIN] TOTAL TIME: ${totalTime}ms`);

        return result;
    }

    // resuable function
    async verifyMembership(userId: string, chatId: string) {
        const membership = await this.databaseService.participant.findUnique({
            where: {
                userId_chatId: {
                    userId,
                    chatId,
                },
            },
            select: { id: true },
        });

        if (!membership)
            throw new ForbiddenException(
                'You are not a participant of this chat',
            );
    }
}
