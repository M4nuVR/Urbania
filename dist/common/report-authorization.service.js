"use strict";
var __decorate = (this && this.__decorate) || function (decorators, target, key, desc) {
    var c = arguments.length, r = c < 3 ? target : desc === null ? desc = Object.getOwnPropertyDescriptor(target, key) : desc, d;
    if (typeof Reflect === "object" && typeof Reflect.decorate === "function") r = Reflect.decorate(decorators, target, key, desc);
    else for (var i = decorators.length - 1; i >= 0; i--) if (d = decorators[i]) r = (c < 3 ? d(r) : c > 3 ? d(target, key, r) : d(target, key)) || r;
    return c > 3 && r && Object.defineProperty(target, key, r), r;
};
var __metadata = (this && this.__metadata) || function (k, v) {
    if (typeof Reflect === "object" && typeof Reflect.metadata === "function") return Reflect.metadata(k, v);
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.ReportAuthorizationService = void 0;
const common_1 = require("@nestjs/common");
const core_1 = require("@nestjs/core");
const report_access_1 = require("./report-access");
let ReportAuthorizationService = class ReportAuthorizationService {
    moduleRef;
    constructor(moduleRef) {
        this.moduleRef = moduleRef;
    }
    async authorizeRead(reportId, principal) {
        const reportAccess = this.getReportAccess();
        const report = await this.findReport(reportId, reportAccess);
        if (!(await reportAccess.canRead(principal, report))) {
            throw new common_1.ForbiddenException('No tienes permiso para consultar este reporte');
        }
        return report;
    }
    async authorizeModification(reportId, principal) {
        const reportAccess = this.getReportAccess();
        const report = await this.findReport(reportId, reportAccess);
        if (report.ownerId !== principal.id ||
            !(await reportAccess.canModify(principal, report))) {
            throw new common_1.ForbiddenException('Solo el propietario puede modificar este reporte');
        }
        if (report.status !== 'REPORTED') {
            throw new common_1.ConflictException('El reporte ya no permite modificaciones');
        }
        return report;
    }
    async findReport(reportId, reportAccess) {
        const report = await reportAccess.findById(reportId);
        if (!report) {
            throw new common_1.NotFoundException('Reporte no encontrado');
        }
        return report;
    }
    getReportAccess() {
        try {
            const reportAccess = this.moduleRef.get(report_access_1.REPORT_ACCESS_PORT, {
                strict: false,
            });
            if (reportAccess) {
                return reportAccess;
            }
        }
        catch {
            throw new common_1.ServiceUnavailableException('El módulo de reportes aún no ha registrado su adaptador de permisos');
        }
        throw new common_1.ServiceUnavailableException('El módulo de reportes aún no ha registrado su adaptador de permisos');
    }
};
exports.ReportAuthorizationService = ReportAuthorizationService;
exports.ReportAuthorizationService = ReportAuthorizationService = __decorate([
    (0, common_1.Injectable)(),
    __metadata("design:paramtypes", [core_1.ModuleRef])
], ReportAuthorizationService);
//# sourceMappingURL=report-authorization.service.js.map