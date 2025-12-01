import { ApiProperty } from "@nestjs/swagger";
import { IsEmail, isEmail, IsNotEmpty, MinLength } from "class-validator";

export class RegisterDto {
    @ApiProperty({
        description: 'Uername of the user',
        example: 'user111',
    })
    @IsNotEmpty()
    username: string;

    @ApiProperty({
        description: 'The email address of the user',
        example: 'john.doe@example.com',
    })
    @IsEmail()
    email: string;

    @ApiProperty({
        description: 'The password (minimum 6 characters)',
        example: 'strongpassword123',
        minLength: 6,
    })
    @MinLength(6)
    password: string;
}