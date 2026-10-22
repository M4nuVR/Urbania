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
exports.CreateEvidenceDto = void 0;
const swagger_1 = require("@nestjs/swagger");
const class_validator_1 = require("class-validator");
const evidence_entity_1 = require("../evidence.entity");
class CreateEvidenceDto {
    url;
    type;
    description;
}
exports.CreateEvidenceDto = CreateEvidenceDto;
__decorate([
    (0, swagger_1.ApiProperty)({ example: 'https://files.example.org/evidence/photo.jpg' }),
    (0, class_validator_1.IsString)(),
    (0, class_validator_1.MaxLength)(2048),
    (0, class_validator_1.IsUrl)({ protocols: ['https', 'http'], require_protocol: true }),
    __metadata("design:type", String)
], CreateEvidenceDto.prototype, "url", void 0);
__decorate([
    (0, swagger_1.ApiProperty)({ enum: evidence_entity_1.EvidenceType, example: evidence_entity_1.EvidenceType.IMAGE }),
    (0, class_validator_1.IsEnum)(evidence_entity_1.EvidenceType),
    __metadata("design:type", String)
], CreateEvidenceDto.prototype, "type", void 0);
__decorate([
    (0, swagger_1.ApiPropertyOptional)({
        example: 'Bache junto a la interseccion',
        maxLength: 500,
    }),
    (0, class_validator_1.IsOptional)(),
    (0, class_validator_1.IsString)(),
    (0, class_validator_1.MaxLength)(500),
    __metadata("design:type", String)
], CreateEvidenceDto.prototype, "description", void 0);
//# sourceMappingURL=create-evidence.dto.js.map