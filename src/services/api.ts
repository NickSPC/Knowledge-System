import { sources, entities, relationships } from "../mocks/data";
import type {
    Source,
    Entity,
    Relationship,
    EntityType,
    EntityInput,
} from "../types";

// Simula el retraso de una solicitud real
const delay = <T,>(data: T, ms = 350): Promise<T> => new Promise((resolve) => setTimeout(() => resolve(data), ms));

// Copias en memoria de los datos simulados: los cambios persisten hasta que se recarga la página.
// Cuando el backend esté listo, estas funciones llamarán a la API real en su lugar.
let entityStore: Entity[] = [...entities];
let relationshipStore: Relationship[] = [...relationships];
let nextId = 100;

const idPrefix: Record<EntityType, string> = {
    Cliente: "cli",
    Producto: "pro",
    Pedido: "ped",
};

export const getSources = (): Promise<Source[]> => delay(sources);

export const getEntities = (): Promise<Entity[]> => delay([...entityStore]);

export const getRelationships = (): Promise<Relationship[]> =>
    delay([...relationshipStore]);

export const createEntity = (input: EntityInput): Promise<Entity> => {
    const entity: Entity = {
        id: `${idPrefix[input.type]}-${nextId++}`,
        type: input.type,
        name: input.name,
        source: "Manual",
        data: { creado: new Date().toLocaleDateString("es-AR") },
    };

    entityStore = [...entityStore, entity];

    relationshipStore = [
        ...relationshipStore,
        ...input.connectedIds.map((targetId) => ({
            sourceId: entity.id,
            targetId,
            type: input.relationType,
        })),
    ];

    return delay(entity, 200);
};

export const updateEntity = (
    id: string,
    changes: Pick<EntityInput, "name" | "type">,
): Promise<void> => {
    entityStore = entityStore.map((entity) =>
        entity.id === id ? { ...entity, ...changes } : entity,
    );

    return delay(undefined, 200);
};

// Eliminar una entidad también elimina todas las relaciones en las que participa.
export const deleteEntity = (id: string): Promise<void> => {
    entityStore = entityStore.filter((entity) => entity.id !== id);

    relationshipStore = relationshipStore.filter(
        (relationship) =>
            relationship.sourceId !== id && relationship.targetId !== id,
    );

    return delay(undefined, 200);
};