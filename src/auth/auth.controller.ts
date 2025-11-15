import { Body, Controller, HttpCode, HttpStatus, Post, Req, Res, UseGuards, ValidationPipe } from '@nestjs/common';
import { LoginDto } from './dto/login.dto';
import { AuthService } from './auth.service';
import type { Response } from 'express';
import { RegisterDto } from './dto/register.dto';
import { JwtRefreshGuard } from './guards/jwt-refresh.guard';

@Controller('auth')
export class AuthController {

    constructor(private readonly authService: AuthService) { }

    @HttpCode(HttpStatus.OK)
    @Post('/login')
    async login(@Body(ValidationPipe) dto: LoginDto, @Res({ passthrough: true }) res: Response) {
        const { accessToken, refreshToken, user } = await this.authService.login(dto);

        // set refres tokens only in httpOnly cookie
        res.cookie('refresh_token', refreshToken, {
            httpOnly: true,
            secure: true,
            sameSite: 'strict',
            path: '/auth/refresh',
        });

        return {
            accessToken,
            user
        };
    }

    @HttpCode(HttpStatus.CREATED)
    @Post('/register')
    async register(@Body(ValidationPipe) dto: RegisterDto, @Res({ passthrough: true }) res: Response) {
        const { accessToken, refreshToken, user } = await this.authService.register(dto);

        // set refresh tokens only in HttpOnly cookie
        res.cookie('refresh_token', refreshToken, {
            httpOnly: true,
            secure: true,
            sameSite: 'strict',
            path: '/auth/refresh',
        });

        return {
            accessToken,
            user
        };
    }

    @Post('/refresh')
    @UseGuards(JwtRefreshGuard)
    async refresh(@Req() req, @Res() res: Response) {
        const userId = req.user.sub;
        const oldRT = req.user.refreshToken;

        const { accessToken, refreshToken } = await this.authService.refreshTokens(userId, oldRT);

        res.cookie("refresh_token", refreshToken, {
            httpOnly: true,
            secure: true,
            sameSite: "strict",
            path: "/auth/refresh",
        });

        return res.json({ accessToken })
    }
}
