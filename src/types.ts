export type Source = {
    id: number;
    name: string;
    type: string;
    status: "ok" | "error";
    lastSync: string | null;
    recordCount: number;
};

export type EntityType = string;

export type Entity = {
    id: string;
    type: EntityType;
    name: string;
    source: string;
    data: Record<string, string | number>;
};

export type Relationship = {
    sourceId: string;
    targetId: string;
    type: string;
};

export type EntityInput = {
    name: string;
    type: EntityType;
    data: Record<string, string | number>;
    connectedIds: string[];
    relationType: string;
};

export type User = {
    id: number;
    email: string;
    nombre: string | null;
    rol: "admin" | "editor" | "lector";
};

// GET /api/entities/<id>/history: "antes"/"despues" son fotos de la entidad o de la relación
export type HistoryEntry = {
    accion: string;
    usuario: string | null;
    antes: Record<string, unknown> | null;
    despues: Record<string, unknown> | null;
    fecha: string;
};

// POST /api/import: los ids de entities son referencias locales del archivo
export type ImportPayload = {
    replace?: boolean;
    entities: (Omit<Entity, "source"> & { source?: string; data?: Entity["data"] })[];
    relationships: Relationship[];
};

export type ImportResult = {
    entities: number;
    relationships: number;
    ids: Record<string, string>;
};
