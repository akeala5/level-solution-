import { ApiPropertyOptional } from '@nestjs/swagger';
import { IsOptional, IsArray, IsInt, IsIn, Min, Max } from 'class-validator';

export class UpdateHeroConfigDto {
  @ApiPropertyOptional() @IsOptional() @IsArray() slides?: any[];
  @ApiPropertyOptional() @IsOptional() @IsArray() housePromos?: any[];
  @ApiPropertyOptional() @IsOptional() @IsInt() @Min(2000) @Max(60000) slideMs?: number;
  @ApiPropertyOptional() @IsOptional() @IsInt() @Min(2000) @Max(60000) rotateMs?: number;
  @ApiPropertyOptional() @IsOptional() @IsIn(['fade', 'slide', 'zoom', 'none']) slideAnim?: string;
}
