import { ForbiddenException, Injectable } from '@nestjs/common';
import { DatabaseService } from 'src/database/database.service';

@Injectable()
export class SearchService {
    constructor(private readonly databaseService: DatabaseService) { }

    async searchGolbal(userId: string, query: string) {
        const [users, groups] = await Promise.all([
            //users
            this.databaseService.user.findMany({
                where: {
                    OR: [
                        { username: { contains: query, mode: 'insensitive' } },
                        { email: { contains: query, mode: 'insensitive' } }
                    ],
                    id: { not: userId } //exclude self
                },
                select: {
                    id: true,
                    username: true,
                },
                take: 20,
            }),

            // groups(user is in)
            this.databaseService.chat.findMany({
                where: {
                    isGroup: true,
                    title: { contains: query, mode: 'insensitive' },
                    participants: {
                        some: {
                            userId,//only groups that user belongs to
                        }
                    }
                },
                select: {
                    id: true,
                    title: true,
                },
                take: 20,
            })
        ]);

        return { users, groups }

    }

    async searchMessageInChat(userId: string, chatId: string, query: string) {
        // verify member
        const membership = await this.databaseService.participant.findUnique({
            where: {
                userId_chatId: {
                    userId,
                    chatId
                }
            }
        })
        if (!membership) throw new ForbiddenException("You are not a member of this chat")

        //search
        const messages = await this.databaseService.message.findMany({
            where: {
                chatId,
                content: { contains: query, mode: 'insensitive' }
            },
            include: {
                sender: {
                    select: {
                        id: true,
                        username: true,
                    }
                }
            },
            orderBy: {
                createdAt: 'desc'
            },
            take: 50,
        });

        return messages;


    }

}
