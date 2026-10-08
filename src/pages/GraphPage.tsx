import { useEffect, useMemo, useRef, useState, type ReactNode } from "react";
import { useNavigate } from "react-router-dom";
import ForceGraph2D, { type ForceGraphMethods } from "react-force-graph-2d";
import {
  Box,
  Typography,
  Chip,
  Card,
  IconButton,
  Tooltip,
} from "@mui/material";

import AddIcon from "@mui/icons-material/Add";
import RemoveIcon from "@mui/icons-material/Remove";
import CenterFocusStrongIcon from "@mui/icons-material/CenterFocusStrong";

import { getEntities, getRelationships } from "../services/api";
import { entityTypeColors } from "../theme";
import type { Entity, Relationship, EntityType } from "../types";

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

  const containerRef = useRef<HTMLDivElement>(null);
  const graphRef = useRef<ForceGraphMethods | undefined>(undefined);
  const navigate = useNavigate();

  // Shorter graph on small screens
  const graphHeight = graphWidth < 600 ? 380 : 560;

  useEffect(() => {
    getEntities().then(setEntities);
    getRelationships().then(setRelationships);
  }, []);

  // Keeps the graph width in sync with its container
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

  // The graph data does NOT depend on the active filters, so nodes keep
  // their positions when a type is hidden or shown again.
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

  const toggleEntityType = (type: EntityType) => {
    setActiveTypes((currentTypes) =>
      currentTypes.includes(type)
        ? currentTypes.filter((currentType) => currentType !== type)
        : [...currentTypes, type],
    );
  };

  const handleNodeClick = (node: { id?: string | number }) => {
    if (!node.id) {
      return;
    }

    navigate(`/entidad/${node.id}`);
  };

  // Only runs on click, so reading the ref here is safe
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

  return (
    <Box>
      <Typography variant="h4">Grafo</Typography>

      <Typography color="text.secondary" sx={{ mb: 2 }}>
        Hacé clic en un nodo para abrir su nota. Arrastralo para moverlo y usá
        la rueda o los botones para acercar y alejar.
      </Typography>

      <Box
        sx={{
          display: "flex",
          flexWrap: "wrap",
          gap: 1,
          mb: 2,
        }}
      >
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

            // Draws the entity name below each node, with a constant size on screen
            context.font = `${12 / globalScale}px "Segoe UI", sans-serif`;
            context.textAlign = "center";
            context.textBaseline = "top";
            context.fillStyle = "#E8E7F5";
            context.fillText(graphNode.name, node.x ?? 0, (node.y ?? 0) + 9);
          }}
          onNodeClick={handleNodeClick}
        />

        {/* Zoom controls, floating over the graph */}
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
    </Box>
  );
}
