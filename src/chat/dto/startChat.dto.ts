import { IsNotEmpty } from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';

export class StartChatDto {
    @ApiProperty({
        description: 'User ID of the person to start a chat with',
        example: 'ckx9q8l9o0001z0f9g8h3abcd',
    })
    @IsNotEmpty()
    otherUserId: string;
}
