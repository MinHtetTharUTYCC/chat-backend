import { ApiProperty } from '@nestjs/swagger';
import {
    ArrayMaxSize,
    ArrayMinSize,
    IsArray,
    IsNotEmpty,
    IsString,
} from 'class-validator';

export class InviteToChatDto {
    @ApiProperty({
        description: 'Array of user ids to invite to the chat',
        type: [String],
        example: ['user-id-1', 'user-id-2'],
    })
    @IsArray()
    @IsString({ each: true })
    @IsNotEmpty({ each: true })
    @ArrayMinSize(1)
    @ArrayMaxSize(100)
    userIds: string[];
}
