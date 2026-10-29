import { Module } from '@nestjs/common';
import { TypeOrmModule, TypeOrmModuleOptions } from '@nestjs/typeorm';
import { AppController } from './app.controller';
import { AppService } from './app.service';
import { AssignmentsModule } from './assignments/assignments.module';
import { AuthModule } from './auth/auth.module';
import { entities, migrations } from './database/database.config';
import { EvidencesModule } from './evidences/evidences.module';
import { LocationsModule } from './locations/locations.module';
import { NotificationsModule } from './notifications/notifications.module';
import { ReportsModule } from './reports/reports.module';
import { TrackingModule } from './tracking/tracking.module';
import { UsersModule } from './users/users.module';

const databaseOptions: TypeOrmModuleOptions =
  process.env.NODE_ENV === 'test'
    ? {
        type: 'sqljs',
        // Se pasa explicito porque TypeORM no logra cargarlo bajo jest
        driver: require('sql.js'),
        autoSave: false,
        entities,
        synchronize: true,
      }
    : {
        type: 'postgres',
        url: process.env.DATABASE_URL ?? '',
        entities,
        migrations,
        synchronize: false,
      };

@Module({
  imports: [
    TypeOrmModule.forRoot(databaseOptions),
    UsersModule,
    AuthModule,
    ReportsModule,
    LocationsModule,
    EvidencesModule,
    // Persona 4: atencion, seguimiento y notificaciones
    AssignmentsModule,
    TrackingModule,
    NotificationsModule,
  ],
  controllers: [AppController],
  providers: [AppService],
})
export class AppModule {}
