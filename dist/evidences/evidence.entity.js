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
exports.Evidence = exports.EvidenceType = void 0;
const swagger_1 = require("@nestjs/swagger");
const typeorm_1 = require("typeorm");
var EvidenceType;
(function (EvidenceType) {
    EvidenceType["IMAGE"] = "IMAGE";
    EvidenceType["FILE"] = "FILE";
})(EvidenceType || (exports.EvidenceType = EvidenceType = {}));
let Evidence = class Evidence {
    id;
    reportId;
    url;
    type;
    description;
    createdAt;
};
exports.Evidence = Evidence;
__decorate([
    (0, swagger_1.ApiProperty)({ format: 'uuid' }),
    (0, typeorm_1.PrimaryColumn)('uuid'),
    __metadata("design:type", String)
], Evidence.prototype, "id", void 0);
__decorate([
    (0, swagger_1.ApiProperty)({ format: 'uuid' }),
    (0, typeorm_1.Column)({ type: 'uuid' }),
    __metadata("design:type", String)
], Evidence.prototype, "reportId", void 0);
__decorate([
    (0, swagger_1.ApiProperty)({
        format: 'uri',
        example: 'https://files.example.org/evidence/photo.jpg',
    }),
    (0, typeorm_1.Column)({ type: 'varchar', length: 2048 }),
    __metadata("design:type", String)
], Evidence.prototype, "url", void 0);
__decorate([
    (0, swagger_1.ApiProperty)({ enum: EvidenceType }),
    (0, typeorm_1.Column)({ type: 'varchar', length: 16 }),
    __metadata("design:type", String)
], Evidence.prototype, "type", void 0);
__decorate([
    (0, swagger_1.ApiPropertyOptional)({ maxLength: 500, nullable: true }),
    (0, typeorm_1.Column)({ type: 'varchar', length: 500, nullable: true }),
    __metadata("design:type", Object)
], Evidence.prototype, "description", void 0);
__decorate([
    (0, swagger_1.ApiProperty)({ type: String, format: 'date-time' }),
    (0, typeorm_1.CreateDateColumn)({ type: 'timestamptz' }),
    __metadata("design:type", Date)
], Evidence.prototype, "createdAt", void 0);
exports.Evidence = Evidence = __decorate([
    (0, typeorm_1.Entity)({ name: 'evidences' }),
    (0, typeorm_1.Index)('idx_evidences_report_id', ['reportId'])
], Evidence);
//# sourceMappingURL=evidence.entity.js.map