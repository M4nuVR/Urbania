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
exports.LocationsService = void 0;
const common_1 = require("@nestjs/common");
const typeorm_1 = require("@nestjs/typeorm");
const node_crypto_1 = require("node:crypto");
const typeorm_2 = require("typeorm");
const report_authorization_service_1 = require("../common/report-authorization.service");
const location_entity_1 = require("./location.entity");
let LocationsService = class LocationsService {
    locations;
    reportAuthorization;
    constructor(locations, reportAuthorization) {
        this.locations = locations;
        this.reportAuthorization = reportAuthorization;
    }
    async create(reportId, principal, input) {
        await this.reportAuthorization.authorizeModification(reportId, principal);
        this.validateLocation(input);
        if (await this.locations.findOneBy({ reportId })) {
            throw new common_1.ConflictException('El reporte ya tiene una ubicacion');
        }
        const location = this.locations.create({
            id: (0, node_crypto_1.randomUUID)(),
            reportId,
            address: input.address ?? null,
            neighborhood: input.neighborhood ?? null,
            zone: input.zone ?? null,
            latitude: input.latitude ?? null,
            longitude: input.longitude ?? null,
        });
        try {
            return await this.locations.save(location);
        }
        catch (error) {
            if (error instanceof typeorm_2.QueryFailedError &&
                error.driverError.code === '23505') {
                throw new common_1.ConflictException('El reporte ya tiene una ubicacion');
            }
            throw error;
        }
    }
    async findForReport(reportId, principal) {
        await this.reportAuthorization.authorizeRead(reportId, principal);
        const location = await this.locations.findOneBy({ reportId });
        if (!location) {
            throw new common_1.NotFoundException('El reporte no tiene ubicacion registrada');
        }
        return location;
    }
    async update(reportId, principal, input) {
        await this.reportAuthorization.authorizeModification(reportId, principal);
        if (Object.keys(input).length === 0) {
            throw new common_1.BadRequestException('Debes enviar al menos un campo');
        }
        const location = await this.locations.findOneBy({ reportId });
        if (!location) {
            throw new common_1.NotFoundException('El reporte no tiene ubicacion registrada');
        }
        const updated = { ...location, ...input };
        this.validateLocation(updated);
        return this.locations.save(updated);
    }
    validateLocation(input) {
        if (!input.address?.trim() && !input.neighborhood?.trim()) {
            throw new common_1.BadRequestException('La direccion o el barrio son obligatorios');
        }
        if ((input.latitude == null) !== (input.longitude == null)) {
            throw new common_1.BadRequestException('Debes enviar latitud y longitud juntas');
        }
    }
};
exports.LocationsService = LocationsService;
exports.LocationsService = LocationsService = __decorate([
    (0, common_1.Injectable)(),
    __param(0, (0, typeorm_1.InjectRepository)(location_entity_1.Location)),
    __metadata("design:paramtypes", [typeorm_2.Repository,
        report_authorization_service_1.ReportAuthorizationService])
], LocationsService);
//# sourceMappingURL=locations.service.js.map