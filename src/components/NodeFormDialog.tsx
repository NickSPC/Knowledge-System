import { useState } from "react";
import {
  Alert,
  Autocomplete,
  Button,
  Dialog,
  DialogActions,
  DialogContent,
  DialogTitle,
  MenuItem,
  TextField,
} from "@mui/material";

import type { Entity, EntityInput, EntityType } from "../types";

const entityTypes: EntityType[] = ["Cliente", "Producto", "Pedido"];
const DEFAULT_RELATION = "relacionado con";

type NodeFormDialogProps = {
  entities: Entity[];
  // Si no está definido, el cuadro de diálogo funciona en modo "creación"
  entityToEdit?: Entity;
  onClose: () => void;
  onSubmit: (values: EntityInput) => void;
};

export default function NodeFormDialog({
  entities,
  entityToEdit,
  onClose,
  onSubmit,
}: NodeFormDialogProps) {
  const isEditing = entityToEdit !== undefined;

  const [name, setName] = useState(entityToEdit?.name ?? "");
  const [type, setType] = useState<EntityType>(entityToEdit?.type ?? "Cliente");
  const [connectedEntities, setConnectedEntities] = useState<Entity[]>([]);
  const [relationType, setRelationType] = useState(DEFAULT_RELATION);

  // Sorted by type so the options can be grouped
  const options = [...entities].sort((a, b) => a.type.localeCompare(b.type));
  const isValid = name.trim() !== "";

  const handleSubmit = () => {
    if (!isValid) {
      return;
    }

    onSubmit({
      name: name.trim(),
      type,
      connectedIds: connectedEntities.map((entity) => entity.id),
      relationType: relationType.trim() || DEFAULT_RELATION,
    });
  };

  return (
    <Dialog open onClose={onClose} fullWidth maxWidth="sm">
      <DialogTitle>{isEditing ? "Editar nodo" : "Nuevo nodo"}</DialogTitle>

      <DialogContent sx={{ display: "grid", gap: 2, pt: 1 }}>
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

        <TextField
          select
          label="Tipo"
          value={type}
          onChange={(event) => setType(event.target.value as EntityType)}
        >
          {entityTypes.map((entityType) => (
            <MenuItem key={entityType} value={entityType}>
              {entityType}
            </MenuItem>
          ))}
        </TextField>

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
        <Button onClick={onClose}>Cancelar</Button>

        <Button variant="contained" disabled={!isValid} onClick={handleSubmit}>
          {isEditing ? "Guardar" : "Crear nodo"}
        </Button>
      </DialogActions>
    </Dialog>
  );
}
