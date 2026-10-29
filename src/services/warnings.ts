import type { Entity, Relationship } from "../types";

export type Warning = {
  kind: string; // título del grupo, p. ej. «Nodos sin conexiones»
  severity: "error" | "warning" | "info";
  detail: string;
  entityIds: string[];
};

// «Cemento portland x50kg» y «Cemento Portland 50 kg» -> «cementoportland50kg»
export function normalizeName(name: string): string {
  return name
    .normalize("NFD")
    .replace(/[̀-ͯ]/g, "")
    .toLowerCase()
    .replace(/\bx(?=\d)/g, "") // «x50kg» = «50 kg»
    .replace(/[^a-z0-9]/g, "");
}

const ISO_DATE = /^\d{4}-\d{2}-\d{2}$/;
const NOT_AVAILABLE = /mantenimiento|licencia|fuera de servicio|de baja/i;

// Revisa los datos cargados y devuelve los problemas comunes que conviene mirar
export function computeWarnings(
  entities: Entity[],
  relationships: Relationship[],
  today = new Date().toISOString().slice(0, 10),
): Warning[] {
  const warnings: Warning[] = [];
  const byId = new Map(entities.map((entity) => [entity.id, entity]));
  const connected = new Set(relationships.flatMap((relationship) => [relationship.sourceId, relationship.targetId]));

  // Nodos sin ninguna conexión
  for (const entity of entities) {
    if (!connected.has(entity.id)) {
      warnings.push({
        kind: "Nodos sin conexiones",
        severity: "warning",
        detail: `«${entity.name}» (${entity.type}) no está conectado a nada.`,
        entityIds: [entity.id],
      });
    }
  }

  // Posibles duplicados: mismo tipo y mismo nombre normalizado
  const groups = new Map<string, Entity[]>();
  for (const entity of entities) {
    const key = `${entity.type}|${normalizeName(entity.name)}`;
    groups.set(key, [...(groups.get(key) ?? []), entity]);
  }
  for (const group of groups.values()) {
    if (group.length > 1) {
      warnings.push({
        kind: "Posibles duplicados",
        severity: "error",
        detail: `${group.map((entity) => `«${entity.name}»`).join(" y ")} parecen ser el mismo ${group[0].type}.`,
        entityIds: group.map((entity) => entity.id),
      });
    }
  }

  // Nodos vacíos: sin ningún dato cargado
  for (const entity of entities) {
    if (Object.keys(entity.data).length === 0) {
      warnings.push({
        kind: "Nodos sin datos",
        severity: "info",
        detail: `«${entity.name}» no tiene ningún detalle cargado.`,
        entityIds: [entity.id],
      });
    }
  }

  // Un nodo «asignado» a varios nodos del mismo tipo (p. ej. una máquina en dos obras). Solo relaciones de
  // asignación: «requiere» o «usado en» varias veces es normal.
  const multi = new Map<string, Relationship[]>();
  for (const relationship of relationships) {
    if (!/asign/i.test(relationship.type)) continue;
    const target = byId.get(relationship.targetId);
    if (!target) continue;
    const key = `${relationship.sourceId}|${relationship.type}|${target.type}`;
    multi.set(key, [...(multi.get(key) ?? []), relationship]);
  }
  for (const group of multi.values()) {
    const source = byId.get(group[0].sourceId);
    if (group.length < 2 || !source) continue;
    const targets = group.map((relationship) => byId.get(relationship.targetId)!);
    warnings.push({
      kind: "Asignaciones múltiples",
      severity: "warning",
      detail: `«${source.name}» tiene ${targets.length} conexiones «${group[0].type}» a la vez (${targets[0].type}): ${targets.map((target) => target.name).join(", ")}.`,
      entityIds: [source.id, ...targets.map((target) => target.id)],
    });
  }

  for (const entity of entities) {
    const data = entity.data;
    // Fechas de vencimiento pasadas (campos que contienen «vence»)
    for (const [key, value] of Object.entries(data)) {
      if (/venc/i.test(key) && typeof value === "string" && ISO_DATE.test(value) && value < today) {
        warnings.push({
          kind: "Vencimientos",
          severity: "error",
          detail: `«${entity.name}»: ${key.replaceAll("_", " ")} el ${value}.`,
          entityIds: [entity.id],
        });
      }
    }
    // Stock menor a lo requerido
    if (typeof data.requerido === "number" && typeof data.en_stock === "number" && data.en_stock < data.requerido) {
      warnings.push({
        kind: "Falta de stock",
        severity: "error",
        detail: `«${entity.name}»: se requieren ${data.requerido} y hay ${data.en_stock}.`,
        entityIds: [entity.id],
      });
    }
    // No disponible (mantenimiento, licencia…) pero asignado a algo
    const estado = String(data.estado ?? "");
    // Solo cuentan asignaciones («asignado a», «opera»): «empleado de» o «requiere» no lo ponen a trabajar
    const assigned = relationships.some(
      (relationship) => relationship.sourceId === entity.id && /asign|opera/i.test(relationship.type),
    );
    if (NOT_AVAILABLE.test(estado) && assigned) {
      warnings.push({
        kind: "No disponibles pero asignados",
        severity: "error",
        detail: `«${entity.name}» está «${estado}» y sigue asignado.`,
        entityIds: [entity.id],
      });
    }
  }

  return warnings;
}
