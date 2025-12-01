import { IsBoolean, IsNotEmpty, IsString } from "class-validator";
import { ApiProperty } from "@nestjs/swagger";

export class TypingDto {
    @ApiProperty({
        description: 'ID of the chat where typing is occurring',
        example: 'chat-id-123'
    })
    @IsString()
    @IsNotEmpty()
    chatId: string;

    @ApiProperty({
        description: 'Whether the user is currently typing',
        example: true
    })
    @IsBoolean()
    isTyping: boolean;
}