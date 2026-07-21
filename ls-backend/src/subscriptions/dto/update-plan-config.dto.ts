import { ApiPropertyOptional } from '@nestjs/swagger';
import { IsOptional, IsBoolean, IsNumber, IsString, IsArray, Min, Max } from 'class-validator';

export class UpdatePlanConfigDto {
  @ApiPropertyOptional() @IsOptional() @IsString() name?: string;
  @ApiPropertyOptional() @IsOptional() @IsString() nameEn?: string;
  @ApiPropertyOptional() @IsOptional() @IsNumber() @Min(0) maxProducts?: number;
  @ApiPropertyOptional() @IsOptional() @IsNumber() @Min(0) monthlyPrice?: number;
  @ApiPropertyOptional() @IsOptional() @IsNumber() @Min(0) yearlyPrice?: number;
  // Commission = fraction (0.05 = 5%). Bornée [0,1] pour éviter toute saisie absurde.
  @ApiPropertyOptional() @IsOptional() @IsNumber() @Min(0) @Max(1) commission?: number;
  @ApiPropertyOptional() @IsOptional() @IsNumber() @Min(0) sponsoredAdsPerMonth?: number;
  @ApiPropertyOptional() @IsOptional() @IsBoolean() hasStats?: boolean;
  @ApiPropertyOptional() @IsOptional() @IsBoolean() hasShopPage?: boolean;
  @ApiPropertyOptional() @IsOptional() @IsBoolean() hasBadge?: boolean;
  @ApiPropertyOptional() @IsOptional() @IsArray() @IsString({ each: true }) features?: string[];
  @ApiPropertyOptional() @IsOptional() @IsBoolean() isActive?: boolean;
}
