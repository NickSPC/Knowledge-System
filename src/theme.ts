import { createTheme } from "@mui/material";

// Tonos bien distintos entre sí, legibles sobre fondo oscuro
const COLORS = [
  "#8B6CFF", "#2DD4BF", "#FB923C", "#F87171", "#60A5FA", "#4ADE80",
  "#FACC15", "#F472B6", "#22D3EE", "#A3E635", "#E5E7EB", "#C084FC",
];

// Color de cada tipo: el que eligió el usuario o el primero libre de la paleta (se guardan en este navegador)
// shortcut: localStorage es por navegador; si hace falta compartirlos entre usuarios, guardarlos en el back
const COLORS_KEY = "knowledge-system:type-colors";
let customColors: Record<string, string> = {};
try {
  customColors = JSON.parse(localStorage.getItem(COLORS_KEY) ?? "{}");
} catch {
  customColors = {};
}

export function setTypeColor(type: string, color: string) {
  customColors = { ...customColors, [type]: color };
  saveColors();
}

function saveColors() {
  try {
    localStorage.setItem(COLORS_KEY, JSON.stringify(customColors));
  } catch {
    // sin almacenamiento, el color vale solo hasta recargar
  }
}

export function colorForType(type: string): string {
  if (customColors[type]) return customColors[type];
  // Un tipo nuevo toma el primer color que no use otro tipo, así dos tipos no comparten color
  const used = new Set(Object.values(customColors).map((color) => color.toUpperCase()));
  const color = COLORS.find((candidate) => !used.has(candidate))
    ?? COLORS[Object.keys(customColors).length % COLORS.length]; // paleta agotada: se repite
  customColors = { ...customColors, [type]: color };
  saveColors();
  return color;
}

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