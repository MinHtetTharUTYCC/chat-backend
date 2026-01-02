import { Type } from 'class-transformer';
import {
    IsInt,
    IsNotEmpty,
    IsOptional,
    IsString,
    Max,
    Min,
} from 'class-validator';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';

export class JumpToPinnedMsgPaginationDto {
    @ApiProperty({
        description: 'ID of the target message',
        required: true,
        example: 'msg_1234567890',
    })
    @IsString()
    @IsNotEmpty()
    messageId: string;

    @ApiPropertyOptional({
        description: 'Number of messages to fetch before the target',
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
    limitBefore?: number = 20;

    @ApiPropertyOptional({
        description: 'Number of messages to fetch after the target',
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
    limitAfter?: number = 20;
}
