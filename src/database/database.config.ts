import { Evidence } from '../evidences/evidence.entity';
import { Location } from '../locations/location.entity';
import { Report } from '../reports/report.entity';
import { User } from '../users/user.entity';
import { CreateUsersAndReports1759900000000 } from './migrations/1759900000000-CreateUsersAndReports';
import { AddLocationsAndEvidences1760000000000 } from './migrations/1760000000000-AddLocationsAndEvidences';

// Fuente unica para la app y para el CLI de migraciones
export const entities = [User, Report, Location, Evidence];

export const migrations = [
  CreateUsersAndReports1759900000000,
  AddLocationsAndEvidences1760000000000,
];
