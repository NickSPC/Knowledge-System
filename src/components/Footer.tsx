import { Link as RouterLink } from "react-router-dom";
import { Box, Link, Typography } from "@mui/material";

import HubIcon from "@mui/icons-material/Hub";

const footerLinks = [
  { to: "/fuentes", label: "Fuentes" },
  { to: "/grafo", label: "Grafo" },
  { to: "/", label: "Inicio" },
];

export default function Footer() {
  const currentYear = new Date().getFullYear();

  return (
    <Box
      component="footer"
      sx={{
        borderTop: 1,
        borderColor: "divider",
        bgcolor: "rgba(10,9,18,.6)",
        px: { xs: 2, md: 4 },
        py: 2.5,
        display: "flex",
        flexWrap: "wrap",
        alignItems: "center",
        justifyContent: "space-between",
        gap: 2,
      }}
    >
      <Box sx={{ display: "flex", alignItems: "center", gap: 1.5 }}>
        <HubIcon color="primary" />

        <Box>
          <Typography variant="body2" fontWeight={600}>
            Knowledge System
          </Typography>

          <Typography variant="caption" color="text.secondary">
            Prototipo · Proyecto académico
          </Typography>
        </Box>
      </Box>

      <Box sx={{ display: "flex", gap: 3 }}>
        {footerLinks.map((link) => (
          <Link
            key={link.to}
            component={RouterLink}
            to={link.to}
            underline="hover"
            variant="body2"
            color="text.secondary"
          >
            {link.label}
          </Link>
        ))}
      </Box>

      <Typography variant="caption" color="text.secondary">
        © {currentYear} Knowledge System
      </Typography>
    </Box>
  );
}
