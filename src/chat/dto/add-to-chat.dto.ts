import { ArrayMinSize, IsArray, IsString } from "class-validator";

export class AddToChatDto {
    @IsArray()
    @IsString({ each: true })
    @ArrayMinSize(1)
    userIds: string[];
}