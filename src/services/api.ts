import { sources, entities, relationships } from "../mocks/data";
import type { Source, Entity, Relationship } from "../types";

// Hoy devuelve datos mock. Cuando el back esté listo,
// solo cambia el cuerpo de estas funciones.
const delay = <T>(data: T, ms = 350): Promise<T> =>
    new Promise((resolve) => {
        setTimeout(() => resolve(data), ms);
    });

export const getSources = (): Promise<Source[]> => delay(sources);

export const getEntities = (): Promise<Entity[]> => delay(entities);

export const getRelationships = (): Promise<Relationship[]> => delay(relationships);