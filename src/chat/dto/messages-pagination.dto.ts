import { Type } from 'class-transformer';
import { IsInt, IsOptional, IsString, Max, Min } from 'class-validator';
import { ApiPropertyOptional } from '@nestjs/swagger';

export class MessagesPaginationDto {
    @ApiPropertyOptional({
        description: 'Cursor for previous messages (optional)',
        required: false,
        example: 'msg-id',
    })
    @IsOptional()
    @IsString()
    prevCursor?: string;

    @ApiPropertyOptional({
        description: 'Cursor for next messages (optional)',
        required: false,
        example: 'msg-id',
    })
    @IsOptional()
    @IsString()
    nextCursor?: string;

    @ApiPropertyOptional({
        description: 'Message id for look up (optional)',
        required: false,
        example: 'msg-id',
    })
    @IsOptional()
    @IsString()
    aroundMessageId?: string;

    @ApiPropertyOptional({
        description: 'Timestamp for look up (optional)',
        required: false,
        example: '12345678',
    })
    @IsOptional()
    @Type(() => Number)
    @IsInt()
    aroundDate?: number;
    @ApiPropertyOptional({
        description: 'Number of items per page',
        minimum: 1,
        maximum: 100,
        default: 20,
        required: false,
        example: 20,
    })
    @IsOptional()
    @Type(() => Number)
    @IsInt()
    @Min(1)
    @Max(100)
    limit?: number = 20;
}
