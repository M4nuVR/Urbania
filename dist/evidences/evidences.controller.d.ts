import type { AuthenticatedPrincipal } from '../common/report-access';
import { CreateEvidenceDto } from './dto/create-evidence.dto';
import { Evidence } from './evidence.entity';
import { EvidencesService } from './evidences.service';
export declare class EvidencesController {
    private readonly evidencesService;
    constructor(evidencesService: EvidencesService);
    create(reportId: string, principal: AuthenticatedPrincipal, input: CreateEvidenceDto): Promise<Evidence>;
    find(reportId: string, principal: AuthenticatedPrincipal): Promise<Evidence[]>;
    remove(evidenceId: string, principal: AuthenticatedPrincipal): Promise<void>;
}
