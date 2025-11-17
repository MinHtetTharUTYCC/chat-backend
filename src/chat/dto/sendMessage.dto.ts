import { IsNotEmpty } from "class-validator";

export class SendMessageDto {
    @IsNotEmpty()
    content: string;

    @IsNotEmpty()
    chatId: string;

}