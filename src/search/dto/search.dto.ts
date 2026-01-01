// search.dto.ts
import { IsString, IsNotEmpty, MinLength } from 'class-validator';

export class SearchQueryDto {
    @IsString()
    @IsNotEmpty()
    @MinLength(1)
    q: string;
}
