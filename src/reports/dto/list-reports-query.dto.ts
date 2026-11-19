import { ApiPropertyOptional } from '@nestjs/swagger';
import { IsEnum, IsOptional, IsUUID } from 'class-validator';
import { ReportStatus } from '../report.entity';

export class ListReportsQueryDto {
  @ApiPropertyOptional({ enum: ReportStatus })
  @IsOptional()
  @IsEnum(ReportStatus)
  status?: ReportStatus;

  @ApiPropertyOptional({
    format: 'uuid',
    description: 'También admite categorías desactivadas (consulta histórica)',
  })
  @IsOptional()
  @IsUUID()
  categoryId?: string;
}
