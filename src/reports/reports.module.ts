import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { REPORT_ACCESS_PORT } from '../common/report-access';
import { ReportAccessAdapter } from './report-access.adapter';
import { Report } from './report.entity';
import { ReportsController } from './reports.controller';
import { ReportsService } from './reports.service';

@Module({
  imports: [TypeOrmModule.forFeature([Report])],
  controllers: [ReportsController],
  providers: [
    ReportsService,
    ReportAccessAdapter,
    { provide: REPORT_ACCESS_PORT, useExisting: ReportAccessAdapter },
  ],
  exports: [ReportsService, REPORT_ACCESS_PORT],
})
export class ReportsModule {}
