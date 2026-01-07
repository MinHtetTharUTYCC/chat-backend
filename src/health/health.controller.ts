import { Controller, Get } from '@nestjs/common';

@Controller('health')
export class HealthController {
    @Get()
    checkHealth() {
        return {
            status: 'OK',
            timestamp: new Date().toISOString(),
            service: 'chat-api-api',
        };
    }
}
