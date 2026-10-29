import { Module } from '@nestjs/common';
import { AssignmentsModule } from '../assignments/assignments.module.js';
import { NotificationsModule } from '../notifications/notifications.module.js';
import { TrackingController } from './tracking.controller.js';
import { TrackingService } from './tracking.service.js';

// Dependencias en una sola dirección (sin ciclos):
// Tracking → Assignments → Notifications. Reports (Persona 2) puede importar
// TrackingModule para usar recordInitial(); Tracking no importa Reports.
@Module({
  imports: [AssignmentsModule, NotificationsModule],
  controllers: [TrackingController],
  providers: [TrackingService],
  exports: [TrackingService],
})
export class TrackingModule {}
