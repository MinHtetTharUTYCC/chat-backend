import { BadRequestException, Injectable, NotFoundException } from '@nestjs/common';
import { DatabaseService } from 'src/database/database.service';

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



}
