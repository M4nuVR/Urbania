export interface AuthenticatedPrincipal {
    id: string;
    roles: readonly string[];
}
export interface AccessibleReport {
    id: string;
    ownerId: string;
    status: string;
}
export interface ReportAccessPort {
    findById(reportId: string): Promise<AccessibleReport | null>;
    canRead(principal: AuthenticatedPrincipal, report: AccessibleReport): Promise<boolean>;
    canModify(principal: AuthenticatedPrincipal, report: AccessibleReport): Promise<boolean>;
}
export declare const REPORT_ACCESS_PORT: unique symbol;
