import { ApiProperty } from '@nestjs/swagger';
import { IsString, IsNumber, IsDateString, Min } from 'class-validator';
import { Type } from 'class-transformer';

export class CreateSponsoredAdDto {
  @ApiProperty({ example: 'prod-uuid' })
  @IsString()
  productId: string;

  @ApiProperty({ example: 25000, description: 'Budget total en FCFA (min 5 000)' })
  @Type(() => Number)
  @IsNumber()
  @Min(5000)
  budget: number;

  @ApiProperty({ example: '2026-05-06' })
  @IsDateString()
  startsAt: string;

  @ApiProperty({ example: '2026-05-13' })
  @IsDateString()
  endsAt: string;
}
