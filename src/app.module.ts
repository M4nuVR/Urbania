import { Module } from '@nestjs/common';
import { TypeOrmModule, TypeOrmModuleOptions } from '@nestjs/typeorm';
import { AppController } from './app.controller';
import { AppService } from './app.service';
import { AuthModule } from './auth/auth.module';
import { entities, migrations } from './database/database.config';
import { EvidencesModule } from './evidences/evidences.module';
import { LocationsModule } from './locations/locations.module';
import { ReportsModule } from './reports/reports.module';
import { UsersModule } from './users/users.module';

const databaseOptions: TypeOrmModuleOptions =
  process.env.NODE_ENV === 'test'
    ? {
        type: 'sqljs',
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
  ],
  controllers: [AppController],
  providers: [AppService],
})
export class AppModule {}
