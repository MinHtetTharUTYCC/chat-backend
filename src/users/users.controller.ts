import { Body, Controller, Get, Param, Patch, Query, Req, UseGuards, ValidationPipe } from '@nestjs/common';
import { JwtAuthGuard } from 'src/auth/guards/jwt-auth.guard';
import { UsersService } from './users.service';
import { UpdateUserDto } from './dto/update-user.dto';
import { SearchQueryDto } from 'src/search/dto/search.dto';

@Controller('users')
@UseGuards(JwtAuthGuard)
export class UsersController {

    constructor(private readonly usersService: UsersService) { }

    @Get('')
    async getAllUsers(@Req() req) {
        return this.usersService.getAllUsers(req.user.sub)
    }

    @Get('/me')
    async getMe(@Req() req) {
        return this.usersService.getMe(req.user.sub);
    }

    @Patch('/me')
    async updateUser(@Req() req, @Body(ValidationPipe) dto: UpdateUserDto) {
        return this.usersService.updateUser(req.user.sub, dto)
    }

    @Get('/search')
    async searchUsers(@Req() req, @Query(ValidationPipe) dto: SearchQueryDto) {
        return this.usersService.searchUsers(req.user.sub, dto.q)
    }

    @Get('/:viewUserId')
    async viewUser(@Req() req, @Param('viewUserId') viewUserId: string) {
        return this.usersService.viewUser(viewUserId)
    }
    
}
