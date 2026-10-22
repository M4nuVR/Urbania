import { EvidenceType } from '../evidence.entity';
export declare class CreateEvidenceDto {
    url: string;
    type: EvidenceType;
    description?: string;
}
