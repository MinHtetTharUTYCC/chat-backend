import { ApiProperty } from '@nestjs/swagger';
import { IsString, IsNotEmpty, MinLength } from 'class-validator';

export class SearchQueryDto {
    @ApiProperty({
        description: 'Search query string',
        example: 'hello',
        minLength: 1,
    })
    @IsString()
    @IsNotEmpty()
    @MinLength(1)
    q: string;
}
