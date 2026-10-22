export declare enum EvidenceType {
    IMAGE = "IMAGE",
    FILE = "FILE"
}
export declare class Evidence {
    id: string;
    reportId: string;
    url: string;
    type: EvidenceType;
    description: string | null;
    createdAt: Date;
}
