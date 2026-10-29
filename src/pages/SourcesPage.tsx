import { useCallback, useEffect, useState } from "react";
import { useNavigate, useSearchParams } from "react-router-dom";
import {
  Box,
  Alert,
  Typography,
  Button,
  Card,
  CardContent,
  Chip,
  Table,
  TableHead,
  TableRow,
  TableCell,
  TableBody,
  IconButton,
  CircularProgress,
  Tooltip,
  TextField,
  Dialog,
  DialogActions,
  DialogContent,
  DialogContentText,
  DialogTitle,
} from "@mui/material";

import AddIcon from "@mui/icons-material/Add";
import SyncIcon from "@mui/icons-material/Sync";
import DeleteIcon from "@mui/icons-material/Delete";

import DataActions from "../components/DataActions";
import { deleteSource, getSources } from "../services/api";
import { formatDate } from "../services/format";
import type { Source } from "../types";

export default function SourcesPage() {
  const [sources, setSources] = useState<Source[] | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [sourceToDelete, setSourceToDelete] = useState<Source | null>(null);
  const [deleteError, setDeleteError] = useState<string | null>(null);
  const [isDeleting, setIsDeleting] = useState(false);
  const [searchParams, setSearchParams] = useSearchParams();
  const sourceSearch = searchParams.get("buscar") ?? "";

  const navigate = useNavigate();

  const loadSources = useCallback(() => {
    getSources().then(setSources).catch((error: unknown) => {
      setError(error instanceof Error ? error.message : "No se pudieron cargar las fuentes.");
    });
  }, []);

  useEffect(loadSources, [loadSources]);

  if (error) return <Alert severity="error">{error}</Alert>;

  if (!sources) {
    return <CircularProgress />;
  }

  const normalizedSearch = sourceSearch.trim().toLocaleLowerCase("es-AR");
  const filteredSources = sources.filter((source) =>
    `${source.name} ${source.type} ${source.status}`
      .toLocaleLowerCase("es-AR")
      .includes(normalizedSearch),
  );

  const summary = [
    {
      label: "Fuentes conectadas",
      value: sources.length,
    },
    {
      label: "Funcionando",
      value: sources.filter((source) => source.status === "ok").length,
    },
    {
      label: "Con error",
      value: sources.filter((source) => source.status === "error").length,
    },
    {
      label: "Registros importados",
      value: sources.reduce((total, source) => total + source.recordCount, 0),
    },
  ];

  const handleConfirmDelete = async () => {
    if (!sourceToDelete) return;
    setIsDeleting(true);
    setDeleteError(null);
    try {
      await deleteSource(sourceToDelete.id);
      setSourceToDelete(null);
      loadSources();
    } catch (deleteFailure) {
      setDeleteError(deleteFailure instanceof Error ? deleteFailure.message : "No se pudo eliminar la fuente.");
    } finally {
      setIsDeleting(false);
    }
  };

  const handleAddSource = () => {
    navigate("/fuentes/nueva");
  };

  const handleSearchChange = (value: string) => {
    setSearchParams(value ? { buscar: value } : {}, { replace: true });
  };

  return (
    <Box>
      <Box
        sx={{
          display: "flex",
          alignItems: "center",
          flexWrap: "wrap",
          gap: 2,
          mb: 3,
        }}
      >
        <Box sx={{ flexGrow: 1 }}>
          <Typography variant="h4">Fuentes</Typography>

          <Typography color="text.secondary">
            De acá sale toda la información que ves en el grafo.
          </Typography>
        </Box>

        <Button
          variant="contained"
          startIcon={<AddIcon />}
          onClick={handleAddSource}
        >
          Agregar fuente
        </Button>
        <DataActions onChange={loadSources} />
      </Box>

      <Box
        sx={{
          display: "grid",
          gridTemplateColumns: {
            xs: "repeat(2, minmax(0, 1fr))",
            lg: "repeat(4, minmax(0, 1fr))",
          },
          gap: 2,
          mb: 3,
        }}
      >
        {summary.map((item) => (
          <Card key={item.label} variant="outlined">
            <CardContent>
              <Typography variant="h4">{item.value}</Typography>

              <Typography variant="body2" color="text.secondary">
                {item.label}
              </Typography>
            </CardContent>
          </Card>
        ))}
      </Box>

      <Box
        sx={{
          display: "flex",
          flexWrap: "wrap",
          alignItems: "center",
          justifyContent: "space-between",
          gap: 1.5,
          mb: 1.5,
        }}
      >
        <TextField
          size="small"
          value={sourceSearch}
          onChange={(event) => handleSearchChange(event.target.value)}
          placeholder="Filtrar fuentes…"
          slotProps={{ htmlInput: { "aria-label": "Filtrar fuentes" } }}
          sx={{ width: { xs: "100%", sm: 320 } }}
        />
        <Typography variant="caption" color="text.secondary">
          Mostrando {filteredSources.length} de {sources.length} fuentes
        </Typography>
      </Box>

      <Card variant="outlined" sx={{ overflowX: "auto" }}>
        <Table>
          <TableHead>
            <TableRow>
              <TableCell>Nombre</TableCell>
              <TableCell>Tipo</TableCell>
              <TableCell>Estado</TableCell>
              <TableCell>Última sincronización</TableCell>
              <TableCell align="right">Acciones</TableCell>
            </TableRow>
          </TableHead>

          <TableBody>
            {filteredSources.map((source) => (
              <TableRow key={source.id} hover>
                <TableCell sx={{ fontWeight: 600 }}>{source.name}</TableCell>

                <TableCell>{source.type}</TableCell>

                <TableCell>
                  <Chip
                    size="small"
                    label={
                      source.status === "ok"
                        ? "Funcionando"
                        : "Error de conexión"
                    }
                    color={source.status === "ok" ? "success" : "error"}
                    variant="outlined"
                  />
                </TableCell>

                <TableCell>{formatDate(source.lastSync)}</TableCell>

                <TableCell align="right">
                  <Tooltip title="La sincronización todavía no está disponible">
                    <span><IconButton disabled aria-label="Sincronizar fuente">
                      <SyncIcon />
                    </IconButton></span>
                  </Tooltip>

                  <Tooltip title="Eliminar fuente">
                    <IconButton aria-label="Eliminar fuente" onClick={() => setSourceToDelete(source)}>
                      <DeleteIcon />
                    </IconButton>
                  </Tooltip>
                </TableCell>
              </TableRow>
            ))}

            {filteredSources.length === 0 && (
              <TableRow>
                <TableCell colSpan={5} align="center" sx={{ py: 6 }}>
                  {sources.length === 0
                    ? "Todavía no hay fuentes. Agregá la primera para empezar."
                    : "No encontré fuentes con ese texto."}
                </TableCell>
              </TableRow>
            )}
          </TableBody>
        </Table>
      </Card>
      <Dialog open={sourceToDelete !== null} onClose={isDeleting ? undefined : () => setSourceToDelete(null)} fullWidth maxWidth="xs">
        <DialogTitle>¿Eliminar la fuente?</DialogTitle>
        <DialogContent>
          {deleteError && <Alert severity="error" sx={{ mb: 2 }}>{deleteError}</Alert>}
          <DialogContentText>
            Se borra «{sourceToDelete?.name}» junto con sus {sourceToDelete?.recordCount} nodos y las conexiones
            de esos nodos. No se puede deshacer.
          </DialogContentText>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setSourceToDelete(null)} disabled={isDeleting}>Cancelar</Button>
          <Button variant="contained" color="error" onClick={handleConfirmDelete} disabled={isDeleting}>
            {isDeleting ? "Eliminando…" : "Eliminar"}
          </Button>
        </DialogActions>
      </Dialog>
    </Box>
  );
}
