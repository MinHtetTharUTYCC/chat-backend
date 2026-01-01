import {
    Body,
    Controller,
    HttpCode,
    HttpStatus,
    Post,
    Req,
    Res,
    UseGuards,
    ValidationPipe,
} from '@nestjs/common';
import { LoginDto } from './dto/login.dto';
import { AuthService } from './auth.service';
import express from 'express';
import { RegisterDto } from './dto/register.dto';
import { JwtRefreshGuard } from './guards/jwt-refresh.guard';
import { JwtAuthGuard } from './guards/jwt-auth.guard';

@Controller('auth')
export class AuthController {
    constructor(private readonly authService: AuthService) {}

    @HttpCode(HttpStatus.OK)
    @Post('/login')
    async login(
        @Body(ValidationPipe) dto: LoginDto,
        @Res({ passthrough: true }) res: express.Response,
    ) {
        const { accessToken, refreshToken, user } =
            await this.authService.login(dto);

        // set refres tokens only in httpOnly cookie
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

    @HttpCode(HttpStatus.CREATED)
    @Post('/register')
    async register(
        @Body(ValidationPipe) dto: RegisterDto,
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

    @Post('/refresh')
    @UseGuards(JwtRefreshGuard)
    async refresh(
        @Req() req,
        @Res({ passthrough: true }) res: express.Response,
    ) {
        const { sub: userId, username } = req.user;
        const oldRT = req.user.refreshToken;

        // Generate new tokens
        const { accessToken, refreshToken } =
            await this.authService.refreshTokens(userId, username, oldRT);

        res.cookie('refresh_token', refreshToken, {
            httpOnly: true,
            secure: process.env.NODE_ENV === 'production',
            sameSite: 'lax',
            path: '/',
        });

        return { accessToken };
    }

    @Post('/logout')
    @UseGuards(JwtAuthGuard)
    async logout(
        @Req() req,
        @Res({ passthrough: true }) res: express.Response,
    ) {
        const userId = req.user.sub;

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
