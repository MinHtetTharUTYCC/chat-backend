import { IsBoolean, IsNotEmpty, IsString } from "class-validator";

export class TypingDto {
    @IsString()
    @IsNotEmpty()
    chatId: string;

    @IsBoolean()
    isTyping: boolean;
}