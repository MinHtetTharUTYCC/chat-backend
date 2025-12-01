import { IsNotEmpty, MinLength } from "class-validator";
import { ApiProperty } from "@nestjs/swagger";

export class SendMessageDto {
    @ApiProperty({
        description: 'Content of the message to send',
        example: 'Hello, how are you?'
    })
    @IsNotEmpty()
    content: string;
}