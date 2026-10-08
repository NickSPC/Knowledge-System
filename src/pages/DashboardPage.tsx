import { useEffect, useState, type ReactNode } from "react";
import { Link as RouterLink } from "react-router-dom";
import {
  Box,
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
import WarningAmberIcon from "@mui/icons-material/WarningAmber";
import AddIcon from "@mui/icons-material/Add";

import { getEntities, getRelationships, getSources } from "../services/api";
import { entityTypeColors } from "../theme";
import type { Entity, EntityType, Relationship, Source } from "../types";

const entityTypes: EntityType[] = ["Cliente", "Producto", "Pedido"];

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

  useEffect(() => {
    Promise.all([getSources(), getEntities(), getRelationships()]).then(
      ([loadedSources, loadedEntities, loadedRelationships]) => {
        setSources(loadedSources);
        setEntities(loadedEntities);
        setRelationships(loadedRelationships);
        setIsLoading(false);
      },
    );
  }, []);

  if (isLoading) {
    return <CircularProgress />;
  }

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

  const countByType = entityTypes.map((type) => ({
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
          gridTemplateColumns: "repeat(auto-fit, minmax(210px, 1fr))",
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
                        bgcolor: entityTypeColors[item.type],
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
                      <Typography variant="body2" fontWeight={600} noWrap>
                        {isOk
                          ? `Se sincronizó ${source.name}`
                          : `Falló la conexión con ${source.name}`}
                      </Typography>

                      <Typography variant="caption" color="text.secondary">
                        {source.lastSync}
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

      {/* Duplicates teaser */}
      <Card variant="outlined" sx={{ borderColor: "warning.main" }}>
        <CardContent sx={{ display: "flex", alignItems: "center", gap: 2 }}>
          <WarningAmberIcon color="warning" />

          <Box>
            <Typography fontWeight={600}>
              1 posible duplicado detectado
            </Typography>

            <Typography variant="body2" color="text.secondary">
              "Acme S.A." y "ACME SA" parecen ser la misma entidad, y vienen de
              fuentes distintas.
            </Typography>
          </Box>
        </CardContent>
      </Card>
    </Box>
  );
}
