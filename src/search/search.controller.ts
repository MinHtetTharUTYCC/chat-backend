import {
    Controller,
    Get,
    Param,
    Query,
    Req,
    UseGuards,
    ValidationPipe,
} from '@nestjs/common';
import { JwtAuthGuard } from 'src/auth/guards/jwt-auth.guard';
import { SearchService } from './search.service';
import { SearchQueryDto } from './dto/search.dto';

@Controller('search')
@UseGuards(JwtAuthGuard)
export class SearchController {
    constructor(private readonly searchService: SearchService) {}

    @Get('/')
    async searchGlobal(@Req() req, @Query(ValidationPipe) dto: SearchQueryDto) {
        return this.searchService.searchGolbal(req.user.sub, dto.q);
    }

    @Get('/chats/:chatId')
    async searchInMessages(
        @Req() req,
        @Param('chatId') chatId: string,
        @Query(ValidationPipe) dto: SearchQueryDto,
    ) {
        return this.searchService.searchMessageInChat(
            req.user.sub,
            chatId,
            dto.q,
        );
    }
}
