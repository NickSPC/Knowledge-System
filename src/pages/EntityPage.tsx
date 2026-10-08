import { useEffect, useState } from "react";
import { Link, useParams } from "react-router-dom";
import ReactMarkdown from "react-markdown";
import {
  Box,
  Button,
  Typography,
  Card,
  Chip,
  CircularProgress,
  List,
  ListItemButton,
  ListItemText,
} from "@mui/material";

import { getEntities, getRelationships } from "../services/api";
import { entityTypeColors } from "../theme";
import type { Entity, Relationship } from "../types";

export default function EntityPage() {
  const { id } = useParams<{ id: string }>();

  const [entities, setEntities] = useState<Entity[]>([]);
  const [relationships, setRelationships] = useState<Relationship[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    Promise.all([getEntities(), getRelationships()]).then(
      ([loadedEntities, loadedRelationships]) => {
        setEntities(loadedEntities);
        setRelationships(loadedRelationships);
        setIsLoading(false);
      },
    );
  }, []);

  if (isLoading) {
    return <CircularProgress />;
  }

  const entity = entities.find((item) => item.id === id);

  if (!entity) {
    return (
      <Box>
        <Typography variant="h4" sx={{ mb: 1 }}>
          Entidad no encontrada
        </Typography>

        <Typography color="text.secondary" sx={{ mb: 3 }}>
          No existe ninguna entidad con el identificador "{id}".
        </Typography>

        <Button variant="contained" component={Link} to="/grafo">
          Volver al grafo
        </Button>
      </Box>
    );
  }

  const getEntityName = (entityId: string) =>
    entities.find((item) => item.id === entityId)?.name ?? entityId;

  const outgoingRelationships = relationships.filter(
    (relationship) => relationship.sourceId === entity.id,
  );

  const incomingRelationships = relationships.filter(
    (relationship) => relationship.targetId === entity.id,
  );

  const createEntityLink = (entityId: string) =>
    `[${getEntityName(entityId)}](/entidad/${entityId})`;

  const markdownContent = [
    `Esta entidad viene de **${entity.source}**.`,

    "## Datos",

    ...Object.entries(entity.data).map(
      ([key, value]) => `- **${key}:** ${value}`,
    ),

    "## Relaciones",

    ...(outgoingRelationships.length
      ? outgoingRelationships.map(
          (relationship) =>
            `- ${relationship.type} ${createEntityLink(relationship.targetId)}`,
        )
      : ["Sin relaciones salientes."]),

    "## Mencionada por",

    ...(incomingRelationships.length
      ? incomingRelationships.map(
          (relationship) =>
            `- ${createEntityLink(relationship.sourceId)} (${relationship.type})`,
        )
      : ["Nadie la menciona todavía."]),
  ].join("\n\n");

  // Set removes duplicates, so each connected entity appears only once
  const connectedEntityIds = Array.from(
    new Set([
      ...outgoingRelationships.map((relationship) => relationship.targetId),
      ...incomingRelationships.map((relationship) => relationship.sourceId),
    ]),
  );

  return (
    <Box
      sx={{
        display: "grid",
        gridTemplateColumns: {
          xs: "1fr",
          lg: "2fr 1fr",
        },
        gap: 3,
      }}
    >
      <Box>
        <Chip
          label={entity.type}
          size="small"
          sx={{
            bgcolor: entityTypeColors[entity.type],
            color: "#fff",
            fontWeight: 600,
            mb: 1,
          }}
        />

        <Typography variant="h4" sx={{ mb: 2 }}>
          {entity.name}
        </Typography>

        <Card
          variant="outlined"
          sx={{
            p: 3,
            "& a": {
              color: "primary.main",
              fontWeight: 600,
            },
            "& ul": {
              pl: 3,
            },
          }}
        >
          <ReactMarkdown
            components={{
              a: ({ href, children }) => (
                <Link to={href ?? "#"}>{children}</Link>
              ),
            }}
          >
            {markdownContent}
          </ReactMarkdown>
        </Card>
      </Box>

      <Card
        variant="outlined"
        sx={{
          alignSelf: "start",
        }}
      >
        <Typography
          fontWeight={700}
          sx={{
            p: 2,
            pb: 0,
          }}
        >
          Conectada con
        </Typography>

        <List>
          {connectedEntityIds.map((entityId) => (
            <ListItemButton
              key={entityId}
              component={Link}
              to={`/entidad/${entityId}`}
            >
              <ListItemText primary={getEntityName(entityId)} />
            </ListItemButton>
          ))}
        </List>
      </Card>
    </Box>
  );
}
