import { useState } from "react";
import { Outlet, NavLink, useLocation } from "react-router-dom";
import {
  Box,
  Drawer,
  List,
  ListItemButton,
  ListItemIcon,
  ListItemText,
  Typography,
  AppBar,
  Toolbar,
  InputBase,
  Avatar,
  IconButton,
  useMediaQuery,
  useTheme,
} from "@mui/material";

import MenuIcon from "@mui/icons-material/Menu";
import DashboardIcon from "@mui/icons-material/Dashboard";
import StorageIcon from "@mui/icons-material/Storage";
import HubIcon from "@mui/icons-material/Hub";
import SearchIcon from "@mui/icons-material/Search";

import Footer from "./Footer";

const DRAWER_WIDTH = 240;

const navigationItems = [
  { to: "/", label: "Inicio", icon: <DashboardIcon /> },
  { to: "/fuentes", label: "Fuentes", icon: <StorageIcon /> },
  { to: "/grafo", label: "Grafo", icon: <HubIcon /> },
];

export default function Layout() {
  const { pathname } = useLocation();
  const theme = useTheme();
  const isDesktop = useMediaQuery(theme.breakpoints.up("md"));
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);

  const closeMobileMenu = () => setIsMobileMenuOpen(false);

  const drawerContent = (
    <>
      <Box
        sx={{ display: "flex", alignItems: "center", gap: 1.5, mb: 4, px: 1 }}
      >
        <Box
          sx={{
            width: 36,
            height: 36,
            borderRadius: 2,
            display: "grid",
            placeItems: "center",
            background: "linear-gradient(135deg, #8B6CFF 0%, #2DD4BF 100%)",
            color: "#0E0D17",
          }}
        >
          <HubIcon fontSize="small" />
        </Box>

        <Typography variant="h6">Knowledge System</Typography>
      </Box>

      <List>
        {navigationItems.map((item) => (
          <ListItemButton
            key={item.to}
            component={NavLink}
            to={item.to}
            onClick={closeMobileMenu}
            // "/" matches every route, so Inicio is selected only on the exact path
            selected={
              item.to === "/" ? pathname === "/" : pathname.startsWith(item.to)
            }
            sx={{
              borderRadius: 2,
              mb: 0.5,
              color: "text.secondary",
              "&.Mui-selected": {
                bgcolor: "rgba(139,108,255,.16)",
                color: "primary.light",
              },
              "&.Mui-selected:hover": {
                bgcolor: "rgba(139,108,255,.22)",
              },
              "&:hover": { bgcolor: "rgba(255,255,255,.05)" },
            }}
          >
            <ListItemIcon sx={{ color: "inherit", minWidth: 40 }}>
              {item.icon}
            </ListItemIcon>

            <ListItemText primary={item.label} />
          </ListItemButton>
        ))}
      </List>
    </>
  );

  return (
    <Box sx={{ display: "flex", minHeight: "100vh" }}>
      <Drawer
        variant={isDesktop ? "permanent" : "temporary"}
        open={isDesktop || isMobileMenuOpen}
        onClose={closeMobileMenu}
        ModalProps={{ keepMounted: true }}
        sx={{
          width: isDesktop ? DRAWER_WIDTH : undefined,
          flexShrink: 0,
          "& .MuiDrawer-paper": {
            width: DRAWER_WIDTH,
            bgcolor: "#0A0912",
            borderRight: 1,
            borderColor: "divider",
            p: 2,
          },
        }}
      >
        {drawerContent}
      </Drawer>

      {/* Column layout so the footer always stays at the bottom */}
      <Box
        sx={{
          flexGrow: 1,
          minWidth: 0,
          display: "flex",
          flexDirection: "column",
        }}
      >
        <AppBar
          position="sticky"
          color="transparent"
          elevation={0}
          sx={{
            borderBottom: 1,
            borderColor: "divider",
            backdropFilter: "blur(10px)",
            bgcolor: "rgba(14,13,23,.8)",
          }}
        >
          <Toolbar sx={{ gap: 2 }}>
            {!isDesktop && (
              <IconButton
                edge="start"
                aria-label="Abrir menú"
                onClick={() => setIsMobileMenuOpen(true)}
              >
                <MenuIcon />
              </IconButton>
            )}

            <Box
              sx={{
                display: "flex",
                alignItems: "center",
                gap: 1,
                bgcolor: "rgba(255,255,255,.05)",
                border: 1,
                borderColor: "divider",
                px: 1.5,
                py: 0.5,
                borderRadius: 2,
                width: { xs: "100%", sm: 360 },
                minWidth: 0,
              }}
            >
              <SearchIcon fontSize="small" color="disabled" />

              <InputBase placeholder="Buscar en el sistema…" fullWidth />
            </Box>

            <Box sx={{ flexGrow: 1, display: { xs: "none", sm: "block" } }} />

            <Avatar
              sx={{
                bgcolor: "primary.main",
                width: 34,
                height: 34,
                display: { xs: "none", sm: "flex" },
              }}
            >
              U
            </Avatar>
          </Toolbar>
        </AppBar>

        <Box component="main" sx={{ flexGrow: 1, p: { xs: 2, md: 4 } }}>
          <Outlet />
        </Box>

        <Footer />
      </Box>
    </Box>
  );
}
