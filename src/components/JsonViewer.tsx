import { useMemo, useState, type ReactNode } from "react";
import { Box, Button, Typography } from "@mui/material";

import ContentCopyIcon from "@mui/icons-material/ContentCopy";
import CheckIcon from "@mui/icons-material/Check";
import DownloadIcon from "@mui/icons-material/Download";

// Grupos: 1 = cadena, 2 = dos puntos tras una clave, 3 = true / false / null, resto = números
const TOKEN_REGEX =
  /("(?:\\.|[^"\\])*")(\s*:)?|\b(true|false|null)\b|-?\d+(?:\.\d+)?(?:[eE][+-]?\d+)?/g;

const COLORS = {
  key: "#A78BFA",
  string: "#2DD4BF",
  number: "#FBA94B",
  literal: "#F472B6",
};

function highlight(json: string): ReactNode[] {
  const nodes: ReactNode[] = [];
  let lastIndex = 0;

  for (const match of json.matchAll(TOKEN_REGEX)) {
    const index = match.index ?? 0;
    const [token, stringToken, colon, literal] = match;

    if (index > lastIndex) {
      nodes.push(json.slice(lastIndex, index));
    }

    let color = COLORS.number;

    if (stringToken) {
      color = colon ? COLORS.key : COLORS.string;
    } else if (literal) {
      color = COLORS.literal;
    }

    nodes.push(
      <span key={index} style={{ color }}>
        {stringToken ?? token}
      </span>,
    );

    if (colon) {
      nodes.push(colon);
    }

    lastIndex = index + token.length;
  }

  if (lastIndex < json.length) {
    nodes.push(json.slice(lastIndex));
  }

  return nodes;
}

type JsonViewerProps = {
  data: unknown;
  fileName?: string;
};

export default function JsonViewer({
  data,
  fileName = "data.json",
}: JsonViewerProps) {
  const [isCopied, setIsCopied] = useState(false);

  const json = useMemo(() => JSON.stringify(data, null, 2), [data]);
  const highlighted = useMemo(() => highlight(json), [json]);
  const lineCount = json.split("\n").length;

  const handleCopy = async () => {
    await navigator.clipboard.writeText(json);
    setIsCopied(true);
    setTimeout(() => setIsCopied(false), 1500);
  };

  const handleDownload = () => {
    const url = URL.createObjectURL(
      new Blob([json], { type: "application/json" }),
    );
    const link = document.createElement("a");

    link.href = url;
    link.download = fileName;
    link.click();

    URL.revokeObjectURL(url);
  };

  return (
    <Box
      sx={{
        display: "flex",
        flexDirection: "column",
        flex: 1,
        minHeight: 0,
        gap: 1,
      }}
    >
      <Box sx={{ display: "flex", alignItems: "center", gap: 1 }}>
        <Typography
          variant="caption"
          color="text.secondary"
          sx={{ flexGrow: 1 }}
        >
          {fileName} · {lineCount} líneas
        </Typography>

        <Button
          size="small"
          startIcon={isCopied ? <CheckIcon /> : <ContentCopyIcon />}
          onClick={handleCopy}
        >
          {isCopied ? "Copiado" : "Copiar"}
        </Button>

        <Button
          size="small"
          startIcon={<DownloadIcon />}
          onClick={handleDownload}
        >
          Descargar
        </Button>
      </Box>

      <Box
        component="pre"
        sx={{
          flex: 1,
          minHeight: 0,
          m: 0,
          p: 2,
          overflow: "auto",
          borderRadius: 2,
          border: 1,
          borderColor: "divider",
          bgcolor: "#0A0912",
          fontFamily: 'Consolas, "Courier New", monospace',
          fontSize: 13,
          lineHeight: 1.6,
          color: "text.primary",
        }}
      >
        {highlighted}
      </Box>
    </Box>
  );
}
