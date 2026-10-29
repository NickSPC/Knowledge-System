import { useEffect, useState } from "react";
import { Alert, Box, Chip, CircularProgress, Typography } from "@mui/material";

import { getHistory } from "../services/api";
import { formatDate } from "../services/format";
import type { Entity, HistoryEntry } from "../types";

const ACTION_LABELS: Record<string, string> = {
  crear: "Creado",
  editar: "Editado",
  borrar: "Borrado",
  relacionar: "Conexión agregada",
  desrelacionar: "Conexión quitada",
};

// Describe en una línea qué cambió (el back manda las fotos "antes" y "despues")
function describe(entry: HistoryEntry, nameOf: (id: string) => string): string {
  const snapshot = entry.despues ?? entry.antes;
  if (!snapshot) return "";
  if ("sourceId" in snapshot) return `${nameOf(String(snapshot.sourceId))} → ${nameOf(String(snapshot.targetId))} (${snapshot.type})`;
  if (entry.accion !== "editar" || !entry.antes || !entry.despues) return String(snapshot.name ?? "");
  const before = entry.antes;
  const after = entry.despues;
  const changed = Object.keys({ ...before, ...after }).filter(
    (key) => JSON.stringify(before[key]) !== JSON.stringify(after[key]),
  );
  return changed.length > 0 ? `Cambió: ${changed.join(", ")}` : "Sin cambios visibles";
}

// Pestaña «Historial» del panel del nodo: últimos cambios (GET /api/entities/<id>/history)
export default function NodeHistory({ entity, entities }: { entity: Entity; entities: Entity[] }) {
  const nameOf = (id: string) => entities.find((item) => item.id === id)?.name ?? id;
  // La respuesta se guarda junto con la entidad pedida: si cambia la entidad, se muestra «cargando»
  const [result, setResult] = useState<{ for: Entity; entries?: HistoryEntry[]; error?: string } | null>(null);

  // `entity` cambia de objeto al recargar los datos, así el historial se actualiza tras editar
  useEffect(() => {
    let isCurrent = true;
    getHistory(entity.id)
      .then((entries) => isCurrent && setResult({ for: entity, entries }))
      .catch((loadError: unknown) => {
        if (isCurrent) {
          setResult({
            for: entity,
            error: loadError instanceof Error ? loadError.message : "No se pudo cargar el historial.",
          });
        }
      });
    return () => {
      isCurrent = false;
    };
  }, [entity]);

  if (!result || result.for !== entity) return <CircularProgress size={24} />;
  if (result.error) return <Alert severity="error">{result.error}</Alert>;
  const entries = result.entries ?? [];
  if (entries.length === 0) {
    return <Typography variant="body2" color="text.secondary">Todavía no hay cambios registrados.</Typography>;
  }

  return (
    <Box sx={{ display: "grid", gap: 1.5 }}>
      {entries.map((entry, index) => (
        <Box key={`${entry.fecha}-${index}`} sx={{ borderLeft: 2, borderColor: "divider", pl: 1.5 }}>
          <Box sx={{ display: "flex", alignItems: "center", gap: 1, flexWrap: "wrap" }}>
            <Chip size="small" label={ACTION_LABELS[entry.accion] ?? entry.accion} />
            <Typography variant="caption" color="text.secondary">
              {formatDate(entry.fecha)}{entry.usuario ? ` · ${entry.usuario}` : ""}
            </Typography>
          </Box>
          <Typography variant="body2" sx={{ mt: 0.5, overflowWrap: "anywhere" }}>
            {describe(entry, nameOf)}
          </Typography>
        </Box>
      ))}
    </Box>
  );
}
