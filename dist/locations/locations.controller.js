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
exports.LocationsController = void 0;
const common_1 = require("@nestjs/common");
const swagger_1 = require("@nestjs/swagger");
const current_principal_decorator_1 = require("../common/current-principal.decorator");
const create_location_dto_1 = require("./dto/create-location.dto");
const update_location_dto_1 = require("./dto/update-location.dto");
const location_entity_1 = require("./location.entity");
const locations_service_1 = require("./locations.service");
let LocationsController = class LocationsController {
    locationsService;
    constructor(locationsService) {
        this.locationsService = locationsService;
    }
    create(reportId, principal, input) {
        return this.locationsService.create(reportId, principal, input);
    }
    find(reportId, principal) {
        return this.locationsService.findForReport(reportId, principal);
    }
    update(reportId, principal, input) {
        return this.locationsService.update(reportId, principal, input);
    }
};
exports.LocationsController = LocationsController;
__decorate([
    (0, common_1.Post)(),
    (0, swagger_1.ApiOperation)({ summary: 'Registrar la ubicacion de un reporte' }),
    (0, swagger_1.ApiCreatedResponse)({ type: location_entity_1.Location }),
    (0, swagger_1.ApiBadRequestResponse)({
        description: 'Coordenadas incompletas o sin referencia textual util',
    }),
    (0, swagger_1.ApiConflictResponse)({
        description: 'El reporte ya tiene ubicacion o ya no esta REPORTED',
    }),
    (0, swagger_1.ApiForbiddenResponse)({ description: 'El ciudadano no es propietario' }),
    (0, swagger_1.ApiNotFoundResponse)({ description: 'Reporte no encontrado' }),
    __param(0, (0, common_1.Param)('id', common_1.ParseUUIDPipe)),
    __param(1, (0, current_principal_decorator_1.CurrentPrincipal)()),
    __param(2, (0, common_1.Body)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String, Object, create_location_dto_1.CreateLocationDto]),
    __metadata("design:returntype", Promise)
], LocationsController.prototype, "create", null);
__decorate([
    (0, common_1.Get)(),
    (0, swagger_1.ApiOperation)({ summary: 'Consultar la ubicacion de un reporte autorizado' }),
    (0, swagger_1.ApiOkResponse)({ type: location_entity_1.Location }),
    (0, swagger_1.ApiForbiddenResponse)({ description: 'Sin permiso para consultar el reporte' }),
    (0, swagger_1.ApiNotFoundResponse)({ description: 'Reporte o ubicacion no encontrados' }),
    __param(0, (0, common_1.Param)('id', common_1.ParseUUIDPipe)),
    __param(1, (0, current_principal_decorator_1.CurrentPrincipal)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String, Object]),
    __metadata("design:returntype", Promise)
], LocationsController.prototype, "find", null);
__decorate([
    (0, common_1.Patch)(),
    (0, swagger_1.ApiOperation)({
        summary: 'Actualizar la ubicacion mientras el reporte este REPORTED',
    }),
    (0, swagger_1.ApiOkResponse)({ type: location_entity_1.Location }),
    (0, swagger_1.ApiBadRequestResponse)({
        description: 'Coordenadas incompletas, body vacio o sin referencia textual util',
    }),
    (0, swagger_1.ApiConflictResponse)({ description: 'El reporte ya no permite modificaciones' }),
    (0, swagger_1.ApiForbiddenResponse)({ description: 'El ciudadano no es propietario' }),
    (0, swagger_1.ApiNotFoundResponse)({ description: 'Reporte o ubicacion no encontrados' }),
    __param(0, (0, common_1.Param)('id', common_1.ParseUUIDPipe)),
    __param(1, (0, current_principal_decorator_1.CurrentPrincipal)()),
    __param(2, (0, common_1.Body)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String, Object, update_location_dto_1.UpdateLocationDto]),
    __metadata("design:returntype", Promise)
], LocationsController.prototype, "update", null);
exports.LocationsController = LocationsController = __decorate([
    (0, swagger_1.ApiTags)('locations'),
    (0, swagger_1.ApiBearerAuth)(),
    (0, common_1.Controller)('reports/:id/location'),
    __metadata("design:paramtypes", [locations_service_1.LocationsService])
], LocationsController);
//# sourceMappingURL=locations.controller.js.map