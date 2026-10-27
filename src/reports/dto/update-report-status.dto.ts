import { ApiProperty } from '@nestjs/swagger';
import { IsEnum } from 'class-validator';
import { ReportStatus } from '../report.entity';

export class UpdateReportStatusDto {
  @ApiProperty({ enum: ReportStatus, example: ReportStatus.IN_PROGRESS })
  @IsEnum(ReportStatus)
  status: ReportStatus;
}
