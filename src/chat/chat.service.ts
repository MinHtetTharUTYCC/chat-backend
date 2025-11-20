import { BadRequestException, ConflictException, ForbiddenException, Injectable, NotFoundException } from '@nestjs/common';
import { DatabaseService } from 'src/database/database.service';
import { UpdateChatTitleDto } from './dto/update-chat-title.dto';
import { title } from 'process';
import { AddToChatDto } from './dto/add-to-chat.dto';
import { CreateGroupChatDto } from './dto/create-group-chat.dto';
import { RemoveFromGroupChatDto } from './dto/remove-from-group-chat.dto';

@Injectable()
export class ChatService {
    constructor(private readonly databaseService: DatabaseService) { }

    async getChats(userId: string) {
        return this.databaseService.chat.findMany({
            where: {
                participants: {
                    some: { userId }
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
            orderBy: {
                updatedAt: 'desc',
            }
        })
    }

    async startChat(userId: string, otherUserId: string) {
        if (userId === otherUserId) {
            throw new BadRequestException("You cannot chat with yourself")
        }

        // check if other user is valid
        const otherUser = await this.databaseService.user.findUnique({
            where: { id: otherUserId },
            select: { id: true }
        })
        if (!otherUser) throw new NotFoundException("User not found")

        //check if chat exists already
        const existingChat = await this.databaseService.chat.findFirst({
            where: {
                // participants: {
                //     every: {
                //         userId: { in: [userId, otherUserId] }
                //     }
                // }
                participants: {
                    some: { userId }
                },
                AND: [
                    {
                        participants: {
                            some: {
                                userId: otherUserId,
                            }
                        }
                    },
                    //sure it's a DM, not GroupChat
                    {
                        isGroup: false,
                    }
                ]
            },
            include: {
                participants: {
                    include: {
                        user: {
                            select: {
                                id: true,
                                username: true,
                                email: true,
                            }
                        }
                    }
                },
                messages: {
                    orderBy: {
                        createdAt: 'desc',
                    },
                    take: 1,
                }
            }
        })

        if (existingChat) return existingChat;

        //create new chat
        const newChat = await this.databaseService.chat.create({
            data: {
                participants: {
                    create: [
                        { userId },
                        { userId: otherUserId }
                    ]
                }
            },
            include: {
                participants: {
                    include: {
                        user: {
                            select: {
                                id: true,
                                username: true,
                                email: true,
                            }
                        }
                    }
                },
                messages: {
                    orderBy: {
                        createdAt: 'desc',
                    },
                    take: 1,
                }
            }
        })

        return newChat;
    }


    async getMyFriendsIds(userId: string) {
        const chats = await this.databaseService.chat.findMany({
            where: {
                participants: {
                    some: { userId }
                }
            },
            select: {
                participants: {
                    select: { userId: true }
                }
            }
        });

        // extract all participants ID except me
        const friendIds = new Set<string>();

        for (const chat of chats) {
            for (const participant of chat.participants) {
                if (participant.userId !== userId) {
                    friendIds.add(participant.userId);
                }
            }
        }

        return Array.from(friendIds);
    }


    async getMyChatsIds(userId: string) {
        const chats = await this.databaseService.chat.findMany({
            where: {
                participants: {
                    some: {
                        userId,
                    }
                }
            },
            select: {
                id: true,
            }
        });

        return chats.map(chat => chat.id);
    }


    async getChatInfo(chatId: string) {
        return this.databaseService.chat.findUnique({
            where: { id: chatId },
            include: {
                participants: {
                    select: {
                        id: true,
                        userId: true,
                        user: {
                            select: {
                                username: true,
                            }
                        }
                    }
                }
            }
        })
    }

    async isParticipant(userId: string, chatId: string): Promise<boolean> {
        const count = await this.databaseService.chat.count({
            where: {
                id: chatId,
                participants: {
                    some: { userId }
                }
            },
        });

        return count > 0;
    }

    async updateChatTitle(userId: string, chatId: string, dto: UpdateChatTitleDto) {
        const chat = await this.databaseService.chat.findUnique({
            where: { id: chatId, participants: { some: { userId } } },
            select: {
                id: true,
                isGroup: true,
            }
        })

        if (!chat) throw new NotFoundException("Chat not found")

        if (!chat.isGroup) throw new ForbiddenException("Direct messages cannot have custom titles")

        const dataToUpdate = {
            title: dto.title === '' ? null : dto.title,
        }

        await this.databaseService.chat.update({
            where: { id: chatId },
            data: dataToUpdate,
        });

        return {
            success: true,
            chatId,
            title: dto.title,
        }
    }

    async createGroupChat(userId: string, dto: CreateGroupChatDto) {
        // Set: for removing dupblicates
        const uniqueUserIds = new Set<string>([
            ...dto.userIds,
            userId,
        ])
        const usersToParticipate = Array.from(uniqueUserIds).map(id => ({ userId: id }))

        if (usersToParticipate.length < 2) {
            throw new BadRequestException("A group must have at least 2 participants")
        }

        const groupChat = await this.databaseService.chat.create({
            data: {
                isGroup: true,
                title: dto.title || 'New Group',
                participants: {
                    create: usersToParticipate,
                }
            },
            include: {
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
            }
        });

        return groupChat;
    }

    async addToChat(userId: string, chatId: string, dto: AddToChatDto) {
        const chat = await this.databaseService.chat.findUnique({
            where: { id: chatId },
            select: {
                isGroup: true,
                participants: {
                    where: {
                        userId,
                    },
                    select: {
                        id: true
                    }
                }
            }
        })
        if (!chat) throw new NotFoundException("Chat not found")
        if (chat.participants.length === 0) throw new ForbiddenException("You are not a member of this chat")
        if (!chat.isGroup) throw new ForbiddenException("You cannot add members to 1-on-1 chat. Create a group instead.")

        const newUsersToParticipate = dto.userIds.map((id) => ({ userId: id }));

        try {
            const updatedChat = await this.databaseService.chat.update({
                where: {
                    id: chatId,
                },
                data: {
                    participants: {
                        create: newUsersToParticipate,
                    }
                },
                include: {
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
                }
            });

            return updatedChat;
        } catch (error) {
            if (error.code === 'P2025') {
                throw new BadRequestException("One or more users do not exist")
            }
            throw error;
        }
    }

    async joinGroup(userId: string, chatId: string) {
        const existingParticipant = await this.databaseService.participant.findUnique({
            where: {
                userId_chatId: {
                    userId,
                    chatId
                }
            },
            select: {
                id: true,
            }
        });
        if (existingParticipant) throw new ConflictException("Already joined the chat");

        const participant = await this.databaseService.participant.create({
            data: {
                userId,
                chatId
            },
            select: {
                id: true,
                user: {
                    select: {
                        id: true,
                        username: true,
                    }
                }
            }
        });

        return participant;
    }

    async leaveGroup(userId: string, chatId: string) {
        const isParticipant = await this.isParticipant(userId, chatId);
        if (!isParticipant) throw new ForbiddenException("You are not a member of this chat")

        await this.databaseService.participant.delete({
            where: {
                userId_chatId: {
                    userId,
                    chatId,
                }
            },
        });

        return {
            success: true,
            message: 'Successfully leaved the chat'
        }
    }
}
