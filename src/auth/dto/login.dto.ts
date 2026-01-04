import { ApiProperty } from '@nestjs/swagger';
import { IsEmail, IsString, MinLength } from 'class-validator';

export class LoginDto {
    @ApiProperty({
        description: 'User email address',
        example: 'john.doe@example.com',
        format: 'email',
    })
    @IsEmail()
    email: string;

    @ApiProperty({
        description: 'User Password',
        example: 'strongpassword123',
        minLength: 6,
    })
    @IsString()
    @MinLength(6)
    password: string;
}
