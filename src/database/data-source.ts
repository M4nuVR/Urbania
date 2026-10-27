import 'reflect-metadata';
import { DataSource } from 'typeorm';
import { Evidence } from '../evidences/evidence.entity';
import { Location } from '../locations/location.entity';
import { Report } from '../reports/report.entity';
import { User } from '../users/user.entity';
import { AddLocationsAndEvidences1760000000000 } from './migrations/1760000000000-AddLocationsAndEvidences';

if (!process.env.DATABASE_URL) {
  throw new Error('Define DATABASE_URL para ejecutar migraciones');
}

export default new DataSource({
  type: 'postgres',
  url: process.env.DATABASE_URL,
  entities: [User, Report, Location, Evidence],
  migrations: [AddLocationsAndEvidences1760000000000],
  synchronize: false,
});
