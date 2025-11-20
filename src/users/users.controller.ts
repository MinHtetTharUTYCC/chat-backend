import { Body, Controller, Get, Param, Patch, Req, UseGuards, ValidationPipe } from '@nestjs/common';
import { JwtAuthGuard } from 'src/auth/guards/jwt-auth.guard';
import { UsersService } from './users.service';
import { UpdateUserDto } from './dto/update-user.dto';

@Controller('users')
@UseGuards(JwtAuthGuard)
export class UsersController {

    constructor(private readonly usersService: UsersService) { }

    @Get('/me')
    async getMe(@Req() req) {
        return this.usersService.getMe(req.user.sub);
    }

    @Patch('/me')
    async updateUser(@Req() req, @Body(ValidationPipe) dto: UpdateUserDto) {
        return this.usersService.updateUser(req.user.sub, dto)
    }

    @Get('/:viewUserId')
    async viewUser(@Req() req, @Param('viewUserId') viewUserId: string) {
        return this.usersService.viewUser(req.user.sub, viewUserId)
    }
}
