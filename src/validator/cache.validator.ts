import { Injectable } from '@nestjs/common';
import { ChatListItemDto, FullChatDto } from 'src/chat/dto/chat-response.dto';
import { GetMessagesResponseDto } from 'src/chat/dto/message-response.dto';

@Injectable()
export class CacheValidator {
    validateChatsListCache(data: unknown): data is ChatListItemDto[] {
        return Boolean(data && Array.isArray(data));
    }
    validateFullChatCache(data: unknown): data is FullChatDto {
        return Boolean(
            data &&
            typeof data === 'object' &&
            'participants' in data &&
            Array.isArray(data.participants),
        );
    }
    validateMessagesCache(data: unknown): data is GetMessagesResponseDto {
        return Boolean(
            data &&
            typeof data === 'object' &&
            'meta' in data &&
            'messages' in data &&
            Array.isArray(data.messages),
        );
    }
    validatePinnedMessagesCache(data: unknown): data is GetMessagesResponseDto {
        return Boolean(
            data &&
            typeof data === 'object' &&
            'meta' in data &&
            'messages' in data &&
            Array.isArray(data.messages),
        );
    }
}
