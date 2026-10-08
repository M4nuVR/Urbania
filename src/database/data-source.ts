import 'reflect-metadata';
import { DataSource } from 'typeorm';
import { Evidence } from '../evidences/evidence.entity';
import { Location } from '../locations/location.entity';
import { AddLocationsAndEvidences1760000000000 } from './migrations/1760000000000-AddLocationsAndEvidences';

if (!process.env.DATABASE_URL) {
  throw new Error('Define DATABASE_URL para ejecutar migraciones');
}

export default new DataSource({
  type: 'postgres',
  url: process.env.DATABASE_URL,
  entities: [Location, Evidence],
  migrations: [AddLocationsAndEvidences1760000000000],
  synchronize: false,
});
