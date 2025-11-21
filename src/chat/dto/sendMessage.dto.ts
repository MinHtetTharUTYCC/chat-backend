import { IsNotEmpty, MinLength } from "class-validator";

export class SendMessageDto {
    @IsNotEmpty()
    content: string;
}