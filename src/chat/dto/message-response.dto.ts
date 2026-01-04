import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';

export class MessageMetaDto {
    @ApiPropertyOptional({ description: 'Cursor for loading older messages' })
    nextCursor?: string | null;

    @ApiPropertyOptional({ description: 'Cursor for loading newer messages' })
    prevCursor?: string | null;

    @ApiProperty({ description: 'Whether there are more newer messages' })
    hasMoreNext: boolean;

    @ApiProperty({ description: 'Whether there are more older messages' })
    hasMorePrev: boolean;

    @ApiPropertyOptional({
        description: 'Anchor message ID if jumping to specific message',
    })
    anchorMessageId?: string;
}

export class MessageWithPinDto {
    @ApiProperty({ description: 'Message ID' })
    id: string;

    @ApiProperty({ description: 'Message content' })
    content: string;

    @ApiProperty({ description: 'Chat ID' })
    chatId: string;

    @ApiProperty({ description: 'Sender ID' })
    senderId: string;

    @ApiProperty({ description: 'Message creation date' })
    createdAt: Date;

    @ApiProperty({ description: 'Message update date' })
    updatedAt: Date;

    @ApiProperty()
    sender: {
        id: string;
        username: string;
    };

    @ApiProperty({ description: 'Whether message is pinned' })
    isPinned: boolean;

    @ApiPropertyOptional({ description: 'ID of user who pinned this message' })
    pinnedByUserId?: string | null;
}

export class GetMessagesResponseDto {
    @ApiProperty({ isArray: true, type: MessageWithPinDto })
    messages: MessageWithPinDto[];

    @ApiProperty({ type: MessageMetaDto })
    meta: MessageMetaDto;
}

export class SendMessageResponseDto {
    @ApiProperty({ description: 'Message ID' })
    id: string;

    @ApiProperty({ description: 'Message content' })
    content: string;

    @ApiProperty({ description: 'Chat ID' })
    chatId: string;

    @ApiProperty({ description: 'Sender ID' })
    senderId: string;

    @ApiProperty({ description: 'Message creation date' })
    createdAt: Date;

    @ApiProperty({ description: 'Message update date' })
    updatedAt: Date;

    @ApiProperty()
    sender: {
        id: string;
        username: string;
    };
}

export class DeleteMessageResponseDto {
    @ApiProperty({ description: 'Message ID' })
    messageId: string;

    @ApiProperty({ description: 'Chat ID' })
    chatId: string;
}

export class EditMessageResponseDto {
    @ApiProperty({ description: 'Message ID' })
    messageId: string;

    @ApiProperty({ description: 'Chat ID' })
    chatId: string;

    @ApiProperty({ description: 'Updated message content' })
    content: string;
}

export class PinnedMessageDetailDto {
    @ApiProperty({ description: 'Message ID' })
    id: string;

    @ApiProperty({ description: 'Message content' })
    content: string;

    @ApiProperty({ description: 'Message sender ID' })
    senderId: string;
}

export class PinnedMessageDto {
    @ApiProperty({ description: 'Pinned message record ID' })
    id: string;

    @ApiProperty({ description: 'Chat ID' })
    chatId: string;

    @ApiProperty({ description: 'Message ID' })
    messageId: string;

    @ApiProperty({ description: 'User who pinned this message' })
    pinnedByUserId: string;

    @ApiProperty()
    user: {
        id: string;
        username: string;
    };

    @ApiProperty({ type: PinnedMessageDetailDto })
    message: PinnedMessageDetailDto;

    @ApiProperty({ description: 'Pin creation date' })
    createdAt: Date;
}

export class GetPinnedMessagesResponseDto {
    @ApiProperty({ isArray: true, type: PinnedMessageDto })
    pinnedMessages: PinnedMessageDto[];

    @ApiProperty({ type: MessageMetaDto })
    meta: MessageMetaDto;
}

export class PinMessageResponseDto {
    @ApiProperty({ description: 'Message ID' })
    messageId: string;

    @ApiProperty({ description: 'Chat ID' })
    chatId: string;
}

export class UnpinMessageResponseDto {
    @ApiProperty({ description: 'Message ID' })
    messageId: string;

    @ApiProperty({ description: 'Chat ID' })
    chatId: string;
}
