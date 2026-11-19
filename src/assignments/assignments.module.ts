import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { NotificationsModule } from '../notifications/notifications.module';
import { Report } from '../reports/report.entity';
import { Assignment } from './assignment.entity';
import { AssignmentsController } from './assignments.controller';
import { AssignmentsService } from './assignments.service';
import { ReportAccessService } from './report-access.service';

@Module({
  imports: [TypeOrmModule.forFeature([Assignment, Report]), NotificationsModule],
  controllers: [AssignmentsController],
  providers: [AssignmentsService, ReportAccessService],
  exports: [AssignmentsService, ReportAccessService],
})
export class AssignmentsModule {}
