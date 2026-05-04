import { ApiPropertyOptional } from '@nestjs/swagger';
import { IsString, IsOptional, MinLength, MaxLength, Matches, IsEnum } from 'class-validator';

export class UpdateProfileDto {
  @ApiPropertyOptional() @IsOptional() @IsString() @MinLength(2) firstName?: string;
  @ApiPropertyOptional() @IsOptional() @IsString() @MinLength(2) lastName?: string;
  @ApiPropertyOptional() @IsOptional() @IsString() phone?: string;
  @ApiPropertyOptional() @IsOptional() @IsString() bio?: string;
  @ApiPropertyOptional() @IsOptional() @IsString() city?: string;
  @ApiPropertyOptional() @IsOptional() @IsString() country?: string;
  @ApiPropertyOptional({ enum: ['fr', 'en'] }) @IsOptional() @IsEnum(['fr', 'en']) language?: string;
  @ApiPropertyOptional() @IsOptional() @IsString() currency?: string;
  @ApiPropertyOptional() @IsOptional() @IsString() timezone?: string;
}

export class UpdateSellerProfileDto {
  @ApiPropertyOptional() @IsOptional() @IsString() @MinLength(3) @MaxLength(60) shopName?: string;
  @ApiPropertyOptional() @IsOptional() @IsString() shopDescription?: string;
  @ApiPropertyOptional() @IsOptional() @IsString() shopCity?: string;
  @ApiPropertyOptional() @IsOptional() @IsString() shopCountry?: string;
  @ApiPropertyOptional() @IsOptional() @IsString() shopPhone?: string;
  @ApiPropertyOptional() @IsOptional() @IsString() shopWhatsapp?: string;
  @ApiPropertyOptional() @IsOptional() @IsString() shopHours?: string;
}

export class ChangePasswordDto {
  @ApiPropertyOptional() @IsString() currentPassword: string;
  @ApiPropertyOptional() @IsString() @MinLength(8)
  @Matches(/^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)/)
  newPassword: string;
}

export class CreateAddressDto {
  @ApiPropertyOptional() @IsString() label: string;
  @ApiPropertyOptional() @IsString() fullName: string;
  @ApiPropertyOptional() @IsString() phone: string;
  @ApiPropertyOptional() @IsString() street: string;
  @ApiPropertyOptional() @IsString() city: string;
  @ApiPropertyOptional() @IsOptional() @IsString() country?: string;
  @ApiPropertyOptional() @IsOptional() @IsString() postalCode?: string;
}
