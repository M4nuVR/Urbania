import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { Transform } from 'class-transformer';
import { IsEnum, IsOptional, IsString, MaxLength } from 'class-validator';
import { ReportStatus } from '../../generated/prisma/enums.js';

export class ChangeStatusDto {
  @ApiProperty({ enum: ReportStatus, example: ReportStatus.UNDER_REVIEW })
  @IsEnum(ReportStatus)
  newStatus: ReportStatus;

  @ApiPropertyOptional({
    maxLength: 1000,
    description: 'Obligatoria al pasar a RESOLVED',
    example: 'Se reparó la luminaria y se verificó su funcionamiento.',
  })
  @IsOptional()
  @Transform(({ value }) => (typeof value === 'string' ? value.trim() : value))
  @IsString()
  @MaxLength(1000)
  observation?: string;
}
