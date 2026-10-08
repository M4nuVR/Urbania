import { Module } from '@nestjs/common';
import { TypeOrmModule, TypeOrmModuleOptions } from '@nestjs/typeorm';
import { AppController } from './app.controller';
import { AppService } from './app.service';
import { Evidence } from './evidences/evidence.entity';
import { EvidencesModule } from './evidences/evidences.module';
import { Location } from './locations/location.entity';
import { LocationsModule } from './locations/locations.module';
import { AddLocationsAndEvidences1760000000000 } from './database/migrations/1760000000000-AddLocationsAndEvidences';

const databaseOptions: TypeOrmModuleOptions =
  process.env.NODE_ENV === 'test'
    ? {
        type: 'sqljs',
        autoSave: false,
        entities: [Location, Evidence],
        synchronize: true,
      }
    : {
        type: 'postgres',
        url: process.env.DATABASE_URL ?? '',
        entities: [Location, Evidence],
        migrations: [AddLocationsAndEvidences1760000000000],
        synchronize: false,
      };

@Module({
  imports: [
    TypeOrmModule.forRoot(databaseOptions),
    LocationsModule,
    EvidencesModule,
  ],
  controllers: [AppController],
  providers: [AppService],
})
export class AppModule {}
