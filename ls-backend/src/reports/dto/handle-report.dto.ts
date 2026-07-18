import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { IsIn, IsOptional, IsString, MaxLength } from 'class-validator';
import { ReportStatus } from '@prisma/client';

// Un modérateur ne peut que faire avancer un signalement — jamais le remettre à PENDING.
export class HandleReportDto {
  @ApiProperty({ enum: ['REVIEWING', 'ACTIONED', 'DISMISSED'] })
  @IsIn(['REVIEWING', 'ACTIONED', 'DISMISSED'])
  status: ReportStatus;

  @ApiPropertyOptional({ example: 'Annonce dépubliée pour contrefaçon' })
  @IsOptional()
  @IsString()
  @MaxLength(1000)
  resolution?: string;
}
