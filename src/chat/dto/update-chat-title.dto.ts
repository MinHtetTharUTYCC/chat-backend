import { Transform } from "class-transformer";
import { IsString, MaxLength } from "class-validator";

export class UpdateChatTitleDto {
    @IsString({ message: 'Title must be a string' })
    @MaxLength(30, { message: 'Title is too long(30 max chars)' })
    @Transform(({ value }) => typeof value === 'string' ? value.trim() : value)
    title: string;
}