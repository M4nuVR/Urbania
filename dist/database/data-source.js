"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
require("reflect-metadata");
const typeorm_1 = require("typeorm");
const evidence_entity_1 = require("../evidences/evidence.entity");
const location_entity_1 = require("../locations/location.entity");
const _1760000000000_AddLocationsAndEvidences_1 = require("./migrations/1760000000000-AddLocationsAndEvidences");
if (!process.env.DATABASE_URL) {
    throw new Error('Define DATABASE_URL para ejecutar migraciones');
}
exports.default = new typeorm_1.DataSource({
    type: 'postgres',
    url: process.env.DATABASE_URL,
    entities: [location_entity_1.Location, evidence_entity_1.Evidence],
    migrations: [_1760000000000_AddLocationsAndEvidences_1.AddLocationsAndEvidences1760000000000],
    synchronize: false,
});
//# sourceMappingURL=data-source.js.map