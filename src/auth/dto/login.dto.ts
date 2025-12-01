import { ApiProperty } from "@nestjs/swagger";
import { IsEmail, MinLength } from "class-validator";

export class LoginDto {
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