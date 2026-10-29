import { useEffect, useState, type ReactNode } from "react";
import { Link as RouterLink } from "react-router-dom";
import {
  Box,
  Alert,
  Button,
  Card,
  CardContent,
  Chip,
  CircularProgress,
  Typography,
} from "@mui/material";

import StorageIcon from "@mui/icons-material/Storage";
import HubIcon from "@mui/icons-material/Hub";
import LinkIcon from "@mui/icons-material/Link";
import DescriptionIcon from "@mui/icons-material/Description";
import CheckCircleIcon from "@mui/icons-material/CheckCircle";
import ErrorIcon from "@mui/icons-material/Error";
import AddIcon from "@mui/icons-material/Add";
import WarningAmberIcon from "@mui/icons-material/WarningAmber";

import { getEntities, getRelationships, getSources } from "../services/api";
import { computeWarnings } from "../services/warnings";
import { formatDate } from "../services/format";
import { colorForType } from "../theme";
import type { Entity, Relationship, Source } from "../types";

type Stat = {
  label: string;
  value: number;
  icon: ReactNode;
  color: string;
};

export default function DashboardPage() {
  const [sources, setSources] = useState<Source[]>([]);
  const [entities, setEntities] = useState<Entity[]>([]);
  const [relationships, setRelationships] = useState<Relationship[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    Promise.all([getSources(), getEntities(), getRelationships()]).then(
      ([loadedSources, loadedEntities, loadedRelationships]) => {
        setSources(loadedSources);
        setEntities(loadedEntities);
        setRelationships(loadedRelationships);
      },
    ).catch((error: unknown) => {
      setError(error instanceof Error ? error.message : "No se pudo cargar el inicio.");
    }).finally(() => setIsLoading(false));
  }, []);

  if (isLoading) {
    return <CircularProgress />;
  }

  if (error) return <Alert severity="error">{error}</Alert>;

  const stats: Stat[] = [
    {
      label: "Fuentes",
      value: sources.length,
      icon: <StorageIcon />,
      color: "#8B6CFF",
    },
    {
      label: "Entidades",
      value: entities.length,
      icon: <HubIcon />,
      color: "#2DD4BF",
    },
    {
      label: "Relaciones",
      value: relationships.length,
      icon: <LinkIcon />,
      color: "#FBA94B",
    },
    {
      label: "Registros importados",
      value: sources.reduce((total, source) => total + source.recordCount, 0),
      icon: <DescriptionIcon />,
      color: "#F472B6",
    },
  ];

  const types = Array.from(new Set(entities.map((e) => e.type))).sort();
  const countByType = types.map((type) => ({
    type,
    count: entities.filter((entity) => entity.type === type).length,
  }));

  const maxCount = Math.max(...countByType.map((item) => item.count), 1);

  return (
    <Box sx={{ display: "grid", gap: 3 }}>
      {/* Welcome banner */}
      <Card
        variant="outlined"
        sx={{
          p: { xs: 3, md: 4 },
          background:
            "linear-gradient(135deg, rgba(139,108,255,.35) 0%, rgba(45,212,191,.12) 100%)",
        }}
      >
        <Typography variant="h4" sx={{ mb: 1 }}>
          Tu conocimiento, conectado
        </Typography>

        <Typography color="text.secondary" sx={{ mb: 3, maxWidth: 560 }}>
          Reunimos la información de tus fuentes, la ordenamos y mostramos cómo
          se relaciona. Hoy tenés {entities.length} entidades conectadas por{" "}
          {relationships.length} relaciones.
        </Typography>

        <Box sx={{ display: "flex", flexWrap: "wrap", gap: 1.5 }}>
          <Button
            variant="contained"
            component={RouterLink}
            to="/grafo"
            startIcon={<HubIcon />}
          >
            Explorar el grafo
          </Button>

          <Button
            variant="outlined"
            component={RouterLink}
            to="/fuentes/nueva"
            startIcon={<AddIcon />}
          >
            Agregar fuente
          </Button>
        </Box>
      </Card>

      {/* Stat cards */}
      <Box
        sx={{
          display: "grid",
          gridTemplateColumns: {
            xs: "repeat(2, minmax(0, 1fr))",
            lg: "repeat(4, minmax(0, 1fr))",
          },
          gap: 2,
        }}
      >
        {stats.map((stat) => (
          <Card
            key={stat.label}
            variant="outlined"
            sx={{
              transition: "transform .2s, border-color .2s",
              "&:hover": {
                transform: "translateY(-3px)",
                borderColor: stat.color,
              },
            }}
          >
            <CardContent sx={{ display: "flex", alignItems: "center", gap: 2 }}>
              <Box
                sx={{
                  width: 48,
                  height: 48,
                  borderRadius: 2,
                  display: "grid",
                  placeItems: "center",
                  color: stat.color,
                  bgcolor: `${stat.color}26`,
                }}
              >
                {stat.icon}
              </Box>

              <Box>
                <Typography variant="h4">{stat.value}</Typography>

                <Typography variant="body2" color="text.secondary">
                  {stat.label}
                </Typography>
              </Box>
            </CardContent>
          </Card>
        ))}
      </Box>

      <Box
        sx={{
          display: "grid",
          gridTemplateColumns: { xs: "1fr", lg: "1fr 1fr" },
          gap: 3,
        }}
      >
        {/* Entities by type */}
        <Card variant="outlined">
          <CardContent>
            <Typography variant="h6" sx={{ mb: 2 }}>
              Entidades por tipo
            </Typography>

            <Box sx={{ display: "grid", gap: 2 }}>
              {countByType.map((item) => (
                <Box key={item.type}>
                  <Box
                    sx={{
                      display: "flex",
                      justifyContent: "space-between",
                      mb: 0.5,
                    }}
                  >
                    <Typography variant="body2">{item.type}</Typography>

                    <Typography variant="body2" color="text.secondary">
                      {item.count}
                    </Typography>
                  </Box>

                  <Box
                    sx={{
                      height: 10,
                      borderRadius: 5,
                      bgcolor: "rgba(255,255,255,.06)",
                    }}
                  >
                    <Box
                      sx={{
                        height: "100%",
                        width: `${(item.count / maxCount) * 100}%`,
                        borderRadius: 5,
                        bgcolor: colorForType(item.type),
                      }}
                    />
                  </Box>
                </Box>
              ))}
            </Box>
          </CardContent>
        </Card>

        {/* Recent activity */}
        <Card variant="outlined">
          <CardContent>
            <Typography variant="h6" sx={{ mb: 2 }}>
              Actividad reciente
            </Typography>

            <Box sx={{ display: "grid", gap: 2 }}>
              {sources.map((source) => {
                const isOk = source.status === "ok";

                return (
                  <Box
                    key={source.id}
                    sx={{ display: "flex", alignItems: "center", gap: 1.5 }}
                  >
                    {isOk ? (
                      <CheckCircleIcon color="success" />
                    ) : (
                      <ErrorIcon color="error" />
                    )}

                    <Box sx={{ flexGrow: 1, minWidth: 0 }}>
                      <Typography
                        variant="body2"
                        sx={{ fontWeight: 600 }}
                        noWrap
                      >
                        {!isOk
                          ? `Falló la conexión con ${source.name}`
                          : source.lastSync
                            ? `Se sincronizó ${source.name}`
                            : `Se cargó ${source.name}`}
                      </Typography>

                      <Typography variant="caption" color="text.secondary">
                        {formatDate(source.lastSync)}
                      </Typography>
                    </Box>

                    <Chip size="small" label={source.type} variant="outlined" />
                  </Box>
                );
              })}
            </Box>
          </CardContent>
        </Card>
      </Box>

      {/* Avisos: problemas comunes detectados en los datos (src/services/warnings.ts) */}
      <WarningsCard entities={entities} relationships={relationships} />
    </Box>
  );
}

function WarningsCard({ entities, relationships }: { entities: Entity[]; relationships: Relationship[] }) {
  const warnings = computeWarnings(entities, relationships);
  const names = new Map(entities.map((entity) => [entity.id, entity.name]));
  const kinds = Array.from(new Set(warnings.map((warning) => warning.kind)));

  return (
    <Card variant="outlined" sx={{ mt: 3, borderColor: warnings.length > 0 ? "warning.main" : undefined }}>
      <CardContent>
        <Box sx={{ display: "flex", alignItems: "center", gap: 1, mb: 2 }}>
          <WarningAmberIcon color={warnings.length > 0 ? "warning" : "disabled"} />
          <Typography variant="h6" sx={{ flexGrow: 1 }}>Avisos</Typography>
          <Chip size="small" label={warnings.length} color={warnings.length > 0 ? "warning" : "default"} />
        </Box>

        {warnings.length === 0 && (
          <Typography color="text.secondary">No se detectaron problemas en los datos.</Typography>
        )}

        <Box sx={{ display: "grid", gap: 2 }}>
          {kinds.map((kind) => {
            const group = warnings.filter((warning) => warning.kind === kind);
            return (
              <Box key={kind}>
                <Typography variant="subtitle2" sx={{ mb: 1 }}>
                  {kind} <Typography component="span" variant="caption" color="text.secondary">({group.length})</Typography>
                </Typography>
                <Box sx={{ display: "grid", gap: 1 }}>
                  {group.map((warning, index) => (
                    <Alert key={index} severity={warning.severity} sx={{ alignItems: "center" }}>
                      {warning.detail}{" "}
                      {warning.entityIds.map((entityId) => (
                        <Button
                          key={entityId}
                          size="small"
                          component={RouterLink}
                          to={`/entidad/${encodeURIComponent(entityId)}`}
                          sx={{ ml: 0.5, py: 0, minWidth: 0, textTransform: "none" }}
                        >
                          {names.get(entityId)}
                        </Button>
                      ))}
                    </Alert>
                  ))}
                </Box>
              </Box>
            );
          })}
        </Box>
      </CardContent>
    </Card>
  );
}
