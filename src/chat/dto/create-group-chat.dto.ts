import { Transform } from 'class-transformer';
import {
    ArrayMaxSize,
    ArrayMinSize,
    IsArray,
    IsString,
    MaxLength,
} from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';

export class CreateGroupChatDto {
    @ApiProperty({
        description: 'Title of the group chat',
        maxLength: 30,
        example: 'My Group Chat',
    })
    @IsString({ message: 'Title must be a string' })
    @MaxLength(30, { message: 'Title is too long(30 max chars)' })
    @Transform(({ value }: { value: unknown }) =>
        typeof value === 'string' ? value.trim() : value,
    )
    title: string;

    @ApiProperty({
        description: 'Array of user IDs to include in the group chat',
        type: [String],
        example: ['userid1', 'userid2', 'userid3'],
    })
    @IsArray()
    @IsString({ each: true })
    @ArrayMinSize(1)
    @ArrayMaxSize(100)
    userIds: string[];
}
