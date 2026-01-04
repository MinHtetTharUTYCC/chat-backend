import { ApiProperty } from '@nestjs/swagger';

export class UserResponseDto {
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

export class UpdateUserResponseDto {
    @ApiProperty({
        description: 'Update operation success status',
        example: true,
    })
    success: boolean;

    @ApiProperty({
        description: 'Updated username',
        example: 'new_username',
    })
    username: string;
}

export class SearchUserResponseDto {
    @ApiProperty({
        description: 'User ID',
        example: 'user456',
    })
    id: string;

    @ApiProperty({
        description: 'Username',
        example: 'jane_smith',
    })
    username: string;
}
