import { ConnectedSocket, MessageBody, OnGatewayConnection, OnGatewayDisconnect, OnGatewayInit, SubscribeMessage, WebSocketGateway, WebSocketServer } from '@nestjs/websockets';
import { Socket, Server } from 'socket.io';
import { SendMessageDto } from './dto/sendMessage.dto';
import { MessageService } from 'src/message/message.service';
import { ChatService } from './chat.service';
import { PresenceService } from 'src/presence/presence.service';
import { JwtService } from '@nestjs/jwt';
import { UsePipes, ValidationPipe } from '@nestjs/common';
import { TypingDto } from './dto/typing.dto';

@WebSocketGateway({
  cors: {
    origin: '*',
  }
})
export class ChatGateway implements OnGatewayInit, OnGatewayConnection, OnGatewayDisconnect {
  @WebSocketServer()
  server: Server;

  constructor(
    private readonly jwtService: JwtService,
    private readonly messageService: MessageService,
    private readonly chatService: ChatService,
    private readonly presenceService: PresenceService,

  ) { }

  async afterInit(server: Server) {
    server.use((socket, next) => {
      try {
        const token = socket.handshake.auth?.token;
        if (!token) return next(new Error('Missing token'));

        const payload = this.jwtService.verify(token, {
          secret: process.env.JWT_ACCESS_SECRET,
        });

        socket.data.user = { sub: payload.sub };
        next();

      } catch (error) {
        next(new Error("Unauthorized"))
      }
    })

  }

  async handleConnection(client: Socket) {
    const userId = client.data.user.sub; // from ws-jwt guard
    if (!userId) {
      client.disconnect();
      return;
    }
    console.log("Client connected: ", userId)

    // set presence Status
    this.presenceService.setOnline(userId);

    // Join a personal room so others can find me
    // This allows the server to send messages specifically to this user later
    await client.join(`user_${userId}`);

    const chatsIds = await this.chatService.getMyChatsIds(userId);

    for (const chatId in chatsIds) {
      client.join(`chat_${chatId}`)
    }
    console.log("User: ", userId, ` joined ${chatsIds.length} rooms: `, chatsIds);

    const friendsIds = await this.chatService.getMyFriendsIds(userId);
    const onlineFriends = new Set<string>()

    for (const friId in friendsIds) {
      onlineFriends.add(`user_${friId}`)
    }


    // Send presence update ONLY to relevant users
    // 'to(Array)' sends the message to all those specific rooms at once
    const friendRooms = Array.from(onlineFriends);

    if (friendRooms.length > 0) {
      this.server.to(friendRooms).emit('presence_update', {
        userId,
        online: true,
        lastSeen: null,
      })
    }
  }

  async handleDisconnect(client: Socket) {
    const userId = client.data.user.sub; //from ws-jwt guard
    if (!userId) return;

    console.log("Client Disconnected: ", client.id)

    //set presence Status
    this.presenceService.setOffline(userId);

    const friendsIds = await this.chatService.getMyFriendsIds(userId);
    const onlineFriends = new Set<string>()

    for (const friId in friendsIds) {
      onlineFriends.add(`user_${friId}`)
    }

    const friendRooms = Array.from(onlineFriends);
    if (friendRooms.length > 0) {
      this.server.to(friendRooms).emit('presence_update', {
        userId,
        online: false,
        lastSeen: Date.now()
      })

    }
  }


  @SubscribeMessage('send_message')
  async handleSendMessage(@ConnectedSocket() client: Socket, @MessageBody() sendMessageDto: SendMessageDto) {
    const senderId = client.data.user.sub;

    // SAVE to DB 
    // This is REQURIED ********
    await this.messageService.sendMessage(senderId, sendMessageDto)

    const message = {
      ...sendMessageDto,
      senderId,
      createdAt: new Date(),
    }

    // emit to the ROOM(clients/participants will join the Room using chatId)
    this.server.to(`chat_${sendMessageDto.chatId}`).emit('new_message', message)
    console.log("NEW MESSAGE: ", message)
  }

  @SubscribeMessage('join_chat')
  handleJoinChat(@ConnectedSocket() client: Socket, @MessageBody() chatId: string) {
    client.join(chatId)
  }

  @SubscribeMessage('typing')
  @UsePipes(new ValidationPipe())
  async hanldeTyping(@ConnectedSocket() client: Socket, @MessageBody() payload: TypingDto) {
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
    })


    // frontend
    // let typingTimeout = null;
    // function onKeyDown() {
    //   // 1. If not already typing, tell server we started
    //   if (!isTyping) {
    //     socket.emit('typing', { conversationId: 1, isTyping: true });
    //     isTyping = true;
    //   }

    //   // 2. Clear previous timeout
    //   clearTimeout(typingTimeout);

    //   // 3. Set a new timeout to stop typing after 2 seconds of inactivity
    //   typingTimeout = setTimeout(() => {
    //     socket.emit('typing', { conversationId: 1, isTyping: false });
    //     isTyping = false;
    //   }, 2000);
    // }

  }
}
