import { Assignment } from '../assignments/assignment.entity';
import { Evidence } from '../evidences/evidence.entity';
import { Location } from '../locations/location.entity';
import { Notification } from '../notifications/notification.entity';
import { Report } from '../reports/report.entity';
import { Tracking } from '../tracking/tracking.entity';
import { User } from '../users/user.entity';
import { CreateUsersAndReports1759000000000 } from './migrations/1759000000000-CreateUsersAndReports';
import { AddLocationsAndEvidences1760000000000 } from './migrations/1760000000000-AddLocationsAndEvidences';
import { AddAssignmentsTrackingNotifications1761000000000 } from './migrations/1761000000000-AddAssignmentsTrackingNotifications';

// Lista única que usan AppModule y el CLI de migraciones (data-source.ts).
// Al crear una entidad o migración nueva, agregarla aquí.
export const ENTITIES = [
  User,
  Report,
  Location,
  Evidence,
  Assignment,
  Tracking,
  Notification,
];

export const MIGRATIONS = [
  CreateUsersAndReports1759000000000,
  AddLocationsAndEvidences1760000000000,
  AddAssignmentsTrackingNotifications1761000000000,
];
