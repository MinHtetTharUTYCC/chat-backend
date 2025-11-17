import { IsNotEmpty } from "class-validator";

export class StartChatDto {
    @IsNotEmpty()
    otherUserId: string;
}