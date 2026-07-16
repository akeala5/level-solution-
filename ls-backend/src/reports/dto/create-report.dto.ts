import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { IsEnum, IsString, IsOptional, MaxLength, MinLength } from 'class-validator';
import { ReportTargetType, ReportReason } from '@prisma/client';

export class CreateReportDto {
  @ApiProperty({ enum: ReportTargetType })
  @IsEnum(ReportTargetType)
  targetType: ReportTargetType;

  @ApiProperty({ example: 'uuid-de-la-cible' })
  @IsString()
  @MinLength(1)
  targetId: string;

  @ApiProperty({ enum: ReportReason })
  @IsEnum(ReportReason)
  reason: ReportReason;

  @ApiPropertyOptional({ example: 'Détails complémentaires du signalement' })
  @IsOptional()
  @IsString()
  @MaxLength(1000)
  description?: string;
}
