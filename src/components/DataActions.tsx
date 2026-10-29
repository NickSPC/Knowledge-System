import { useRef, useState } from "react";
import {
  Alert,
  Button,
  Checkbox,
  Dialog,
  DialogActions,
  DialogContent,
  DialogContentText,
  DialogTitle,
  FormControlLabel,
  Snackbar,
} from "@mui/material";
import UploadFileIcon from "@mui/icons-material/UploadFile";
import DeleteSweepIcon from "@mui/icons-material/DeleteSweep";
import DownloadIcon from "@mui/icons-material/Download";

import { clearData, getEntities, getRelationships, importData } from "../services/api";
import type { ImportPayload } from "../types";

type DataActionsProps = {
  // Se llama después de importar o vaciar, para recargar la página
  onChange: () => void;
};

// Botones «Importar JSON» (POST /api/import) y «Vaciar datos» (DELETE /api/data)
export default function DataActions({ onChange }: DataActionsProps) {
  const fileInput = useRef<HTMLInputElement>(null);
  const [payload, setPayload] = useState<ImportPayload | null>(null);
  const [replace, setReplace] = useState(false);
  const [isClearOpen, setIsClearOpen] = useState(false);
  const [isWorking, setIsWorking] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [notice, setNotice] = useState<string | null>(null);

  const handleFile = async (file: File | undefined) => {
    if (!file) return;
    setError(null);
    try {
      const parsed = JSON.parse(await file.text());
      setPayload({
        entities: Array.isArray(parsed.entities) ? parsed.entities : [],
        relationships: Array.isArray(parsed.relationships) ? parsed.relationships : [],
      });
      setReplace(parsed.replace === true);
    } catch {
      setError(`"${file.name}" no es un JSON válido.`);
      setPayload({ entities: [], relationships: [] });
    }
  };

  const run = async (action: () => Promise<string>) => {
    setIsWorking(true);
    setError(null);
    try {
      setNotice(await action());
      setPayload(null);
      setIsClearOpen(false);
      onChange();
    } catch (actionError) {
      setError(actionError instanceof Error ? actionError.message : "No se pudo completar la operación.");
    } finally {
      setIsWorking(false);
    }
  };

  const closeDialogs = () => {
    if (isWorking) return;
    setPayload(null);
    setIsClearOpen(false);
    setError(null);
  };

  // Descarga todos los datos en el mismo formato que «Importar JSON» (con replace: reimportarlo los restaura)
  const handleExport = async () => {
    setError(null);
    try {
      const [entities, relationships] = await Promise.all([getEntities(), getRelationships()]);
      const payload: ImportPayload = { replace: true, entities, relationships };
      const url = URL.createObjectURL(new Blob([JSON.stringify(payload, null, 2)], { type: "application/json" }));
      const link = document.createElement("a");
      link.href = url;
      link.download = `knowledge-system-${new Date().toISOString().slice(0, 10)}.json`;
      link.click();
      URL.revokeObjectURL(url);
      setNotice(`Se exportaron ${entities.length} entidades y ${relationships.length} relaciones.`);
    } catch (exportError) {
      setNotice(exportError instanceof Error ? exportError.message : "No se pudo exportar.");
    }
  };

  const isEmptyPayload = payload !== null && payload.entities.length === 0 && payload.relationships.length === 0;

  return (
    <>
      <input
        ref={fileInput}
        type="file"
        accept=".json,application/json"
        hidden
        onChange={(event) => {
          handleFile(event.target.files?.[0]);
          event.target.value = ""; // permite volver a elegir el mismo archivo
        }}
      />
      <Button variant="outlined" startIcon={<UploadFileIcon />} onClick={() => fileInput.current?.click()}>
        Importar JSON
      </Button>
      <Button variant="outlined" startIcon={<DownloadIcon />} onClick={handleExport}>
        Exportar JSON
      </Button>
      <Button variant="outlined" color="error" startIcon={<DeleteSweepIcon />} onClick={() => setIsClearOpen(true)}>
        Vaciar datos
      </Button>

      <Dialog open={payload !== null} onClose={closeDialogs} fullWidth maxWidth="xs">
        <DialogTitle>Importar JSON</DialogTitle>
        <DialogContent>
          {error && <Alert severity="error" sx={{ mb: 2 }}>{error}</Alert>}
          {payload && !isEmptyPayload && (
            <>
              <DialogContentText>
                El archivo trae {payload.entities.length} entidades y {payload.relationships.length} relaciones.
              </DialogContentText>
              <FormControlLabel
                control={<Checkbox checked={replace} onChange={(event) => setReplace(event.target.checked)} />}
                label="Reemplazar los datos actuales"
              />
            </>
          )}
          {isEmptyPayload && !error && (
            <DialogContentText>El archivo no trae entidades ni relaciones.</DialogContentText>
          )}
        </DialogContent>
        <DialogActions>
          <Button onClick={closeDialogs} disabled={isWorking}>Cancelar</Button>
          <Button
            variant="contained"
            disabled={isWorking || isEmptyPayload}
            onClick={() =>
              payload &&
              run(async () => {
                const result = await importData({ ...payload, replace });
                return `Se importaron ${result.entities} entidades y ${result.relationships} relaciones.`;
              })
            }
          >
            {isWorking ? "Importando…" : "Importar"}
          </Button>
        </DialogActions>
      </Dialog>

      <Dialog open={isClearOpen} onClose={closeDialogs} fullWidth maxWidth="xs">
        <DialogTitle>¿Vaciar todos los datos?</DialogTitle>
        <DialogContent>
          {error && <Alert severity="error" sx={{ mb: 2 }}>{error}</Alert>}
          <DialogContentText>
            Se borran todos los nodos, relaciones, historial y fuentes. Los usuarios se mantienen.
            No se puede deshacer.
          </DialogContentText>
        </DialogContent>
        <DialogActions>
          <Button onClick={closeDialogs} disabled={isWorking}>Cancelar</Button>
          <Button
            variant="contained"
            color="error"
            disabled={isWorking}
            onClick={() => run(async () => { await clearData(); return "Se vaciaron los datos."; })}
          >
            {isWorking ? "Vaciando…" : "Vaciar"}
          </Button>
        </DialogActions>
      </Dialog>

      <Snackbar open={notice !== null} autoHideDuration={4000} onClose={() => setNotice(null)} message={notice} />
    </>
  );
}
