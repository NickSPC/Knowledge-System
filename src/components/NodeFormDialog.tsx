import { useState } from "react";
import {
  Alert,
  Autocomplete,
  Button,
  Dialog,
  DialogActions,
  DialogContent,
  DialogTitle,
  IconButton,
  Stack,
  TextField,
  Typography,
} from "@mui/material";
import AddIcon from "@mui/icons-material/Add";
import CloseIcon from "@mui/icons-material/Close";

import type { Entity, EntityInput } from "../types";

const DEFAULT_RELATION = "relacionado con";

type NodeFormDialogProps = {
  entities: Entity[];
  // Si no está definido, el cuadro de diálogo funciona en modo "creación"
  entityToEdit?: Entity;
  isSubmitting?: boolean;
  error?: string | null;
  onClose: () => void;
  onSubmit: (values: EntityInput) => void;
};

export default function NodeFormDialog({
  entities,
  entityToEdit,
  isSubmitting = false,
  error,
  onClose,
  onSubmit,
}: NodeFormDialogProps) {
  const isEditing = entityToEdit !== undefined;

  const [name, setName] = useState(entityToEdit?.name ?? "");
  const [type, setType] = useState(entityToEdit?.type ?? "");
  // Detalles del nodo (Entity.data) como filas clave/valor
  const [details, setDetails] = useState<{ key: string; value: string }[]>(
    Object.entries(entityToEdit?.data ?? {}).map(([key, value]) => ({ key, value: String(value) })),
  );
  const [connectedEntities, setConnectedEntities] = useState<Entity[]>([]);
  const [relationType, setRelationType] = useState(DEFAULT_RELATION);

  // Sorted by type so the options can be grouped
  const options = [...entities].sort((a, b) => a.type.localeCompare(b.type));
  const existingTypes = Array.from(new Set(entities.map((entity) => entity.type))).sort();
  const isValid = name.trim() !== "" && type.trim() !== "";

  const updateDetail = (index: number, field: "key" | "value", text: string) =>
    setDetails((rows) => rows.map((row, i) => (i === index ? { ...row, [field]: text } : row)));

  const handleSubmit = () => {
    if (!isValid || isSubmitting) {
      return;
    }

    onSubmit({
      name: name.trim(),
      type: type.trim(),
      // Los valores numéricos se guardan como número; el resto como texto
      data: Object.fromEntries(
        details
          .filter((row) => row.key.trim() !== "")
          .map((row) => {
            const value = row.value.trim();
            return [row.key.trim(), value !== "" && Number.isFinite(Number(value)) ? Number(value) : value];
          }),
      ),
      connectedIds: connectedEntities.map((entity) => entity.id),
      relationType: relationType.trim() || DEFAULT_RELATION,
    });
  };

  return (
    <Dialog open onClose={isSubmitting ? undefined : onClose} fullWidth maxWidth="sm">
      <DialogTitle>{isEditing ? "Editar nodo" : "Nuevo nodo"}</DialogTitle>

      <DialogContent sx={{ display: "grid", gap: 2, pt: 1 }}>
        {error && <Alert severity="error">{error}</Alert>}
        {isEditing && entityToEdit.source !== "Manual" && (
          <Alert severity="info">
            Este nodo viene de la fuente "{entityToEdit.source}". En el sistema
            real, un cambio manual puede perderse al volver a sincronizarla.
          </Alert>
        )}

        <TextField
          label="Nombre"
          value={name}
          onChange={(event) => setName(event.target.value)}
          autoFocus
          required
          sx={{ mt: 1 }}
        />

        <Autocomplete
          freeSolo
          options={existingTypes}
          inputValue={type}
          onInputChange={(_, value) => setType(value)}
          renderInput={(params) => (
            <TextField {...params} label="Tipo" required helperText="Elegí uno existente o escribí uno nuevo" />
          )}
        />

        <Stack spacing={1}>
          <Typography variant="subtitle2">Detalles</Typography>
          {details.map((row, index) => (
            <Stack key={index} direction="row" spacing={1} sx={{ alignItems: "center" }}>
              <TextField
                size="small"
                label="Campo"
                value={row.key}
                onChange={(event) => updateDetail(index, "key", event.target.value)}
                sx={{ flex: 1 }}
              />
              <TextField
                size="small"
                label="Valor"
                value={row.value}
                onChange={(event) => updateDetail(index, "value", event.target.value)}
                sx={{ flex: 2 }}
              />
              <IconButton
                size="small"
                aria-label="Quitar detalle"
                onClick={() => setDetails((rows) => rows.filter((_, i) => i !== index))}
              >
                <CloseIcon fontSize="small" />
              </IconButton>
            </Stack>
          ))}
          <Button
            size="small"
            startIcon={<AddIcon />}
            onClick={() => setDetails((rows) => [...rows, { key: "", value: "" }])}
            sx={{ alignSelf: "flex-start" }}
          >
            Agregar detalle
          </Button>
        </Stack>

        {!isEditing && (
          <>
            <Autocomplete
              multiple
              options={options}
              groupBy={(option) => option.type}
              getOptionLabel={(option) => option.name}
              value={connectedEntities}
              onChange={(_, value) => setConnectedEntities(value)}
              renderInput={(params) => (
                <TextField {...params} label="Conectar con (opcional)" />
              )}
            />

            {connectedEntities.length > 0 && (
              <TextField
                label="Tipo de relación"
                value={relationType}
                onChange={(event) => setRelationType(event.target.value)}
              />
            )}
          </>
        )}
      </DialogContent>

      <DialogActions sx={{ px: 3, pb: 2 }}>
        <Button onClick={onClose} disabled={isSubmitting}>Cancelar</Button>

        <Button variant="contained" disabled={!isValid || isSubmitting} onClick={handleSubmit}>
          {isSubmitting ? "Guardando…" : isEditing ? "Guardar" : "Crear nodo"}
        </Button>
      </DialogActions>
    </Dialog>
  );
}
