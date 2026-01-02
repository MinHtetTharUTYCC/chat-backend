import { Controller, Get, Param, Query, UseGuards } from '@nestjs/common';
import { JwtAuthGuard } from 'src/auth/guards/jwt-auth.guard';
import { SearchService } from './search.service';
import { SearchQueryDto } from './dto/search.dto';
import { ReqUser } from 'src/auth/request-user.decorator';
import type { RequestUser } from 'src/auth/interfaces/request-user.interface';

@Controller('search')
@UseGuards(JwtAuthGuard)
export class SearchController {
    constructor(private readonly searchService: SearchService) {}

    @Get('/')
    async searchChats(
        @ReqUser() me: RequestUser,
        @Query() dto: SearchQueryDto,
    ) {
        return this.searchService.searchChats(me.sub, dto.q);
    }

    @Get('/chats/:chatId')
    async searchInMessages(
        @ReqUser() me: RequestUser,
        @Param('chatId') chatId: string,
        @Query() dto: SearchQueryDto,
    ) {
        return this.searchService.searchMessageInChat(me.sub, chatId, dto.q);
    }
}
