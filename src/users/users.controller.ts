import { Body, Controller, Get, Patch, Query, UseGuards } from '@nestjs/common';
import { JwtAuthGuard } from 'src/auth/guards/jwt-auth.guard';
import { UsersService } from './users.service';
import { UpdateUserDto } from './dto/update-user.dto';
import { SearchQueryDto } from 'src/search/dto/search.dto';
import { ReqUser } from 'src/auth/request-user.decorator';
import type { RequestUser } from 'src/auth/interfaces/request-user.interface';
import {
    ApiBearerAuth,
    ApiBody,
    ApiOperation,
    ApiQuery,
    ApiResponse,
    ApiTags,
} from '@nestjs/swagger';
import {
    SearchUserResponseDto,
    UpdateUserResponseDto,
    UserResponseDto,
} from './dto/response.user.dto';

@ApiTags('users')
@ApiBearerAuth()
@Controller('users')
@UseGuards(JwtAuthGuard)
export class UsersController {
    constructor(private readonly usersService: UsersService) {}

    @Get('/me')
    @ApiOperation({
        summary: 'Get current user profile',
        description:
            'Returns the profile information of the authenticated user',
    })
    @ApiResponse({
        status: 200,
        description: 'User profile retrieved successfully',
        type: UserResponseDto,
        example: {
            id: 'user123',
            username: 'john_doe',
            email: 'john@example.com',
        },
    })
    @ApiResponse({
        status: 401,
        description: 'Unauthorized - Invalid or missing token',
    })
    @ApiResponse({
        status: 404,
        description: 'User not found',
    })
    async getMe(@ReqUser() me: RequestUser): Promise<UserResponseDto> {
        const user = await this.usersService.getMe(me.sub);
        return user;
    }

    @Patch('/me')
    @ApiOperation({
        summary: 'Update user profile',
        description: 'Update the profile information of the authenticated user',
    })
    @ApiBody({
        type: UpdateUserDto,
        description: 'User update data',
        examples: {
            example1: {
                summary: 'Update username',
                value: {
                    username: 'new_username',
                },
            },
        },
    })
    @ApiResponse({
        status: 200,
        description: 'User profile updated successfully',
        type: UpdateUserResponseDto,
        example: {
            success: true,
            username: 'new_username',
        },
    })
    @ApiResponse({
        status: 400,
        description: 'Bad request - Invalid data provided',
    })
    @ApiResponse({
        status: 401,
        description: 'Unauthorized - Invalid or missing token',
    })
    @ApiResponse({
        status: 404,
        description: 'User not found',
    })
    async updateUser(
        @ReqUser() me: RequestUser,
        @Body() dto: UpdateUserDto,
    ): Promise<UpdateUserResponseDto> {
        return this.usersService.updateUser(me.sub, dto);
    }

    @Get('/search')
    @ApiOperation({
        summary: 'Search users',
        description: 'Search for users by username (excluding current user)',
    })
    @ApiQuery({
        name: 'q',
        description: 'Search query string',
        required: true,
        type: String,
        example: 'john',
    })
    @ApiResponse({
        status: 200,
        description: 'Search results retrieved successfully',
        type: [SearchUserResponseDto],
        example: [
            {
                id: 'user456',
                username: 'john_smith',
            },
            {
                id: 'user789',
                username: 'john_doe',
            },
        ],
    })
    @ApiResponse({
        status: 401,
        description: 'Unauthorized - Invalid or missing token',
    })
    async searchUsers(
        @ReqUser() me: RequestUser,
        @Query() dto: SearchQueryDto,
    ): Promise<SearchUserResponseDto[]> {
        return this.usersService.searchUsers(me.sub, dto.q);
    }
}
