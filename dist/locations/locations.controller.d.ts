import type { AuthenticatedPrincipal } from '../common/report-access';
import { CreateLocationDto } from './dto/create-location.dto';
import { UpdateLocationDto } from './dto/update-location.dto';
import { Location } from './location.entity';
import { LocationsService } from './locations.service';
export declare class LocationsController {
    private readonly locationsService;
    constructor(locationsService: LocationsService);
    create(reportId: string, principal: AuthenticatedPrincipal, input: CreateLocationDto): Promise<Location>;
    find(reportId: string, principal: AuthenticatedPrincipal): Promise<Location>;
    update(reportId: string, principal: AuthenticatedPrincipal, input: UpdateLocationDto): Promise<Location>;
}
