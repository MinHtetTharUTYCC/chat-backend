import { ArrayMinSize, IsArray, IsString } from "class-validator";

export class RemoveFromGroupChatDto {
    @IsArray()
    @IsString({ each: true })
    @ArrayMinSize(1)
    userIds: string[];
}