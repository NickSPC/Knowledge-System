export type Source = {
    id: number;
    name: string;
    type: string;
    status: "ok" | "error";
    lastSync: string;
    recordCount: number;
};

export type EntityType = "Cliente" | "Producto" | "Pedido";

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
    connectedIds: string[];
    relationType: string;
};