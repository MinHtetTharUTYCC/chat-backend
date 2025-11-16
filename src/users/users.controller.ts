import { Controller, Get, Req, Res, UseGuards } from '@nestjs/common';
import type { Response } from 'express';
import { JwtAuthGuard } from 'src/auth/guards/jwt-auth.guard';
import { UsersService } from './users.service';

@Controller('users')
export class UsersController {

    constructor(private readonly usersService: UsersService) { }

    @Get('/me')
    @UseGuards(JwtAuthGuard)
    async getMe(@Req() req) {
        return this.usersService.getUserInfo(req.user.sub);
    }
}
