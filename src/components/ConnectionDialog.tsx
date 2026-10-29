import { useState } from "react";
import {
  Alert,
  Autocomplete,
  Button,
  Dialog,
  DialogActions,
  DialogContent,
  DialogTitle,
  TextField,
} from "@mui/material";

import type { Entity } from "../types";

type ConnectionDialogProps = {
  title: string;
  // Entidades que se pueden elegir (ya filtradas por quien abre el diálogo)
  options: Entity[];
  initialType: string;
  isSubmitting: boolean;
  error: string | null;
  onClose: () => void;
  onSubmit: (target: Entity, relationType: string) => void;
};

// Elegir con qué nodo conectar (o a cuál reasignar) y el tipo de relación
export default function ConnectionDialog({
  title,
  options,
  initialType,
  isSubmitting,
  error,
  onClose,
  onSubmit,
}: ConnectionDialogProps) {
  const [target, setTarget] = useState<Entity | null>(null);
  const [relationType, setRelationType] = useState(initialType);
  const sorted = [...options].sort((a, b) => a.type.localeCompare(b.type) || a.name.localeCompare(b.name));
  const isValid = target !== null && relationType.trim() !== "";

  return (
    <Dialog open onClose={isSubmitting ? undefined : onClose} fullWidth maxWidth="xs">
      <DialogTitle>{title}</DialogTitle>
      <DialogContent sx={{ display: "grid", gap: 2, pt: 1 }}>
        {error && <Alert severity="error">{error}</Alert>}
        <Autocomplete
          options={sorted}
          groupBy={(option) => option.type}
          getOptionLabel={(option) => option.name}
          value={target}
          onChange={(_, value) => setTarget(value)}
          renderInput={(params) => <TextField {...params} label="Nodo" autoFocus sx={{ mt: 1 }} />}
        />
        <TextField
          label="Tipo de relación"
          value={relationType}
          onChange={(event) => setRelationType(event.target.value)}
        />
      </DialogContent>
      <DialogActions sx={{ px: 3, pb: 2 }}>
        <Button onClick={onClose} disabled={isSubmitting}>Cancelar</Button>
        <Button
          variant="contained"
          disabled={!isValid || isSubmitting}
          onClick={() => target && onSubmit(target, relationType.trim())}
        >
          {isSubmitting ? "Guardando…" : "Guardar"}
        </Button>
      </DialogActions>
    </Dialog>
  );
}
