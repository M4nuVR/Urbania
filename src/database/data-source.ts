import 'reflect-metadata';
import { DataSource } from 'typeorm';
import { entities, migrations } from './database.config';

if (!process.env.DATABASE_URL) {
  throw new Error('Define DATABASE_URL para ejecutar migraciones');
}

export default new DataSource({
  type: 'postgres',
  url: process.env.DATABASE_URL,
  entities,
  migrations,
  synchronize: false,
});
