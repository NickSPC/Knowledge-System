import {
  useCallback,
  useEffect,
  useMemo,
  useRef,
  useState,
  type ChangeEvent,
  type PointerEvent,
  type ReactNode,
} from "react";
import { useLocation, useNavigate } from "react-router-dom";
import ForceGraph2D, { type ForceGraphMethods } from "react-force-graph-2d";
import {
  Autocomplete,
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
  Divider,
  Drawer,
  Tab,
  Tabs,
  IconButton,
  List,
  ListItemButton,
  ListItemText,
  TextField,
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
import RestartAltIcon from "@mui/icons-material/RestartAlt";
import SwapHorizIcon from "@mui/icons-material/SwapHoriz";
import LinkOffIcon from "@mui/icons-material/LinkOff";
import AddLinkIcon from "@mui/icons-material/AddLink";
import DescriptionIcon from "@mui/icons-material/Description";

import JsonViewer from "../components/JsonViewer";
import NodeHistory from "../components/NodeHistory";
import ConnectionDialog from "../components/ConnectionDialog";
import NodeFormDialog from "../components/NodeFormDialog";
import {
  createEntity,
  createRelationship,
  deleteEntity,
  deleteRelationship,
  getEntities,
  getRelationships,
  updateEntity,
} from "../services/api";
import { colorForType, setTypeColor } from "../theme";
import type { Entity, EntityInput, EntityType, Relationship } from "../types";

type GraphNode = {
  id: string;
  name: string;
  color: string;
  type: EntityType;
  x?: number;
  y?: number;
};

type GraphLink = {
  source: string;
  target: string;
  sourceType: EntityType;
  targetType: EntityType;
  type: string;
};

type ZoomAction = "in" | "out" | "fit";

type FormState = { mode: "create" } | { mode: "edit"; entity: Entity } | null;


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

// Zoom a partir del cual se ven los nombres de todos los nodos y el tipo de cada conexión
const LABEL_ZOOM = 2.6;
const LINK_LABEL_ZOOM = 2.6;
const NODE_RADIUS = 10; // radio del anillo de cada nodo, en unidades del grafo

// Fuerza simple de colisión: separa los nodos que se pisan (O(n²), alcanza para unos cientos de nodos)
function collideForce(distance: number) {
  let nodes: { x?: number; y?: number; vx?: number; vy?: number }[] = [];
  const force = (alpha: number) => {
    for (let i = 0; i < nodes.length; i++) {
      for (let j = i + 1; j < nodes.length; j++) {
        const a = nodes[i];
        const b = nodes[j];
        const dx = (b.x ?? 0) - (a.x ?? 0);
        const dy = (b.y ?? 0) - (a.y ?? 0);
        const d = Math.hypot(dx, dy) || 0.01;
        if (d >= distance) continue;
        const push = ((distance - d) / d) * 0.5 * Math.max(alpha, 0.3);
        a.vx = (a.vx ?? 0) - dx * push;
        a.vy = (a.vy ?? 0) - dy * push;
        b.vx = (b.vx ?? 0) + dx * push;
        b.vy = (b.vy ?? 0) + dy * push;
      }
    }
  };
  force.initialize = (newNodes: typeof nodes) => {
    nodes = newNodes;
  };
  return force;
}

export default function GraphPage() {
  const [entities, setEntities] = useState<Entity[]>([]);
  const [relationships, setRelationships] = useState<Relationship[]>([]);
  const entityTypes = useMemo(() => Array.from(new Set(entities.map((e) => e.type))).sort(), [entities]);
  // Se guardan los tipos OCULTOS: así un tipo nuevo aparece visible sin tocar los filtros
  const [hiddenTypes, setHiddenTypes] = useState<EntityType[]>([]);
  const activeTypes = useMemo(
    () => entityTypes.filter((type) => !hiddenTypes.includes(type)),
    [entityTypes, hiddenTypes],
  );
  const [graphWidth, setGraphWidth] = useState(800);
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [hoveredId, setHoveredId] = useState<string | null>(null);
  const [searchText, setSearchText] = useState("");
  const [formState, setFormState] = useState<FormState>(null);
  const [isDeleteOpen, setIsDeleteOpen] = useState(false);
  const [isJsonOpen, setIsJsonOpen] = useState(false);
  const [panelTab, setPanelTab] = useState(0);
  // Conectar el nodo seleccionado con otro, o reasignar una conexión existente a otro nodo
  const [connectionForm, setConnectionForm] = useState<
    { mode: "add" } | { mode: "reassign"; relationship: Relationship; outgoing: boolean } | null
  >(null);
  const [connectionError, setConnectionError] = useState<string | null>(null);
  const [colorVersion, setColorVersion] = useState(0); // sube al cambiar un color, para redibujar // 0 Detalles, 1 Historial, 2 JSON
  const [error, setError] = useState<string | null>(null);
  const [isSaving, setIsSaving] = useState(false);

  const containerRef = useRef<HTMLDivElement>(null);
  const graphRef = useRef<ForceGraphMethods | undefined>(undefined);
  const hasInitialFit = useRef(false);
  // Arrastre propio: no depende de leer píxeles del canvas (Brave los altera y el grafo no detectaba los nodos)
  const dragRef = useRef<{ node: GraphNode & { x?: number; y?: number; fx?: number; fy?: number }; startX: number; startY: number; moved: boolean } | null>(null);
  const navigate = useNavigate();
  // Al volver desde una nota, se llega con ese nodo seleccionado (state.select = id)
  const selectOnArrival = (useLocation().state as { select?: string } | null)?.select;
  const [arrivalDone, setArrivalDone] = useState(false);
  if (!arrivalDone && selectOnArrival && entities.some((entity) => entity.id === selectOnArrival)) {
    setArrivalDone(true);
    setSelectedId(selectOnArrival);
  }

  // Gráfico más corto en pantallas pequeñas
  const graphHeight = graphWidth < 600 ? 380 : 560;

  const loadData = useCallback(
    () =>
      Promise.all([getEntities(), getRelationships()]).then(
        ([loadedEntities, loadedRelationships]) => {
          setEntities(loadedEntities);
          setRelationships(loadedRelationships);
          setError(null);
        },
      ),
    [],
  );

  useEffect(() => {
    loadData().catch((error: unknown) => {
      setError(error instanceof Error ? error.message : "No se pudo cargar el grafo.");
    });
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
      color: colorForType(entity.type),
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
        type: relationship.type,
      });
    });

    return { nodes, links };
    // colorVersion: los colores salen de colorForType, que cambia al elegir uno nuevo
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [entities, relationships, colorVersion]);

  // Separación entre nodos: repulsión, largo de las conexiones y colisión para que no se encimen
  useEffect(() => {
    const graph = graphRef.current;
    if (!graph) return;
    graph.d3Force("collide", collideForce(NODE_RADIUS * 2 + 6) as never);
    (graph.d3Force("charge") as unknown as { strength?: (value: number) => void })?.strength?.(-160);
    (graph.d3Force("link") as unknown as { distance?: (value: number) => void })?.distance?.(55);
    graph.d3ReheatSimulation();
  }, [graphData]);

  // Los datos sin procesar que se muestran en el visor de JSON
  const jsonData = useMemo(
    () => ({ entities, relationships }),
    [entities, relationships],
  );

  const selectedEntity = entities.find((entity) => entity.id === selectedId);

  const activeNeighborhood = useMemo(() => {
    if (!selectedId) return new Set<string>();

    const relatedIds = new Set([selectedId]);
    relationships.forEach((relationship) => {
      if (relationship.sourceId === selectedId) relatedIds.add(relationship.targetId);
      if (relationship.targetId === selectedId) relatedIds.add(relationship.sourceId);
    });
    return relatedIds;
  }, [relationships, selectedId]);

  const outgoingRelationships = selectedEntity
    ? relationships.filter((relationship) => relationship.sourceId === selectedEntity.id)
    : [];
  const incomingRelationships = selectedEntity
    ? relationships.filter((relationship) => relationship.targetId === selectedEntity.id)
    : [];
  const selectedRelationshipCount = outgoingRelationships.length + incomingRelationships.length;

  const toggleEntityType = (type: EntityType) => {
    const isActive = activeTypes.includes(type);
    setHiddenTypes((currentTypes) =>
      isActive
        ? [...currentTypes, type]
        : currentTypes.filter((currentType) => currentType !== type),
    );
    if (isActive && selectedEntity?.type === type) {
      setSelectedId(null);
      setSearchText("");
    }
  };

  const handleNodeClick = (node: { id?: string | number }) => {
    if (node.id === undefined) {
      return;
    }

    const id = String(node.id);
    setSelectedId(id);
    setSearchText(entities.find((entity) => entity.id === id)?.name ?? "");
  };

  const focusEntity = (entity: Entity | null) => {
    if (!entity) {
      setSelectedId(null);
      setSearchText("");
      return;
    }

    setSelectedId(entity.id);
    setSearchText(entity.name);
    setHiddenTypes((current) => current.filter((type) => type !== entity.type));

    const node = graphData.nodes.find((item) => item.id === entity.id);
    if (node?.x !== undefined && node.y !== undefined) {
      graphRef.current?.centerAt(node.x, node.y, 450);
      graphRef.current?.zoom(Math.max(graphRef.current.zoom(), 1.6), 450);
    }
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
    if (isSaving) return;
    setIsSaving(true);
    setError(null);
    let savedEntity: Entity | undefined;
    try {
      const isEditing = formState?.mode === "edit";
      savedEntity = isEditing
        ? await updateEntity(formState.entity.id, { name: values.name, type: values.type, data: values.data })
        : await createEntity(values);
      setSelectedId(savedEntity.id);
      setSearchText(savedEntity.name);
      // The node is already saved. Close the form before adding connections so
      // a failed relationship cannot cause an accidental duplicate on retry.
      setFormState(null);
      if (!isEditing) {
        for (const targetId of values.connectedIds) {
          await createRelationship({ sourceId: savedEntity.id, targetId, type: values.relationType });
        }
      }
      await loadData();
    } catch (error) {
      const message = error instanceof Error ? error.message : "No se pudo guardar el nodo.";
      if (savedEntity) {
        await loadData().catch(() => undefined);
        setError(`El nodo se guardó, pero no se pudo completar la operación. ${message}`);
      } else {
        setError(message);
      }
    } finally {
      setIsSaving(false);
    }
  };

  const handleSaveConnection = async (target: Entity, relationType: string) => {
    if (!selectedEntity || !connectionForm || isSaving) return;
    setIsSaving(true);
    setConnectionError(null);
    try {
      if (connectionForm.mode === "add") {
        await createRelationship({ sourceId: selectedEntity.id, targetId: target.id, type: relationType });
      } else {
        // Reasignar = la misma conexión, pero con el otro extremo cambiado por `target`
        const { relationship, outgoing } = connectionForm;
        await createRelationship(
          outgoing
            ? { sourceId: relationship.sourceId, targetId: target.id, type: relationType }
            : { sourceId: target.id, targetId: relationship.targetId, type: relationType },
        );
        await deleteRelationship(relationship);
      }
      setConnectionForm(null);
      await loadData();
    } catch (saveError) {
      setConnectionError(saveError instanceof Error ? saveError.message : "No se pudo guardar la conexión.");
    } finally {
      setIsSaving(false);
    }
  };

  const handleRemoveConnection = async (relationship: Relationship) => {
    if (isSaving) return;
    setIsSaving(true);
    setError(null);
    try {
      await deleteRelationship(relationship);
      await loadData();
    } catch (removeError) {
      setError(removeError instanceof Error ? removeError.message : "No se pudo quitar la conexión.");
    } finally {
      setIsSaving(false);
    }
  };

  // Nodo visible bajo el puntero (cálculo geométrico, no por color de píxel)
  const nodeAt = (clientX: number, clientY: number) => {
    const canvas = containerRef.current?.querySelector("canvas");
    const graph = graphRef.current;
    if (!canvas || !graph) return null;
    const rect = canvas.getBoundingClientRect();
    const point = graph.screen2GraphCoords(clientX - rect.left, clientY - rect.top);
    let best: (typeof graphData.nodes)[number] | null = null;
    let bestDistance = NODE_RADIUS + 2;
    for (const node of graphData.nodes as (GraphNode & { x?: number; y?: number })[]) {
      if (!activeTypes.includes(node.type)) continue;
      const distance = Math.hypot((node.x ?? 0) - point.x, (node.y ?? 0) - point.y);
      if (distance <= bestDistance) {
        best = node;
        bestDistance = distance;
      }
    }
    return best;
  };

  const handlePointerDown = (event: PointerEvent<HTMLDivElement>) => {
    const node = nodeAt(event.clientX, event.clientY);
    if (!node) return; // fondo: el grafo se encarga (mover y zoom)
    event.stopPropagation(); // que el grafo no lo tome como paneo
    dragRef.current = { node, startX: event.clientX, startY: event.clientY, moved: false };
    event.currentTarget.setPointerCapture(event.pointerId);
  };

  const handlePointerMove = (event: PointerEvent<HTMLDivElement>) => {
    const drag = dragRef.current;
    if (!drag) {
      const id = nodeAt(event.clientX, event.clientY)?.id ?? null;
      if (id !== hoveredId) setHoveredId(id);
      return;
    }
    event.stopPropagation();
    if (!drag.moved && Math.hypot(event.clientX - drag.startX, event.clientY - drag.startY) < 4) return;
    drag.moved = true;
    const canvas = containerRef.current?.querySelector("canvas");
    const graph = graphRef.current;
    if (!canvas || !graph) return;
    const rect = canvas.getBoundingClientRect();
    const point = graph.screen2GraphCoords(event.clientX - rect.left, event.clientY - rect.top);
    drag.node.fx = point.x; // fijo mientras se arrastra (y queda donde se suelta)
    drag.node.fy = point.y;
    graph.d3ReheatSimulation();
  };

  const handlePointerUp = (event: PointerEvent<HTMLDivElement>) => {
    const drag = dragRef.current;
    if (!drag) return;
    event.stopPropagation();
    dragRef.current = null;
    handleNodeClick(drag.node); // clic o arrastre: los dos seleccionan el nodo
  };

  const handleConfirmDelete = async () => {
    if (!selectedEntity || isSaving) {
      return;
    }

    setIsSaving(true);
    setError(null);
    try {
      await deleteEntity(selectedEntity.id);
      setIsDeleteOpen(false);
      setSelectedId(null);
      setSearchText("");
      await loadData();
    } catch (error) {
      setError(error instanceof Error ? error.message : "No se pudo eliminar el nodo.");
    } finally {
      setIsSaving(false);
    }
  };

  return (
    <Box>
      <Typography variant="h4">Grafo</Typography>
      {error && !formState && !isDeleteOpen && <Alert severity="error" sx={{ my: 2 }}>{error}</Alert>}

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
        <Autocomplete
          options={entities}
          value={selectedEntity ?? null}
          inputValue={searchText}
          getOptionLabel={(entity) => entity.name}
          isOptionEqualToValue={(option, value) => option.id === value.id}
          onChange={(_, entity) => focusEntity(entity)}
          onInputChange={(_, value) => setSearchText(value)}
          noOptionsText="No se encontraron entidades"
          sx={{ width: { xs: "100%", sm: 300 } }}
          renderInput={(params) => (
            <TextField {...params} size="small" placeholder="Buscar entidad…" />
          )}
        />

        <Box sx={{ display: "flex", flexWrap: "wrap", gap: 1 }}>
          {entityTypes.map((type) => {
            const isActive = activeTypes.includes(type);

            return (
              <Box key={type} sx={{ display: "inline-flex", alignItems: "center", gap: 0.5 }}>
                <Chip
                  label={type}
                  onClick={() => toggleEntityType(type)}
                  variant={isActive ? "filled" : "outlined"}
                  sx={{
                    bgcolor: isActive ? colorForType(type) : undefined,
                    color: isActive ? "#0E0D17" : undefined,
                    fontWeight: 600,
                  }}
                />
                <Tooltip title={`Color de ${type}`}>
                  <Box
                    component="input"
                    type="color"
                    aria-label={`Color de ${type}`}
                    value={colorForType(type)}
                    onChange={(event: ChangeEvent<HTMLInputElement>) => {
                      setTypeColor(type, event.target.value);
                      setColorVersion((version) => version + 1);
                    }}
                    sx={{ width: 22, height: 22, p: 0, border: 0, bgcolor: "transparent", cursor: "pointer" }}
                  />
                </Tooltip>
              </Box>
            );
          })}
          {activeTypes.length < entityTypes.length && (
            <Button
              size="small"
              startIcon={<RestartAltIcon />}
              onClick={() => setHiddenTypes([])}
            >
              Restablecer filtros
            </Button>
          )}
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

      <Box
        sx={{
          display: "grid",
          gridTemplateColumns: "1fr",
          alignItems: "start",
          gap: 2,
        }}
      >
      <Card
        ref={containerRef}
        variant="outlined"
        onPointerDownCapture={handlePointerDown}
        onPointerMoveCapture={handlePointerMove}
        onPointerUpCapture={handlePointerUp}
        sx={{
          cursor: hoveredId ? "pointer" : "grab",
          position: "relative",
          overflow: "hidden",
          minWidth: 0,
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
          nodeLabel={() => ""}
          nodeColor={(node) => {
            const graphNode = node as GraphNode;
            return selectedId && !activeNeighborhood.has(graphNode.id)
              ? "#464454"
              : graphNode.color;
          }}
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
          linkLabel={(link) => (link as GraphLink).type}
          linkColor={(link) => {
            const graphLink = link as GraphLink;
            const sourceId = typeof graphLink.source === "object"
              ? String((graphLink.source as unknown as GraphNode).id)
              : String(graphLink.source);
            const targetId = typeof graphLink.target === "object"
              ? String((graphLink.target as unknown as GraphNode).id)
              : String(graphLink.target);
            const isFocused = activeNeighborhood.has(sourceId) && activeNeighborhood.has(targetId);
            return selectedId
              ? isFocused ? "rgba(167,139,250,.72)" : "rgba(255,255,255,.045)"
              : "rgba(255,255,255,.45)";
          }}
          linkWidth={1.3}
          linkDirectionalArrowLength={5}
          enableNodeDrag={false}
          // Calcula la distribución antes de dibujar y se detiene rápido: así el encuadre inicial ya es el final
          warmupTicks={80}
          cooldownTime={3000}
          onEngineStop={() => {
            if (!hasInitialFit.current && graphData.nodes.length > 0) {
              hasInitialFit.current = true;
              graphRef.current?.zoomToFit(450, 72);
            }
          }}
          nodeCanvasObjectMode={() => "after"}
          nodeCanvasObject={(node, context, globalScale) => {
            const graphNode = node as GraphNode;

            if (!activeTypes.includes(graphNode.type)) {
              return;
            }

            context.beginPath();
            context.arc(node.x ?? 0, node.y ?? 0, 10, 0, 2 * Math.PI);
            context.strokeStyle = graphNode.color;
            context.globalAlpha = graphNode.id === selectedId ? 0.85 : 0.3;
            context.lineWidth = 1.5 / globalScale;
            context.stroke();
            context.globalAlpha = 1;

            // El anillo identifica el nodo seleccionado.
            if (graphNode.id === selectedId) {
              context.beginPath();
              context.arc(node.x ?? 0, node.y ?? 0, 10, 0, 2 * Math.PI);
              context.strokeStyle = "#FFFFFF";
              context.lineWidth = 2 / globalScale;
              context.stroke();
            }

            // Inicial del nombre dentro del nodo: se identifica aunque no se vea el nombre
            context.font = `bold 8px "Segoe UI", sans-serif`;
            context.textAlign = "center";
            context.textBaseline = "middle";
            context.fillStyle = "#0E0D17";
            context.fillText(graphNode.name.trim().charAt(0).toUpperCase(), node.x ?? 0, (node.y ?? 0) + 0.5);

            // Mantiene el grafo legible y muestra etiquetas solo al explorar un nodo.
            if (graphNode.id !== selectedId && graphNode.id !== hoveredId && globalScale < LABEL_ZOOM) {
              return;
            }

            context.font = `${12 / globalScale}px "Segoe UI", sans-serif`;
            context.textAlign = "center";
            context.textBaseline = "top";
            context.fillStyle = "#E8E7F5";
            const labelX = node.x ?? 0;
            const labelY = (node.y ?? 0) + 13;
            const labelWidth = context.measureText(graphNode.name).width;
            context.fillStyle = "rgba(10,9,18,.88)";
            context.fillRect(
              labelX - labelWidth / 2 - 4 / globalScale,
              labelY - 2 / globalScale,
              labelWidth + 8 / globalScale,
              17 / globalScale,
            );
            context.fillStyle = "#E8E7F5";
            context.fillText(graphNode.name, labelX, labelY);
          }}
          linkCanvasObjectMode={() => "after"}
          linkCanvasObject={(link, context, globalScale) => {
            const graphLink = link as unknown as {
              source: { x?: number; y?: number };
              target: { x?: number; y?: number };
              sourceType: EntityType;
              targetType: EntityType;
              type: string;
            };
            // Las etiquetas de las conexiones solo se ven con zoom cercano
            if (
              globalScale < LINK_LABEL_ZOOM ||
              !activeTypes.includes(graphLink.sourceType) ||
              !activeTypes.includes(graphLink.targetType) ||
              typeof graphLink.source !== "object" ||
              typeof graphLink.target !== "object"
            ) {
              return;
            }
            const x = ((graphLink.source.x ?? 0) + (graphLink.target.x ?? 0)) / 2;
            const y = ((graphLink.source.y ?? 0) + (graphLink.target.y ?? 0)) / 2;
            context.font = `${10 / globalScale}px "Segoe UI", sans-serif`;
            context.textAlign = "center";
            context.textBaseline = "middle";
            const width = context.measureText(graphLink.type).width;
            context.fillStyle = "rgba(10,9,18,.75)";
            context.fillRect(x - width / 2 - 3 / globalScale, y - 7 / globalScale, width + 6 / globalScale, 14 / globalScale);
            context.fillStyle = "#B9B5D6";
            context.fillText(graphLink.type, x, y);
          }}
          onBackgroundClick={() => setSelectedId(null)}
        />

        {activeTypes.length === 0 && (
          <Alert
            severity="info"
            sx={{ position: "absolute", top: 16, left: 16, right: 72 }}
            action={
              <Button
                color="inherit"
                size="small"
                startIcon={<RestartAltIcon />}
                onClick={() => setHiddenTypes([])}
              >
                Restablecer
              </Button>
            }
          >
            Activá al menos un tipo para volver a mostrar entidades.
          </Alert>
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

      {/* Panel lateral del nodo seleccionado: no bloquea el grafo (variant persistent) */}
      <Drawer
        anchor="right"
        variant="persistent"
        open={selectedEntity !== undefined}
        sx={{
          "& .MuiDrawer-paper": {
            width: { xs: "100%", sm: 380 },
            p: 2.5,
            pt: "calc(env(safe-area-inset-top, 0px) + 80px)",
            bgcolor: "background.default",
            borderLeft: 1,
            borderColor: "divider",
          },
        }}
      >
      {selectedEntity && (
        <>
          <Box sx={{ display: "flex", alignItems: "flex-start", gap: 1, mb: 1 }}>
            <Box sx={{ flexGrow: 1, minWidth: 0 }}>
              <Chip
                size="small"
                label={selectedEntity.type}
                sx={{
                  bgcolor: colorForType(selectedEntity.type),
                  color: "#0E0D17",
                  fontWeight: 600,
                  mb: 1,
                }}
              />
              <Typography variant="h6" sx={{ overflowWrap: "anywhere" }}>
                {selectedEntity.name}
              </Typography>
            </Box>
            <IconButton
              size="small"
              aria-label="Quitar selección"
              onClick={() => focusEntity(null)}
            >
              <CloseIcon fontSize="small" />
            </IconButton>
          </Box>

          <Typography variant="body2" color="text.secondary" sx={{ mb: 1.5 }}>
            Fuente: {selectedEntity.source}
          </Typography>

          <Button
            variant="contained"
            fullWidth
            startIcon={<DescriptionIcon />}
            onClick={() => navigate(`/entidad/${encodeURIComponent(selectedEntity.id)}`)}
            sx={{ mb: 1 }}
          >
            Ver nota completa
          </Button>

          <Tabs value={panelTab} onChange={(_, value: number) => setPanelTab(value)} sx={{ mb: 2 }}>
            <Tab label="Detalles" />
            <Tab label="Historial" />
            <Tab label="JSON" />
          </Tabs>

          {panelTab === 1 && <NodeHistory entity={selectedEntity} entities={entities} />}
          {panelTab === 2 && (
            <JsonViewer
              data={{ ...selectedEntity, connections: [...outgoingRelationships, ...incomingRelationships] }}
              fileName={`${selectedEntity.id}.json`}
            />
          )}
          {panelTab === 0 && (<>
          <Typography variant="subtitle2" sx={{ mb: 1 }}>Datos</Typography>
          <Box sx={{ display: "grid", gap: 1, mb: 2 }}>
            {Object.entries(selectedEntity.data).map(([key, value]) => (
              <Box key={key} sx={{ display: "flex", justifyContent: "space-between", gap: 1 }}>
                <Typography variant="caption" color="text.secondary">{key}</Typography>
                <Typography variant="body2" sx={{ textAlign: "right", overflowWrap: "anywhere" }}>{value}</Typography>
              </Box>
            ))}
          </Box>

          <Divider sx={{ mb: 1.5 }} />
          <Typography variant="subtitle2">
            Conexiones <Typography component="span" variant="caption" color="text.secondary">({selectedRelationshipCount})</Typography>
          </Typography>
          {selectedRelationshipCount > 0 ? (
            <List dense disablePadding sx={{ my: 0.5, maxHeight: 220, overflowY: "auto" }}>
              {[
                ...outgoingRelationships.map((relationship) => ({
                  entityId: relationship.targetId,
                  relation: relationship.type,
                  relationship,
                  outgoing: true,
                })),
                ...incomingRelationships.map((relationship) => ({
                  entityId: relationship.sourceId,
                  relation: relationship.type,
                  relationship,
                  outgoing: false,
                })),
              ].map((item, index) => {
                const relatedEntity = entities.find((entity) => entity.id === item.entityId);
                if (!relatedEntity) return null;

                return (
                  <Box key={`${item.entityId}-${item.relation}-${index}`} sx={{ display: "flex", alignItems: "center" }}>
                  <ListItemButton
                    onClick={() => focusEntity(relatedEntity)}
                    sx={{ px: 1, borderRadius: 1, minWidth: 0 }}
                  >
                    <ListItemText
                      primary={relatedEntity.name}
                      secondary={item.relation}
                      slotProps={{
                        primary: { variant: "body2", noWrap: true },
                        secondary: { variant: "caption" },
                      }}
                    />
                    <Chip
                      size="small"
                      label={relatedEntity.type}
                      sx={{
                        ml: 1,
                        bgcolor: `${colorForType(relatedEntity.type)}22`,
                        color: colorForType(relatedEntity.type),
                      }}
                    />
                  </ListItemButton>
                  <Tooltip title={`Reasignar a otro ${relatedEntity.type}`}>
                    <IconButton
                      size="small"
                      aria-label="Reasignar conexión"
                      disabled={isSaving}
                      onClick={() => {
                        setConnectionError(null);
                        setConnectionForm({ mode: "reassign", relationship: item.relationship, outgoing: item.outgoing });
                      }}
                    >
                      <SwapHorizIcon fontSize="small" />
                    </IconButton>
                  </Tooltip>
                  <Tooltip title="Quitar conexión">
                    <IconButton
                      size="small"
                      aria-label="Quitar conexión"
                      disabled={isSaving}
                      onClick={() => handleRemoveConnection(item.relationship)}
                    >
                      <LinkOffIcon fontSize="small" />
                    </IconButton>
                  </Tooltip>
                  </Box>
                );
              })}
            </List>
          ) : (
            <Typography variant="body2" color="text.secondary" sx={{ my: 1 }}>
              Esta entidad todavía no tiene conexiones.
            </Typography>
          )}
          <Button
            size="small"
            startIcon={<AddLinkIcon />}
            onClick={() => {
              setConnectionError(null);
              setConnectionForm({ mode: "add" });
            }}
          >
            Conectar con…
          </Button>

          <Divider sx={{ my: 1.5 }} />
          <Box sx={{ display: "flex", flexWrap: "wrap", gap: 1 }}>
            <Tooltip title="Editar">
              <IconButton
                size="small"
                aria-label="Editar nodo"
                onClick={() => setFormState({ mode: "edit", entity: selectedEntity })}
              >
                <EditIcon fontSize="small" />
              </IconButton>
            </Tooltip>
            <Tooltip title="Eliminar">
              <IconButton size="small" aria-label="Eliminar nodo" onClick={() => setIsDeleteOpen(true)}>
                <DeleteIcon fontSize="small" />
              </IconButton>
            </Tooltip>
          </Box>
          </>)}
        </>
      )}
      </Drawer>
      </Box>

      {formState && (
        <NodeFormDialog
          isSubmitting={isSaving}
          error={error}
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
        onClose={isSaving ? undefined : () => setIsDeleteOpen(false)}
        fullWidth
        maxWidth="xs"
      >
        <DialogTitle>Eliminar nodo</DialogTitle>

        <DialogContent sx={{ display: "grid", gap: 2 }}>
          {error && <Alert severity="error">{error}</Alert>}
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
          <Button onClick={() => setIsDeleteOpen(false)} disabled={isSaving}>Cancelar</Button>

          <Button
            color="error"
            variant="contained"
            disabled={isSaving}
            onClick={handleConfirmDelete}
          >
            Eliminar
          </Button>
        </DialogActions>
      </Dialog>

      {connectionForm && selectedEntity && (() => {
        const current = connectionForm.mode === "reassign"
          ? entities.find((entity) => entity.id === (connectionForm.outgoing
            ? connectionForm.relationship.targetId
            : connectionForm.relationship.sourceId))
          : undefined;
        return (
          <ConnectionDialog
            title={current ? `Mover «${selectedEntity.name}» de «${current.name}» a…` : `Conectar «${selectedEntity.name}» con…`}
            // Al reasignar se ofrecen nodos del mismo tipo que el actual (p. ej. otra Obra)
            options={entities.filter((entity) =>
              entity.id !== selectedEntity.id && (!current || (entity.type === current.type && entity.id !== current.id)),
            )}
            initialType={connectionForm.mode === "reassign" ? connectionForm.relationship.type : "relacionado con"}
            isSubmitting={isSaving}
            error={connectionError}
            onClose={() => setConnectionForm(null)}
            onSubmit={handleSaveConnection}
          />
        );
      })()}

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
