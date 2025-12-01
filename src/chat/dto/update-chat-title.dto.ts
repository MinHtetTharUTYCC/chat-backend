import { Transform } from "class-transformer";
import { IsString, MaxLength } from "class-validator";
import { ApiProperty } from "@nestjs/swagger";

export class UpdateChatTitleDto {
    @ApiProperty({
        description: 'New title for the chat',
        maxLength: 30,
        example: 'Updated Group Chat Title'
    })
    @IsString({ message: 'Title must be a string' })
    @MaxLength(30, { message: 'Title is too long(30 max chars)' })
    @Transform(({ value }) => typeof value === 'string' ? value.trim() : value)
    title: string;
}