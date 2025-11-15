import { IsNotEmpty } from "class-validator";

export class RefreshDto {
    @IsNotEmpty()
    userId: string;

    @IsNotEmpty()
    token: string;

}