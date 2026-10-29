import { useCallback, useEffect, useState } from "react";
import { Link, useNavigate, useParams } from "react-router-dom";
import EditIcon from "@mui/icons-material/Edit";
import ArrowBackIcon from "@mui/icons-material/ArrowBack";
import ReactMarkdown from "react-markdown";
import {
  Box,
  Alert,
  Button,
  Typography,
  Card,
  Chip,
  CircularProgress,
  List,
  ListItemButton,
  ListItemText,
} from "@mui/material";

import NodeFormDialog from "../components/NodeFormDialog";
import { getEntities, getRelationships, updateEntity } from "../services/api";
import { colorForType } from "../theme";
import type { Entity, EntityInput, Relationship } from "../types";

export default function EntityPage() {
  const { id } = useParams<{ id: string }>();

  const [entities, setEntities] = useState<Entity[]>([]);
  const [relationships, setRelationships] = useState<Relationship[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [isEditing, setIsEditing] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [saveError, setSaveError] = useState<string | null>(null);
  const navigate = useNavigate();

  const loadData = useCallback(() => {
    Promise.all([getEntities(), getRelationships()]).then(
      ([loadedEntities, loadedRelationships]) => {
        setEntities(loadedEntities);
        setRelationships(loadedRelationships);
      },
    ).catch((error: unknown) => {
      setError(error instanceof Error ? error.message : "No se pudo cargar la entidad.");
    }).finally(() => setIsLoading(false));
  }, []);

  useEffect(loadData, [loadData]);

  const handleSave = async (values: EntityInput) => {
    if (!id) return;
    setIsSaving(true);
    setSaveError(null);
    try {
      const saved = await updateEntity(id, { name: values.name, type: values.type, data: values.data });
      setIsEditing(false);
      // Si cambió el tipo cambia el prefijo del id (cli-1 -> per-1): ir a la nota nueva
      if (saved.id !== id) navigate(`/entidad/${saved.id}`, { replace: true });
      loadData();
    } catch (saveFailure) {
      setSaveError(saveFailure instanceof Error ? saveFailure.message : "No se pudo guardar.");
    } finally {
      setIsSaving(false);
    }
  };

  if (isLoading) {
    return <CircularProgress />;
  }

  if (error) return <Alert severity="error">{error}</Alert>;

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
        <Button component={Link} to="/grafo" state={{ select: entity.id }} startIcon={<ArrowBackIcon />} sx={{ mb: 2 }}>
          Volver al grafo
        </Button>
        <br />
        <Chip
          label={entity.type}
          size="small"
          sx={{
            bgcolor: colorForType(entity.type),
            color: "#fff",
            fontWeight: 600,
            mb: 1,
          }}
        />

        <Box sx={{ display: "flex", alignItems: "center", gap: 2, flexWrap: "wrap", mb: 2 }}>
          <Typography variant="h4" sx={{ flexGrow: 1 }}>
            {entity.name}
          </Typography>
          <Button
            variant="outlined"
            startIcon={<EditIcon />}
            onClick={() => {
              setSaveError(null);
              setIsEditing(true);
            }}
          >
            Editar
          </Button>
        </Box>

        {isEditing && (
          <NodeFormDialog
            entities={entities}
            entityToEdit={entity}
            isSubmitting={isSaving}
            error={saveError}
            onClose={() => setIsEditing(false)}
            onSubmit={handleSave}
          />
        )}

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
          sx={{
            p: 2,
            pb: 0,
            fontWeight: 700,
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
