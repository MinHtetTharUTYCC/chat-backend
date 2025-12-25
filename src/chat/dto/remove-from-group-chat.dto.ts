import { ArrayMinSize, IsArray, IsString } from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';

export class RemoveFromGroupChatDto {
    @ApiProperty({
        description: 'Array of user IDs to remove from the group chat',
        type: [String],
        example: ['user-id-1', 'user-id-2'],
    })
    @IsArray()
    @IsString({ each: true })
    @ArrayMinSize(1)
    userIds: string[];
}
