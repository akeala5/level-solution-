import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import {
  IsString, IsNumber, IsOptional, IsEnum, IsBoolean,
  IsArray, Min, Max, MinLength, MaxLength,
} from 'class-validator';
import { Type } from 'class-transformer';

export class CreateProductDto {
  @ApiProperty() @IsString() @MinLength(5) @MaxLength(120) title: string;
  @ApiPropertyOptional() @IsOptional() @IsString() titleEn?: string;
  @ApiProperty() @IsString() @MinLength(20) description: string;
  @ApiPropertyOptional() @IsOptional() @IsString() descriptionEn?: string;
  @ApiProperty() @IsNumber() @Min(0) @Type(() => Number) price: number;
  @ApiPropertyOptional() @IsOptional() @IsNumber() @Min(0) @Type(() => Number) originalPrice?: number;
  @ApiProperty() @IsString() categoryId: string;

  @ApiPropertyOptional({ enum: ['NEW', 'VERY_GOOD', 'GOOD', 'FAIR', 'FOR_PARTS'] })
  @IsOptional() @IsEnum(['NEW', 'VERY_GOOD', 'GOOD', 'FAIR', 'FOR_PARTS'])
  condition?: string;

  @ApiPropertyOptional() @IsOptional() @IsString() brand?: string;
  @ApiPropertyOptional() @IsOptional() @IsString() model?: string;
  @ApiPropertyOptional() @IsOptional() @IsNumber() @Min(1) @Type(() => Number) quantity?: number;
  @ApiPropertyOptional() @IsOptional() @IsString() city?: string;
  @ApiPropertyOptional() @IsOptional() @IsString() country?: string;

  @ApiPropertyOptional({ enum: ['NONE', 'SELLER_7_DAYS', 'LS_STANDARD_30_DAYS', 'LS_PREMIUM_90_DAYS', 'MANUFACTURER'] })
  @IsOptional() @IsEnum(['NONE', 'SELLER_7_DAYS', 'LS_STANDARD_30_DAYS', 'LS_PREMIUM_90_DAYS', 'MANUFACTURER'])
  guarantee?: string;

  @ApiPropertyOptional() @IsOptional() @IsBoolean() hasDelivery?: boolean;
  @ApiPropertyOptional() @IsOptional() @IsNumber() @Min(0) deliveryPrice?: number;
  @ApiPropertyOptional() @IsOptional() @IsBoolean() isNegotiable?: boolean;
  @ApiPropertyOptional() @IsOptional() @IsBoolean() isReconditioned?: boolean;
  @ApiPropertyOptional() @IsOptional() @IsArray() @IsString({ each: true }) tags?: string[];
  @ApiPropertyOptional() @IsOptional() @IsArray() imageUrls?: string[];
}

export class UpdateProductDto extends CreateProductDto {}

export class ProductQueryDto {
  @ApiPropertyOptional() @IsOptional() @IsString() search?: string;
  @ApiPropertyOptional() @IsOptional() @IsString() categoryId?: string;
  @ApiPropertyOptional() @IsOptional() @IsString() categorySlug?: string;
  @ApiPropertyOptional() @IsOptional() @IsString() condition?: string;
  @ApiPropertyOptional() @IsOptional() @IsString() brand?: string;
  @ApiPropertyOptional() @IsOptional() @IsString() city?: string;
  @ApiPropertyOptional() @IsOptional() @IsString() country?: string;
  @ApiPropertyOptional() @IsOptional() @IsNumber() @Type(() => Number) minPrice?: number;
  @ApiPropertyOptional() @IsOptional() @IsNumber() @Type(() => Number) maxPrice?: number;
  @ApiPropertyOptional() @IsOptional() @IsBoolean() hasDelivery?: boolean;
  @ApiPropertyOptional() @IsOptional() @IsBoolean() isReconditioned?: boolean;
  @ApiPropertyOptional({ enum: ['price_asc', 'price_desc', 'newest', 'oldest', 'popular'] })
  @IsOptional() sortBy?: string;
  @ApiPropertyOptional() @IsOptional() @IsNumber() @Min(1) @Type(() => Number) page?: number;
  @ApiPropertyOptional() @IsOptional() @IsNumber() @Min(1) @Max(100) @Type(() => Number) limit?: number;
  @ApiPropertyOptional() @IsOptional() @IsString() sellerId?: string;
}
