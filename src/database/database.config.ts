import { Assignment } from '../assignments/assignment.entity';
import { Evidence } from '../evidences/evidence.entity';
import { Location } from '../locations/location.entity';
import { Notification } from '../notifications/notification.entity';
import { Report } from '../reports/report.entity';
import { Tracking } from '../tracking/tracking.entity';
import { User } from '../users/user.entity';
import { CreateUsersAndReports1759900000000 } from './migrations/1759900000000-CreateUsersAndReports';
import { AddLocationsAndEvidences1760000000000 } from './migrations/1760000000000-AddLocationsAndEvidences';
import { AddAssignmentsTrackingNotifications1761000000000 } from './migrations/1761000000000-AddAssignmentsTrackingNotifications';

// Fuente unica para la app y para el CLI de migraciones
export const entities = [
  User,
  Report,
  Location,
  Evidence,
  Assignment,
  Tracking,
  Notification,
];

export const migrations = [
  CreateUsersAndReports1759900000000,
  AddLocationsAndEvidences1760000000000,
  AddAssignmentsTrackingNotifications1761000000000,
];
