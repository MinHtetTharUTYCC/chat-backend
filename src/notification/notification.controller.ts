import { Controller, Get, Query, Req, UseGuards, ValidationPipe } from '@nestjs/common';
import { JwtAuthGuard } from 'src/auth/guards/jwt-auth.guard';
import { NotificationService } from './notification.service';
import { PaginationDto } from 'src/chat/dto/pagination.dto';

@Controller('notifications')
@UseGuards(JwtAuthGuard)
export class NotificationController {

    constructor(private readonly notificationService: NotificationService) { }

    @Get("/")
    async getNotifications(@Req() req, @Query(ValidationPipe) query: PaginationDto) {
        return this.notificationService.getNotifications(req.user.sub, query.cursor, query.limit)
    }
}
