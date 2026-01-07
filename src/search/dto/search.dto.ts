import { ApiProperty } from '@nestjs/swagger';
import { IsString } from 'class-validator';

export class SearchQueryDto {
    @ApiProperty({
        description: 'Search query string',
        example: 'hello',
    })
    @IsString()
    q: string;
}
