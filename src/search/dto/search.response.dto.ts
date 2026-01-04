import { ApiProperty } from '@nestjs/swagger';

export class UserSearchResultDto {
    @ApiProperty({
        description: 'User ID',
        example: 'user123',
    })
    id: string;

    @ApiProperty({
        description: 'Username',
        example: 'john_doe',
    })
    username: string;
}

export class GroupSearchResultDto {
    @ApiProperty({
        description: 'Chat/Group ID',
        example: 'chat123',
    })
    id: string;

    @ApiProperty({
        description: 'Group title/name',
        example: 'Team Alpha',
        nullable: true,
    })
    title: string | null;
}

export class SearchChatsResponseDto {
    @ApiProperty({
        description: 'List of users matching search',
        type: [UserSearchResultDto],
    })
    users: UserSearchResultDto[];

    @ApiProperty({
        description: 'List of groups matching search',
        type: [GroupSearchResultDto],
    })
    groups: GroupSearchResultDto[];
}

export class MessageSearchResultDto {
    @ApiProperty({
        description: 'Message ID',
        example: 'msg123',
    })
    id: string;

    @ApiProperty({
        description: 'Message content',
        example: 'Hello everyone!',
    })
    content: string;

    @ApiProperty({
        description: 'Message creation timestamp',
        example: '2023-01-01T12:00:00.000Z',
    })
    createdAt: Date;

    @ApiProperty({
        description: 'Message sender information',
        type: UserSearchResultDto,
    })
    sender: UserSearchResultDto;
}
