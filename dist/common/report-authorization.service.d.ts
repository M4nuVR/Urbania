import { ModuleRef } from '@nestjs/core';
import { AccessibleReport, AuthenticatedPrincipal } from './report-access';
export declare class ReportAuthorizationService {
    private readonly moduleRef;
    constructor(moduleRef: ModuleRef);
    authorizeRead(reportId: string, principal: AuthenticatedPrincipal): Promise<AccessibleReport>;
    authorizeModification(reportId: string, principal: AuthenticatedPrincipal): Promise<AccessibleReport>;
    private findReport;
    private getReportAccess;
}
