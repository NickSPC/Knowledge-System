import {
  useCallback,
  useEffect,
  useMemo,
  useRef,
  useState,
  type ReactNode,
} from "react";
import { useNavigate } from "react-router-dom";
import ForceGraph2D, { type ForceGraphMethods } from "react-force-graph-2d";
import {
  Alert,
  Box,
  Button,
  Card,
  Chip,
  Dialog,
  DialogActions,
  DialogContent,
  DialogContentText,
  DialogTitle,
  Drawer,
  IconButton,
  Tooltip,
  Typography,
} from "@mui/material";

import AddIcon from "@mui/icons-material/Add";
import RemoveIcon from "@mui/icons-material/Remove";
import CenterFocusStrongIcon from "@mui/icons-material/CenterFocusStrong";
import EditIcon from "@mui/icons-material/Edit";
import DeleteIcon from "@mui/icons-material/Delete";
import CloseIcon from "@mui/icons-material/Close";
import DataObjectIcon from "@mui/icons-material/DataObject";

import JsonViewer from "../components/JsonViewer";
import NodeFormDialog from "../components/NodeFormDialog";
import {
  createEntity,
  deleteEntity,
  getEntities,
  getRelationships,
  updateEntity,
} from "../services/api";
import { entityTypeColors } from "../theme";
import type { Entity, EntityInput, EntityType, Relationship } from "../types";

type GraphNode = {
  id: string;
  name: string;
  color: string;
  type: EntityType;
};

type GraphLink = {
  source: string;
  target: string;
  sourceType: EntityType;
  targetType: EntityType;
};

type ZoomAction = "in" | "out" | "fit";

type FormState = { mode: "create" } | { mode: "edit"; entity: Entity } | null;

const entityTypes: EntityType[] = ["Cliente", "Producto", "Pedido"];

const ZOOM_FACTOR = 1.4;
const ZOOM_DURATION_MS = 300;

const zoomButtons: { label: string; icon: ReactNode; action: ZoomAction }[] = [
  { label: "Acercar", icon: <AddIcon />, action: "in" },
  { label: "Alejar", icon: <RemoveIcon />, action: "out" },
  {
    label: "Ajustar a la pantalla",
    icon: <CenterFocusStrongIcon />,
    action: "fit",
  },
];

export default function GraphPage() {
  const [entities, setEntities] = useState<Entity[]>([]);
  const [relationships, setRelationships] = useState<Relationship[]>([]);
  const [activeTypes, setActiveTypes] = useState<EntityType[]>(entityTypes);
  const [graphWidth, setGraphWidth] = useState(800);
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [formState, setFormState] = useState<FormState>(null);
  const [isDeleteOpen, setIsDeleteOpen] = useState(false);
  const [isJsonOpen, setIsJsonOpen] = useState(false);

  const containerRef = useRef<HTMLDivElement>(null);
  const graphRef = useRef<ForceGraphMethods | undefined>(undefined);
  const navigate = useNavigate();

  // Gráfico más corto en pantallas pequeñas
  const graphHeight = graphWidth < 600 ? 380 : 560;

  const loadData = useCallback(
    () =>
      Promise.all([getEntities(), getRelationships()]).then(
        ([loadedEntities, loadedRelationships]) => {
          setEntities(loadedEntities);
          setRelationships(loadedRelationships);
        },
      ),
    [],
  );

  useEffect(() => {
    loadData();
  }, [loadData]);

  // Mantiene el ancho del gráfico sincronizado con su contenedor
  useEffect(() => {
    const container = containerRef.current;

    if (!container) {
      return;
    }

    const observer = new ResizeObserver(([entry]) => {
      setGraphWidth(entry.contentRect.width);
    });

    observer.observe(container);

    return () => observer.disconnect();
  }, []);

  // Los datos del grafo NO dependen de los filtros activos, por lo que los nodos conservan
  // sus posiciones cuando se oculta o se vuelve a mostrar un tipo..
  const graphData = useMemo(() => {
    const entityById = new Map(entities.map((entity) => [entity.id, entity]));

    const nodes: GraphNode[] = entities.map((entity) => ({
      id: entity.id,
      name: entity.name,
      color: entityTypeColors[entity.type],
      type: entity.type,
    }));

    const links: GraphLink[] = [];

    relationships.forEach((relationship) => {
      const sourceEntity = entityById.get(relationship.sourceId);
      const targetEntity = entityById.get(relationship.targetId);

      if (!sourceEntity || !targetEntity) {
        return;
      }

      links.push({
        source: relationship.sourceId,
        target: relationship.targetId,
        sourceType: sourceEntity.type,
        targetType: targetEntity.type,
      });
    });

    return { nodes, links };
  }, [entities, relationships]);

  // Los datos sin procesar que se muestran en el visor de JSON
  const jsonData = useMemo(
    () => ({ entities, relationships }),
    [entities, relationships],
  );

  const selectedEntity = entities.find((entity) => entity.id === selectedId);

  const selectedRelationshipCount = selectedEntity
    ? relationships.filter(
        (relationship) =>
          relationship.sourceId === selectedEntity.id ||
          relationship.targetId === selectedEntity.id,
      ).length
    : 0;

  const toggleEntityType = (type: EntityType) => {
    setActiveTypes((currentTypes) =>
      currentTypes.includes(type)
        ? currentTypes.filter((currentType) => currentType !== type)
        : [...currentTypes, type],
    );
  };

  const handleNodeClick = (node: { id?: string | number }) => {
    if (node.id === undefined) {
      return;
    }

    setSelectedId(String(node.id));
  };

  // Solo se ejecuta al hacer clic, por lo que leer la referencia aquí es seguro.
  const handleZoom = (action: ZoomAction) => {
    const graph = graphRef.current;

    if (!graph) {
      return;
    }

    if (action === "fit") {
      graph.zoomToFit(400, 40);
      return;
    }

    const factor = action === "in" ? ZOOM_FACTOR : 1 / ZOOM_FACTOR;

    graph.zoom(graph.zoom() * factor, ZOOM_DURATION_MS);
  };

  const handleSubmitForm = async (values: EntityInput) => {
    if (formState?.mode === "edit") {
      await updateEntity(formState.entity.id, {
        name: values.name,
        type: values.type,
      });
    } else {
      const createdEntity = await createEntity(values);
      setSelectedId(createdEntity.id);
    }

    setFormState(null);
    await loadData();
  };

  const handleConfirmDelete = async () => {
    if (!selectedEntity) {
      return;
    }

    await deleteEntity(selectedEntity.id);

    setIsDeleteOpen(false);
    setSelectedId(null);
    await loadData();
  };

  return (
    <Box>
      <Typography variant="h4">Grafo</Typography>

      <Typography color="text.secondary" sx={{ mb: 2 }}>
        Hacé clic en un nodo para seleccionarlo: desde ahí podés abrir su nota,
        editarlo o eliminarlo. Usá la rueda o los botones para acercar y alejar.
      </Typography>

      <Box
        sx={{
          display: "flex",
          flexWrap: "wrap",
          alignItems: "center",
          justifyContent: "space-between",
          gap: 2,
          mb: 2,
        }}
      >
        <Box sx={{ display: "flex", flexWrap: "wrap", gap: 1 }}>
          {entityTypes.map((type) => {
            const isActive = activeTypes.includes(type);

            return (
              <Chip
                key={type}
                label={type}
                onClick={() => toggleEntityType(type)}
                variant={isActive ? "filled" : "outlined"}
                sx={{
                  bgcolor: isActive ? entityTypeColors[type] : undefined,
                  color: isActive ? "#0E0D17" : undefined,
                  fontWeight: 600,
                }}
              />
            );
          })}
        </Box>

        <Box sx={{ display: "flex", gap: 1 }}>
          <Button
            variant="outlined"
            startIcon={<DataObjectIcon />}
            onClick={() => setIsJsonOpen(true)}
          >
            Ver JSON
          </Button>

          <Button
            variant="contained"
            startIcon={<AddIcon />}
            onClick={() => setFormState({ mode: "create" })}
          >
            Nuevo nodo
          </Button>
        </Box>
      </Box>

      <Card
        ref={containerRef}
        variant="outlined"
        sx={{
          position: "relative",
          overflow: "hidden",
          background:
            "radial-gradient(circle at 50% 40%, #1D1A3A 0%, #0E0D17 75%)",
        }}
      >
        <ForceGraph2D
          ref={graphRef}
          graphData={graphData}
          width={graphWidth}
          height={graphHeight}
          backgroundColor="rgba(0,0,0,0)"
          autoPauseRedraw={false}
          nodeLabel="name"
          nodeColor="color"
          nodeRelSize={7}
          nodeVisibility={(node) =>
            activeTypes.includes((node as GraphNode).type)
          }
          linkVisibility={(link) => {
            const graphLink = link as GraphLink;

            return (
              activeTypes.includes(graphLink.sourceType) &&
              activeTypes.includes(graphLink.targetType)
            );
          }}
          linkColor={() => "rgba(255,255,255,0.2)"}
          linkDirectionalArrowLength={4}
          nodeCanvasObjectMode={() => "after"}
          nodeCanvasObject={(node, context, globalScale) => {
            const graphNode = node as GraphNode;

            if (!activeTypes.includes(graphNode.type)) {
              return;
            }

            // Anillo blanco alrededor del nodo seleccionado
            if (graphNode.id === selectedId) {
              context.beginPath();
              context.arc(node.x ?? 0, node.y ?? 0, 10, 0, 2 * Math.PI);
              context.strokeStyle = "#FFFFFF";
              context.lineWidth = 2 / globalScale;
              context.stroke();
            }

            // Dibuja el nombre de la entidad debajo de cada nodo, con un tamaño constante en pantalla
            context.font = `${12 / globalScale}px "Segoe UI", sans-serif`;
            context.textAlign = "center";
            context.textBaseline = "top";
            context.fillStyle = "#E8E7F5";
            context.fillText(graphNode.name, node.x ?? 0, (node.y ?? 0) + 12);
          }}
          onNodeClick={handleNodeClick}
          onBackgroundClick={() => setSelectedId(null)}
        />

        {/* Acciones para el nodo seleccionado */}
        {selectedEntity && (
          <Box
            sx={{
              position: "absolute",
              top: 12,
              left: 12,
              right: 72,
              display: "flex",
              flexWrap: "wrap",
              alignItems: "center",
              gap: 1,
              px: 1.5,
              py: 1,
              borderRadius: 2,
              border: 1,
              borderColor: "divider",
              bgcolor: "rgba(22,21,42,.92)",
              backdropFilter: "blur(6px)",
            }}
          >
            <Chip
              size="small"
              label={selectedEntity.type}
              sx={{
                bgcolor: entityTypeColors[selectedEntity.type],
                color: "#0E0D17",
                fontWeight: 600,
              }}
            />

            <Typography
              fontWeight={600}
              noWrap
              sx={{ flexGrow: 1, minWidth: 0 }}
            >
              {selectedEntity.name}
            </Typography>

            <Button
              size="small"
              onClick={() => navigate(`/entidad/${selectedEntity.id}`)}
            >
              Ver nota
            </Button>

            <Tooltip title="Editar">
              <IconButton
                size="small"
                aria-label="Editar nodo"
                onClick={() =>
                  setFormState({ mode: "edit", entity: selectedEntity })
                }
              >
                <EditIcon fontSize="small" />
              </IconButton>
            </Tooltip>

            <Tooltip title="Eliminar">
              <IconButton
                size="small"
                aria-label="Eliminar nodo"
                onClick={() => setIsDeleteOpen(true)}
              >
                <DeleteIcon fontSize="small" />
              </IconButton>
            </Tooltip>
          </Box>
        )}

        {/* Controles de zoom, flotando sobre el gráfico */}
        <Box
          sx={{
            position: "absolute",
            right: 12,
            bottom: 12,
            display: "flex",
            flexDirection: "column",
            gap: 0.5,
          }}
        >
          {zoomButtons.map((button) => (
            <Tooltip key={button.label} title={button.label} placement="left">
              <IconButton
                aria-label={button.label}
                onClick={() => handleZoom(button.action)}
                sx={{
                  bgcolor: "rgba(255,255,255,.08)",
                  border: 1,
                  borderColor: "divider",
                  backdropFilter: "blur(6px)",
                  "&:hover": { bgcolor: "rgba(255,255,255,.16)" },
                }}
              >
                {button.icon}
              </IconButton>
            </Tooltip>
          ))}
        </Box>
      </Card>

      {formState && (
        <NodeFormDialog
          entities={entities}
          entityToEdit={
            formState.mode === "edit" ? formState.entity : undefined
          }
          onClose={() => setFormState(null)}
          onSubmit={handleSubmitForm}
        />
      )}

      <Dialog
        open={isDeleteOpen}
        onClose={() => setIsDeleteOpen(false)}
        fullWidth
        maxWidth="xs"
      >
        <DialogTitle>Eliminar nodo</DialogTitle>

        <DialogContent sx={{ display: "grid", gap: 2 }}>
          <DialogContentText>
            Se va a eliminar "{selectedEntity?.name}" junto con sus{" "}
            {selectedRelationshipCount} relaciones. Esta acción no se puede
            deshacer.
          </DialogContentText>

          {selectedEntity && selectedEntity.source !== "Manual" && (
            <Alert severity="info">
              Este nodo viene de la fuente "{selectedEntity.source}". En el
              sistema real podría volver a aparecer al sincronizarla.
            </Alert>
          )}
        </DialogContent>

        <DialogActions sx={{ px: 3, pb: 2 }}>
          <Button onClick={() => setIsDeleteOpen(false)}>Cancelar</Button>

          <Button
            color="error"
            variant="contained"
            onClick={handleConfirmDelete}
          >
            Eliminar
          </Button>
        </DialogActions>
      </Dialog>

      {/* JSON viewer panel */}
      <Drawer
        anchor="right"
        open={isJsonOpen}
        onClose={() => setIsJsonOpen(false)}
        sx={{
          "& .MuiDrawer-paper": {
            width: { xs: "100%", sm: 520 },
            p: 2,
            display: "flex",
            flexDirection: "column",
            gap: 2,
            bgcolor: "background.default",
          },
        }}
      >
        <Box sx={{ display: "flex", alignItems: "flex-start", gap: 1 }}>
          <Box sx={{ flexGrow: 1 }}>
            <Typography variant="h6">JSON cargado</Typography>

            <Typography variant="body2" color="text.secondary">
              Son los datos que alimentan el grafo. Se actualizan al crear,
              editar o eliminar nodos.
            </Typography>
          </Box>

          <IconButton aria-label="Cerrar" onClick={() => setIsJsonOpen(false)}>
            <CloseIcon />
          </IconButton>
        </Box>

        <JsonViewer data={jsonData} fileName="knowledge-system.json" />
      </Drawer>
    </Box>
  );
}
