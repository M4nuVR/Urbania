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
exports.EvidencesController = void 0;
const common_1 = require("@nestjs/common");
const swagger_1 = require("@nestjs/swagger");
const current_principal_decorator_1 = require("../common/current-principal.decorator");
const create_evidence_dto_1 = require("./dto/create-evidence.dto");
const evidence_entity_1 = require("./evidence.entity");
const evidences_service_1 = require("./evidences.service");
let EvidencesController = class EvidencesController {
    evidencesService;
    constructor(evidencesService) {
        this.evidencesService = evidencesService;
    }
    create(reportId, principal, input) {
        return this.evidencesService.create(reportId, principal, input);
    }
    find(reportId, principal) {
        return this.evidencesService.findForReport(reportId, principal);
    }
    remove(evidenceId, principal) {
        return this.evidencesService.remove(evidenceId, principal);
    }
};
exports.EvidencesController = EvidencesController;
__decorate([
    (0, common_1.Post)('reports/:id/evidences'),
    (0, swagger_1.ApiOperation)({
        summary: 'Registrar metadatos de una evidencia por URL',
        description: 'Guarda solo la URL. No carga, inspecciona ni elimina archivos remotos.',
    }),
    (0, swagger_1.ApiCreatedResponse)({ type: evidence_entity_1.Evidence }),
    (0, swagger_1.ApiBadRequestResponse)({ description: 'URL invalida o protocolo no permitido' }),
    (0, swagger_1.ApiForbiddenResponse)({ description: 'El ciudadano no es propietario' }),
    (0, swagger_1.ApiNotFoundResponse)({ description: 'Reporte no encontrado' }),
    __param(0, (0, common_1.Param)('id', common_1.ParseUUIDPipe)),
    __param(1, (0, current_principal_decorator_1.CurrentPrincipal)()),
    __param(2, (0, common_1.Body)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String, Object, create_evidence_dto_1.CreateEvidenceDto]),
    __metadata("design:returntype", Promise)
], EvidencesController.prototype, "create", null);
__decorate([
    (0, common_1.Get)('reports/:id/evidences'),
    (0, swagger_1.ApiOperation)({ summary: 'Consultar evidencias de un reporte autorizado' }),
    (0, swagger_1.ApiOkResponse)({ type: evidence_entity_1.Evidence, isArray: true }),
    (0, swagger_1.ApiForbiddenResponse)({ description: 'Sin permiso para consultar el reporte' }),
    (0, swagger_1.ApiNotFoundResponse)({ description: 'Reporte no encontrado' }),
    __param(0, (0, common_1.Param)('id', common_1.ParseUUIDPipe)),
    __param(1, (0, current_principal_decorator_1.CurrentPrincipal)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String, Object]),
    __metadata("design:returntype", Promise)
], EvidencesController.prototype, "find", null);
__decorate([
    (0, common_1.Delete)('evidences/:id'),
    (0, common_1.HttpCode)(204),
    (0, swagger_1.ApiOperation)({ summary: 'Eliminar los metadatos de una evidencia propia' }),
    (0, swagger_1.ApiNoContentResponse)({
        description: 'Metadatos eliminados; el archivo remoto permanece',
    }),
    (0, swagger_1.ApiForbiddenResponse)({ description: 'El ciudadano no es propietario' }),
    (0, swagger_1.ApiNotFoundResponse)({ description: 'Evidencia o reporte no encontrados' }),
    __param(0, (0, common_1.Param)('id', common_1.ParseUUIDPipe)),
    __param(1, (0, current_principal_decorator_1.CurrentPrincipal)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String, Object]),
    __metadata("design:returntype", Promise)
], EvidencesController.prototype, "remove", null);
exports.EvidencesController = EvidencesController = __decorate([
    (0, swagger_1.ApiTags)('evidences'),
    (0, swagger_1.ApiBearerAuth)(),
    (0, common_1.Controller)(),
    __metadata("design:paramtypes", [evidences_service_1.EvidencesService])
], EvidencesController);
//# sourceMappingURL=evidences.controller.js.map