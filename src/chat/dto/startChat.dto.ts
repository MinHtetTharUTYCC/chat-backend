import { IsNotEmpty } from "class-validator";
import { ApiProperty } from "@nestjs/swagger";

export class StartChatDto {
    @ApiProperty({
        description: 'User ID of the person to start a chat with',
        example: 'user-id-123'
    })
    @IsNotEmpty()
    otherUserId: string;
}