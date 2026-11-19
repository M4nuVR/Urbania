import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { AssignmentsModule } from '../assignments/assignments.module';
import { NotificationsModule } from '../notifications/notifications.module';
import { TrackingController } from './tracking.controller';
import { Tracking } from './tracking.entity';
import { TrackingService } from './tracking.service';

// Dependencias en una sola dirección (sin ciclos):
// Tracking → Assignments → Notifications. Reports (Persona 2) puede importar
// TrackingModule para usar recordInitial(); Tracking no importa Reports.
@Module({
  imports: [
    TypeOrmModule.forFeature([Tracking]),
    AssignmentsModule,
    NotificationsModule,
  ],
  controllers: [TrackingController],
  providers: [TrackingService],
  exports: [TrackingService],
})
export class TrackingModule {}
