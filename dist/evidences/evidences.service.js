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
var __param = (this && this.__param) || function (paramIndex, decorator) {
    return function (target, key) { decorator(target, key, paramIndex); }
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.EvidencesService = void 0;
const common_1 = require("@nestjs/common");
const typeorm_1 = require("@nestjs/typeorm");
const node_crypto_1 = require("node:crypto");
const typeorm_2 = require("typeorm");
const report_authorization_service_1 = require("../common/report-authorization.service");
const evidence_entity_1 = require("./evidence.entity");
let EvidencesService = class EvidencesService {
    evidences;
    reportAuthorization;
    constructor(evidences, reportAuthorization) {
        this.evidences = evidences;
        this.reportAuthorization = reportAuthorization;
    }
    async create(reportId, principal, input) {
        await this.reportAuthorization.authorizeModification(reportId, principal);
        this.validateUrlProtocol(input.url);
        return this.evidences.save(this.evidences.create({
            ...input,
            id: (0, node_crypto_1.randomUUID)(),
            reportId,
            description: input.description ?? null,
        }));
    }
    async findForReport(reportId, principal) {
        await this.reportAuthorization.authorizeRead(reportId, principal);
        return this.evidences.find({
            where: { reportId },
            order: { createdAt: 'ASC' },
        });
    }
    async remove(evidenceId, principal) {
        const evidence = await this.evidences.findOneBy({ id: evidenceId });
        if (!evidence) {
            throw new common_1.NotFoundException('Evidencia no encontrada');
        }
        await this.reportAuthorization.authorizeModification(evidence.reportId, principal);
        await this.evidences.remove(evidence);
    }
    validateUrlProtocol(url) {
        let protocol;
        try {
            protocol = new URL(url).protocol;
        }
        catch {
            throw new common_1.BadRequestException('La URL de evidencia no es valida');
        }
        if (protocol === 'https:') {
            return;
        }
        if (protocol === 'http:' && process.env.NODE_ENV !== 'production') {
            return;
        }
        throw new common_1.BadRequestException('La URL de evidencia debe usar HTTPS; HTTP solo se permite en desarrollo');
    }
};
exports.EvidencesService = EvidencesService;
exports.EvidencesService = EvidencesService = __decorate([
    (0, common_1.Injectable)(),
    __param(0, (0, typeorm_1.InjectRepository)(evidence_entity_1.Evidence)),
    __metadata("design:paramtypes", [typeorm_2.Repository,
        report_authorization_service_1.ReportAuthorizationService])
], EvidencesService);
//# sourceMappingURL=evidences.service.js.map