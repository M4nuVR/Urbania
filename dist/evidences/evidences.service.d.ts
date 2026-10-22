import { Repository } from 'typeorm';
import { AuthenticatedPrincipal } from '../common/report-access';
import { ReportAuthorizationService } from '../common/report-authorization.service';
import { CreateEvidenceDto } from './dto/create-evidence.dto';
import { Evidence } from './evidence.entity';
export declare class EvidencesService {
    private readonly evidences;
    private readonly reportAuthorization;
    constructor(evidences: Repository<Evidence>, reportAuthorization: ReportAuthorizationService);
    create(reportId: string, principal: AuthenticatedPrincipal, input: CreateEvidenceDto): Promise<Evidence>;
    findForReport(reportId: string, principal: AuthenticatedPrincipal): Promise<Evidence[]>;
    remove(evidenceId: string, principal: AuthenticatedPrincipal): Promise<void>;
    private validateUrlProtocol;
}
