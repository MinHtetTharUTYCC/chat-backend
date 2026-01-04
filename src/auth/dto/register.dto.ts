import { ApiProperty } from '@nestjs/swagger';
import { IsEmail, IsString, MaxLength, MinLength } from 'class-validator';

export class RegisterDto {
    @ApiProperty({
        description: 'Username (3-50 characters)',
        example: 'user111',
        minLength: 3,
        maxLength: 50,
    })
    @IsString()
    @MinLength(3)
    @MaxLength(50)
    username: string;

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
