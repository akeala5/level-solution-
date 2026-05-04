import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import {
  IsEmail,
  IsString,
  MinLength,
  MaxLength,
  IsOptional,
  IsEnum,
  Matches,
} from 'class-validator';
import { Role } from '@prisma/client';

export class RegisterDto {
  @ApiProperty({ example: 'jean.dupont@email.com' })
  @IsEmail({}, { message: 'Email invalide' })
  email: string;

  @ApiPropertyOptional({ example: '+22891234567' })
  @IsOptional()
  @IsString()
  phone?: string;

  @ApiProperty({ example: 'Jean' })
  @IsString()
  @MinLength(2)
  @MaxLength(50)
  firstName: string;

  @ApiProperty({ example: 'Dupont' })
  @IsString()
  @MinLength(2)
  @MaxLength(50)
  lastName: string;

  @ApiProperty({ example: 'MotDePasse123!' })
  @IsString()
  @MinLength(8)
  @MaxLength(100)
  @Matches(
    /^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)/,
    { message: 'Le mot de passe doit contenir au moins une majuscule, une minuscule et un chiffre' },
  )
  password: string;

  @ApiPropertyOptional({ enum: ['SELLER', 'BUYER'], default: 'BUYER' })
  @IsOptional()
  @IsEnum(['SELLER', 'BUYER'])
  role?: 'SELLER' | 'BUYER';

  @ApiPropertyOptional({ example: 'REF123' })
  @IsOptional()
  @IsString()
  referralCode?: string;
}
