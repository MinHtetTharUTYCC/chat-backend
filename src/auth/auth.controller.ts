import {
    Body,
    Controller,
    HttpCode,
    HttpStatus,
    Post,
    Req,
    Res,
    UseGuards,
} from '@nestjs/common';
import { LoginDto } from './dto/login.dto';
import { AuthService } from './auth.service';
import express from 'express';
import { RegisterDto } from './dto/register.dto';
import { JwtRefreshGuard } from './guards/jwt-refresh.guard';
import { JwtAuthGuard } from './guards/jwt-auth.guard';
import { Throttle } from '@nestjs/throttler';
import {
    ApiBearerAuth,
    ApiBody,
    ApiCookieAuth,
    ApiOperation,
    ApiResponse,
} from '@nestjs/swagger';
import {
    LoginResponseDto,
    LogoutResponseDto,
    RefreshResponseDto,
    RegisterResponseDto,
} from './dto/response.auth.dto';
import { ReqUser } from './request-user.decorator';
import type { RequestUser } from './interfaces/request-user.interface';

@Controller('auth')
export class AuthController {
    constructor(private readonly authService: AuthService) {}

    @Throttle({ default: { ttl: 60000, limit: 5 } })
    @HttpCode(HttpStatus.OK)
    @Post('/login')
    @ApiOperation({
        summary: 'User login',
        description:
            'Authenticate user with email and password. Returns access token and sets refresh token in HTTP-only cookie.',
    })
    @ApiBody({
        type: LoginDto,
        description: 'User credentials',
        examples: {
            example1: {
                summary: 'Standard login',
                value: {
                    email: 'user@example.com',
                    password: 'Password123!',
                },
            },
        },
    })
    @ApiResponse({
        status: 200,
        description:
            'Login successful. Access token returned, refresh token set in cookie.',
        type: LoginResponseDto,
        example: {
            accessToken: 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...',
            user: {
                id: 'user123',
                username: 'john_doe',
                email: 'john@example.com',
            },
        },
    })
    @ApiResponse({
        status: 400,
        description: 'Bad request - Invalid credentials',
    })
    @ApiResponse({
        status: 401,
        description: 'Unauthorized - Invalid email or password',
    })
    @ApiResponse({
        status: 429,
        description: 'Too many requests - Rate limit exceeded',
    })
    async login(
        @Body() dto: LoginDto,
        @Res({ passthrough: true }) res: express.Response,
    ) {
        const { accessToken, refreshToken, user } =
            await this.authService.login(dto);

        // set refresh tokens only in httpOnly cookie
        res.cookie('refresh_token', refreshToken, {
            httpOnly: true,
            secure: process.env.NODE_ENV === 'production',
            sameSite: 'lax',
            path: '/',
        });

        return {
            accessToken,
            user,
        };
    }

    @Throttle({ default: { ttl: 60000, limit: 3 } })
    @HttpCode(HttpStatus.CREATED)
    @Post('/register')
    @ApiOperation({
        summary: 'User registration',
        description:
            'Register a new user account. Returns access token and sets refresh token in HTTP-only cookie.',
    })
    @ApiBody({
        type: RegisterDto,
        description: 'User registration data',
        examples: {
            example1: {
                summary: 'New user registration',
                value: {
                    email: 'newuser@example.com',
                    username: 'new_user',
                    password: 'Password123!',
                },
            },
        },
    })
    @ApiResponse({
        status: 201,
        description:
            'Registration successful. Access token returned, refresh token set in cookie.',
        type: RegisterResponseDto,
        example: {
            accessToken: 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...',
            user: {
                id: 'user456',
                username: 'new_user',
                email: 'newuser@example.com',
            },
        },
    })
    @ApiResponse({
        status: 400,
        description: 'Bad request - Email already taken or invalid data',
    })
    @ApiResponse({
        status: 429,
        description: 'Too many requests - Rate limit exceeded',
    })
    async register(
        @Body() dto: RegisterDto,
        @Res({ passthrough: true }) res: express.Response,
    ) {
        const { accessToken, refreshToken, user } =
            await this.authService.register(dto);

        // set refresh tokens only in HttpOnly cookie
        res.cookie('refresh_token', refreshToken, {
            httpOnly: true,
            secure: process.env.NODE_ENV === 'production',
            sameSite: 'lax',
            path: '/',
        });

        return {
            accessToken,
            user,
        };
    }

    @Throttle({ default: { ttl: 60000, limit: 10 } })
    @Post('/refresh')
    @UseGuards(JwtRefreshGuard)
    @ApiOperation({
        summary: 'Refresh access token',
        description:
            'Get a new access token using the refresh token from HTTP-only cookie. Requires valid refresh token in cookie.',
    })
    @ApiCookieAuth('refresh_token')
    @ApiResponse({
        status: 200,
        description: 'Access token refreshed successfully',
        type: RefreshResponseDto,
        example: {
            accessToken: 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...',
        },
    })
    @ApiResponse({
        status: 401,
        description: 'Unauthorized - Invalid or expired refresh token',
    })
    @ApiResponse({
        status: 403,
        description: 'Forbidden - Access denied',
    })
    @ApiResponse({
        status: 429,
        description: 'Too many requests - Rate limit exceeded',
    })
    async refresh(
        @Req() req,
        @ReqUser() me: RequestUser,
        @Res({ passthrough: true }) res: express.Response,
    ) {
        const oldRT = req.user.refreshToken;

        // Generate new tokens
        const { accessToken, refreshToken } =
            await this.authService.refreshTokens(me.sub, oldRT);

        res.cookie('refresh_token', refreshToken, {
            httpOnly: true,
            secure: process.env.NODE_ENV === 'production',
            sameSite: 'lax',
            path: '/',
        });

        return { accessToken };
    }

    @Throttle({ default: { ttl: 60000, limit: 10 } })
    @Post('/logout')
    @UseGuards(JwtAuthGuard)
    @ApiOperation({
        summary: 'User logout',
        description:
            'Log out user by clearing refresh token from database and cookie. Requires valid access token.',
    })
    @ApiBearerAuth()
    @ApiResponse({
        status: 200,
        description: 'Logout successful',
        type: LogoutResponseDto,
        example: {
            success: true,
            message: 'Logged out successfully',
        },
    })
    @ApiResponse({
        status: 401,
        description: 'Unauthorized - Invalid access token',
    })
    @ApiResponse({
        status: 429,
        description: 'Too many requests - Rate limit exceeded',
    })
    async logout(
        @ReqUser() me: RequestUser,
        @Res({ passthrough: true }) res: express.Response,
    ) {
        const userId = me.sub;

        // clear refreshToken at DB
        await this.authService.logout(userId);

        //clear cookie in client
        res.clearCookie('refresh_token', {
            httpOnly: true,
            secure: process.env.NODE_ENV === 'production',
            sameSite: 'lax',
            path: '/',
        });

        return { success: true, message: 'Logged out successfully' };
    }
}
