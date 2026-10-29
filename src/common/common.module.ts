import { Module } from '@nestjs/common';
import { ReportAuthorizationService } from './report-authorization.service';

@Module({
  providers: [ReportAuthorizationService],
  exports: [ReportAuthorizationService],
})
export class CommonModule {}
