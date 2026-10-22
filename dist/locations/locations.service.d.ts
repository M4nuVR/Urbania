import { Repository } from 'typeorm';
import { AuthenticatedPrincipal } from '../common/report-access';
import { ReportAuthorizationService } from '../common/report-authorization.service';
import { CreateLocationDto } from './dto/create-location.dto';
import { UpdateLocationDto } from './dto/update-location.dto';
import { Location } from './location.entity';
export declare class LocationsService {
    private readonly locations;
    private readonly reportAuthorization;
    constructor(locations: Repository<Location>, reportAuthorization: ReportAuthorizationService);
    create(reportId: string, principal: AuthenticatedPrincipal, input: CreateLocationDto): Promise<Location>;
    findForReport(reportId: string, principal: AuthenticatedPrincipal): Promise<Location>;
    update(reportId: string, principal: AuthenticatedPrincipal, input: UpdateLocationDto): Promise<Location>;
    private validateLocation;
}
