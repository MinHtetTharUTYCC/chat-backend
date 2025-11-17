import { UseGuards } from '@nestjs/common';
import { ConnectedSocket, MessageBody, SubscribeMessage, WebSocketGateway, WebSocketServer } from '@nestjs/websockets';
import { Socket, Server } from 'socket.io';
import { WSJwtGuard } from 'src/auth/guards/ws-jwt.guard';
import { SendMessageDto } from './dto/sendMessage.dto';
import { MessageService } from 'src/message/message.service';

@UseGuards(WSJwtGuard) //protect all WS events
@WebSocketGateway({
  cors: {
    origin: '*',
  }
})
export class ChatGateway {
  @WebSocketServer()
  server: Server;

  constructor(private readonly messageService: MessageService) { }

  handleConnection(client: Socket) {

    const user = client.data.user.sub; // from guard
    console.log("Client connected: ", user?.id)
  }

  handleDisconnect(client: Socket) {
    console.log("Client Disconnected: ", client.id)
  }


  @SubscribeMessage('send_message')
  async handleSendMessage(@ConnectedSocket() client: Socket, @MessageBody() sendMessageDto: SendMessageDto) {
    const senderId = client.data.user.sub;

    // SAVE to DB 
    // This is REQURIED ********
    // await this.messageService.sendMessage(senderId, sendMessageDto)

    const message = {
      ...sendMessageDto,
      senderId,
      createdAt: new Date(),
    }

    // emit to the ROOM(clients/participants will join the Room using chatId)
    this.server.to(sendMessageDto.chatId).emit('new_message', message)
  }

  @SubscribeMessage('join_chat')
  handleJoinChat(@ConnectedSocket() client: Socket, @MessageBody() chatId: string) {
    client.join(chatId)
  }
}
