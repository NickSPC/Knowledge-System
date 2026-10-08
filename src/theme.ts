import { createTheme } from "@mui/material";
import type { EntityType } from "./types";

export const entityTypeColors: Record<EntityType, string> = {
    Cliente: "#8B6CFF",
    Producto: "#2DD4BF",
    Pedido: "#FBA94B",
};

export const theme = createTheme({
    palette: {
        mode: "dark",
        primary: { main: "#8B6CFF" },
        background: {
            default: "#0E0D17",
            paper: "#16152A",
        },
        text: {
            primary: "#E8E7F5",
            secondary: "#9A98B5",
        },
        divider: "rgba(255,255,255,0.08)",
    },

    shape: { borderRadius: 12 },

    typography: {
        fontFamily: '"Segoe UI", system-ui, sans-serif',
        h4: { fontWeight: 700, letterSpacing: -0.5 },
        h6: { fontWeight: 600 },
    },

    components: {
        MuiButton: {
            defaultProps: { disableElevation: true },
            styleOverrides: {
                root: { textTransform: "none", fontWeight: 600 },
            },
        },
        // Removes the lighter overlay that MUI adds to paper in dark mode
        MuiPaper: {
            styleOverrides: { root: { backgroundImage: "none" } },
        },
        MuiTableCell: {
            styleOverrides: {
                head: { color: "#9A98B5", fontWeight: 600 },
            },
        },
    },
});