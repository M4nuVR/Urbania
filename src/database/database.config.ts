import { Category } from '../categories/entities/category.entity';
import { Evidence } from '../evidences/evidence.entity';
import { Location } from '../locations/location.entity';
import { Profile } from '../profiles/entities/profile.entity';
import { Report } from '../reports/report.entity';
import { User } from '../users/user.entity';
import { CreateUsersAndReports1759900000000 } from './migrations/1759900000000-CreateUsersAndReports';
import { AddLocationsAndEvidences1760000000000 } from './migrations/1760000000000-AddLocationsAndEvidences';
import { CreateCategories1794960000000 } from './migrations/1794960000000-CreateCategories';
import { CreateProfiles1795000000000 } from './migrations/1795000000000-CreateProfiles';
import { LinkReportsToCategories1795100000000 } from './migrations/1795100000000-LinkReportsToCategories';

// Fuente unica para la app y para el CLI de migraciones
export const entities = [User, Report, Location, Evidence, Category, Profile];

export const migrations = [
  CreateUsersAndReports1759900000000,
  AddLocationsAndEvidences1760000000000,
  CreateCategories1794960000000,
  CreateProfiles1795000000000,
  LinkReportsToCategories1795100000000,
];
