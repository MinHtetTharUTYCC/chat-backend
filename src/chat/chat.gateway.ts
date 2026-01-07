import {
    ConnectedSocket,
    MessageBody,
    OnGatewayConnection,
    OnGatewayDisconnect,
    OnGatewayInit,
    SubscribeMessage,
    WebSocketGateway,
    WebSocketServer,
} from '@nestjs/websockets';
import { Socket, Server } from 'socket.io';
import { ChatService } from './chat.service';
import { PresenceService } from '../presence/presence.service';
import { JwtService } from '@nestjs/jwt';
import {
    forwardRef,
    Inject,
    Injectable,
    Logger,
    UsePipes,
    ValidationPipe,
} from '@nestjs/common';
import { TypingDto } from './dto/typing.dto';
import { JwtPayloadOutput } from '../auth/interfaces/jwt-payload.interface';

@Injectable()
@WebSocketGateway({
    cors: {
        origin: [process.env.FRONTEND_URL || 'http://localhost:9000'],
        // origin: '*',
        credentials: true,
    },
})
export class ChatGateway
    implements OnGatewayInit, OnGatewayConnection, OnGatewayDisconnect
{
    @WebSocketServer()
    public server: Server; //public: to use by other services
    private readonly logger = new Logger(ChatGateway.name);

    constructor(
        private readonly jwtService: JwtService,
        @Inject(forwardRef(() => ChatService))
        private readonly chatService: ChatService,
        private readonly presenceService: PresenceService,
    ) {}

    afterInit(server: Server) {
        server.use((socket, next) => {
            try {
                const token = socket.handshake.auth?.token as
                    | string
                    | undefined;
                if (!token) return next(new Error('Missing token'));

                const payload = this.jwtService.verify<JwtPayloadOutput>(
                    token,
                    {
                        secret: process.env.JWT_ACCESS_SECRET,
                    },
                );

                socket.data.user = {
                    sub: payload.sub,
                    username: payload.username,
                };
                next();
            } catch {
                next(new Error('Unauthorized'));
            }
        });
    }

    async handleConnection(client: Socket) {
        const user = (client.data as { user?: { sub?: string } }).user;
        const userId = user?.sub;
        if (!userId) {
            this.logger.warn('Connection attempt without valid user data');
            return;
        }

        this.logger.log(`Client Connected: ${userId}`);

        //join personal room
        await client.join(`user_${userId}`);

        //join chat rooms
        const chatRooms = await this.getUserChatRooms(userId);
        chatRooms.forEach((chatRoomId) => client.join(chatRoomId));
    }

    async handleDisconnect(client: Socket) {
        const user = (client.data as { user?: { sub?: string } }).user;
        const userId = user?.sub;
        if (!userId) {
            return;
        }

        this.logger.log(`Client Disconnected: ${userId}`);

        await this.setUserOffline(userId);
    }

    @SubscribeMessage('user_online')
    async handleUserOnline(@ConnectedSocket() client: Socket) {
        const userId = client.data.user.sub;
        if (!userId) return;

        //Redis
        await this.presenceService.setOnline(userId);

        //emit to all relevant users
        const chatRooms = await this.getUserChatRooms(userId);
        if (chatRooms.length > 0) {
            this.server.to(chatRooms).emit('presence_update', {
                userId,
                online: true,
                lastSeen: null,
            });
        }

        return { status: 'online' };
    }

    @SubscribeMessage('user_offline')
    async handleUserOffline(@ConnectedSocket() client: Socket) {
        const user = (client.data as { user?: { sub?: string } }).user;
        const userId = user?.sub;
        if (!userId) {
            return { status: 'error' };
        }

        this.logger.debug(`Received user_offline: ${userId}`);

        await this.setUserOffline(userId);

        return { status: 'offline' };
    }

    @SubscribeMessage('heartbeat')
    async handleHeartbeat(@ConnectedSocket() client: Socket) {
        const userId = client.data.user.sub;

        if (!userId) return { status: 'error' };

        // Redis: Refresh TTL
        await this.presenceService.heartbeating(userId);

        return { status: 'ok' };
    }

    @SubscribeMessage('join_chat')
    handleJoinChat(
        @ConnectedSocket() client: Socket,
        @MessageBody() chatId: string,
    ) {
        client.join(chatId);
        return { status: 'success', message: `Joined chat ${chatId}` };
    }

    @SubscribeMessage('typing')
    @UsePipes(new ValidationPipe())
    async hanldeTyping(
        @ConnectedSocket() client: Socket,
        @MessageBody() payload: TypingDto,
    ) {
        const userId = client.data.user.sub;
        const roomName = `chat_${payload.chatId}`;

        // ensures user is joining the room
        const rooms = client.rooms;
        if (!rooms.has(roomName)) return;

        // .volatile: "if the network is busy, drop this packet"(not critical enough)
        client.to(roomName).volatile.emit('user_typing', {
            userId,
            chatId: payload.chatId,
            isTyping: payload.isTyping,
        });
    }

    private async setUserOffline(userId: string) {
        // Redis
        this.presenceService.setOffline(userId);

        //Emit
        const chatRooms = await this.getUserChatRooms(userId);
        if (chatRooms.length > 0) {
            this.server.to(chatRooms).emit('presence_update', {
                userId,
                online: false,
                lastSeen: Date.now().toString(),
            });
        }
    }

    async getUserChatRooms(userId: string): Promise<string[]> {
        const chatIds = await this.chatService.getMyChatsIds(userId);

        const chatRooms = chatIds.map((chatId) => `chat_${chatId}`);

        return chatRooms;
    }
}

