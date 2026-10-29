import { Module } from '@nestjs/common';
import { NotificationsModule } from '../notifications/notifications.module.js';
import { AssignmentsController } from './assignments.controller.js';
import { AssignmentsService } from './assignments.service.js';
import { ReportAccessService } from './report-access.service.js';

@Module({
  imports: [NotificationsModule],
  controllers: [AssignmentsController],
  providers: [AssignmentsService, ReportAccessService],
  exports: [AssignmentsService, ReportAccessService],
})
export class AssignmentsModule {}
