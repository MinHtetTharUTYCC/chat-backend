import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';

export class UserDto {
    @ApiProperty({ description: 'User ID' })
    id: string;

    @ApiProperty({ description: 'Username' })
    username: string;
}

export class MessageDto {
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

    @ApiProperty({ description: 'Message sender' })
    sender: UserDto;
}

export class ParticipantDto {
    @ApiProperty({ description: 'User information' })
    user: UserDto;
}

export class ChatListItemDto {
    @ApiProperty({ description: 'Chat ID' })
    id: string;

    @ApiProperty({ description: 'Chat title' })
    title: string | null;

    @ApiProperty({ description: 'Whether this is a group chat' })
    isGroup: boolean;

    @ApiProperty({ description: 'Chat creation date' })
    createdAt: Date;

    @ApiProperty({ description: 'Last message update time' })
    lastMessageAt: Date | null;

    @ApiProperty({ description: 'Latest message in the chat' })
    messages: MessageDto[];

    @ApiProperty({ description: 'Chat participants' })
    participants: ParticipantDto[];

    @ApiPropertyOptional({ description: 'Last update date' })
    updatedAt: Date;
}

export class ChatIdDto {
    @ApiProperty({ description: 'Chat ID' })
    id: string;
}

export class FullChatDto {
    @ApiProperty({ description: 'Chat ID' })
    id: string;

    @ApiProperty({ description: 'Chat title' })
    title: string | null;

    @ApiProperty({ description: 'Whether this is a group chat' })
    isGroup: boolean;

    @ApiProperty({ description: 'Chat creation date' })
    createdAt: Date;

    @ApiProperty({ description: 'Whether current user is a participant' })
    isParticipant: boolean;

    @ApiProperty({ isArray: true, type: ParticipantDto })
    participants: ParticipantDto[];
}

export class PreviewChatDto {
    @ApiProperty({ description: 'Chat ID' })
    id: string;

    @ApiProperty({ description: 'Chat title' })
    title: string | null;

    @ApiProperty({ description: 'Whether this is a group chat' })
    isGroup: boolean;

    @ApiProperty({ description: 'Chat creation date' })
    createdAt: Date;

    @ApiProperty({ description: 'Number of participants' })
    participantsCount: number;

    @ApiProperty({ description: 'Whether current user is a participant' })
    isParticipant: boolean;

    @ApiProperty({ isArray: true, type: ParticipantDto })
    participants: ParticipantDto[];
}

export class StartChatResponseDto {
    @ApiProperty({ description: 'Whether old chat exists' })
    oldChatExists: boolean;

    @ApiProperty({ type: ChatListItemDto })
    chat: ChatListItemDto;
}

export class UpdateChatTitleResponseDto {
    @ApiProperty({ description: 'Chat ID' })
    chatId: string;

    @ApiProperty({ description: 'New chat title' })
    title: string | null;
}

export class CreateGroupChatResponseDto {
    @ApiProperty({ description: 'Chat ID' })
    id: string;

    @ApiProperty({ description: 'Group title' })
    title: string | null;

    @ApiProperty({ description: 'Whether this is a group chat' })
    isGroup: boolean;

    @ApiProperty({ description: 'Chat creation date' })
    createdAt: Date;

    @ApiProperty({ description: 'Last message update time' })
    lastMessageAt: Date | null;

    @ApiProperty({ description: 'Latest messages' })
    messages: MessageDto[];

    @ApiProperty({ isArray: true, type: ParticipantDto })
    participants: ParticipantDto[];
}

export class AddToGroupChatResponseDto {
    @ApiProperty({ description: 'Operation success status' })
    success: boolean;

    @ApiProperty({ description: 'Chat ID' })
    chatId: string;

    @ApiProperty({ description: 'Number of members added' })
    addedMembersCount: number;
}

export class InviteToGroupResponseDto {
    @ApiProperty({ description: 'Operation success status' })
    success: boolean;

    @ApiProperty({ description: 'Chat ID' })
    chatId: string;

    @ApiProperty({ description: 'Number of members invited' })
    invitedMembersCount: number;
}

export class JoinGroupResponseDto {
    @ApiProperty({ description: 'Operation success status' })
    success: boolean;

    @ApiProperty({ description: 'Chat ID' })
    chatId: string;
}

export class LeaveGroupResponseDto {
    @ApiProperty({ description: 'Operation success status' })
    success: boolean;

    @ApiProperty({ description: 'Chat ID' })
    chatId: string;
}
