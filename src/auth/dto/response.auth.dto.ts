import { ApiProperty } from '@nestjs/swagger';

export class UserInfoDto {
    @ApiProperty({
        description: 'User ID',
        example: 'user123',
    })
    id: string;

    @ApiProperty({
        description: 'Username',
        example: 'john_doe',
    })
    username: string;

    @ApiProperty({
        description: 'Email address',
        example: 'john@example.com',
    })
    email: string;
}

export class LoginResponseDto {
    @ApiProperty({
        description: 'JWT access token for API authorization',
        example: 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...',
    })
    accessToken: string;

    @ApiProperty({
        description: 'User information',
        type: UserInfoDto,
    })
    user: UserInfoDto;
}

export class RegisterResponseDto {
    @ApiProperty({
        description: 'JWT access token for API authorization',
        example: 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...',
    })
    accessToken: string;

    @ApiProperty({
        description: 'User information',
        type: UserInfoDto,
    })
    user: UserInfoDto;
}

export class RefreshResponseDto {
    @ApiProperty({
        description: 'New JWT access token',
        example: 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...',
    })
    accessToken: string;
}

export class LogoutResponseDto {
    @ApiProperty({
        description: 'Logout operation success status',
        example: true,
    })
    success: boolean;

    @ApiProperty({
        description: 'Logout message',
        example: 'Logged out successfully',
    })
    message: string;
}
