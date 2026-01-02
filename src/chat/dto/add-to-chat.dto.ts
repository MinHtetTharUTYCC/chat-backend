import { ApiProperty } from '@nestjs/swagger';
import { ArrayMaxSize, ArrayMinSize, IsArray, IsString } from 'class-validator';

export class AddToChatDto {
    @ApiProperty({
        description: 'Array of user IDs to add to the chat',
        type: [String],
        example: ['user-id-1', 'user-id-2'],
    })
    @IsArray()
    @IsString({ each: true })
    @ArrayMinSize(1)
    @ArrayMaxSize(100)
    userIds: string[];
}
