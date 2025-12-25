import { IsNotEmpty, IsString, MinLength } from 'class-validator';

export class UpdateUserDto {
    @IsString()
    @IsNotEmpty()
    @MinLength(2)
    username: string;
}
