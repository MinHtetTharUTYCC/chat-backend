import { IsNotEmpty, IsString } from "class-validator";
import { ApiProperty } from "@nestjs/swagger";

export class EditMessageDto {
    @ApiProperty({
        description: 'New content for the message',
        example: 'This is the updated message content'
    })
    @IsString()
    @IsNotEmpty()
    content: string;
}