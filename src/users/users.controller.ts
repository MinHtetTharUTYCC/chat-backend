import { Body, Controller, Get, Patch, Query, UseGuards } from '@nestjs/common';
import { JwtAuthGuard } from 'src/auth/guards/jwt-auth.guard';
import { UsersService } from './users.service';
import { UpdateUserDto } from './dto/update-user.dto';
import { SearchQueryDto } from 'src/search/dto/search.dto';
import { ReqUser } from 'src/auth/request-user.decorator';
import type { RequestUser } from 'src/auth/interfaces/request-user.interface';

@Controller('users')
@UseGuards(JwtAuthGuard)
export class UsersController {
    constructor(private readonly usersService: UsersService) {}

    @Get('/me')
    async getMe(@ReqUser() me: RequestUser) {
        return this.usersService.getMe(me.sub);
    }

    @Patch('/me')
    async updateUser(@ReqUser() me: RequestUser, @Body() dto: UpdateUserDto) {
        return this.usersService.updateUser(me.sub, dto);
    }

    @Get('/search')
    async searchUsers(
        @ReqUser() me: RequestUser,
        @Query() dto: SearchQueryDto,
    ) {
        return this.usersService.searchUsers(me.sub, dto.q);
    }
}
