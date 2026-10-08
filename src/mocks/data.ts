import type { Source, Entity, Relationship } from "../types";

export const sources: Source[] = [
  {
    id: 1,
    name: "clientes_2025.xlsx",
    type: "Excel",
    status: "ok",
    lastSync: "05/10/2026 10:32",
    recordCount: 120,
  },
  {
    id: 2,
    name: "Base ventas",
    type: "SQL",
    status: "ok",
    lastSync: "06/10/2026 18:10",
    recordCount: 840,
  },
  {
    id: 3,
    name: "Tablero Proyectos",
    type: "Trello",
    status: "error",
    lastSync: "01/10/2026 09:00",
    recordCount: 0,
  },
];

export const entities: Entity[] = [
  {
    id: "cli-1",
    type: "Cliente",
    name: "Acme S.A.",
    source: "clientes_2025.xlsx",
    data: {
      email: "contacto@acme.com",
      ciudad: "Córdoba",
    },
  },
  {
    id: "cli-2",
    type: "Cliente",
    name: "Bodega Los Andes",
    source: "clientes_2025.xlsx",
    data: {
      email: "ventas@losandes.com",
      ciudad: "Rosario",
    },
  },
  {
    id: "cli-3",
    type: "Cliente",
    name: "Distribuidora Cuyo",
    source: "clientes_2025.xlsx",
    data: {
      email: "info@dcuyo.com",
      ciudad: "Buenos Aires",
    },
  },
  {
    id: "cli-4",
    type: "Cliente",
    name: "ACME SA",
    source: "Base ventas",
    data: {
      email: "contacto@acme.com",
      ciudad: "Córdoba",
    },
  },
  {
    id: "pro-1",
    type: "Producto",
    name: "Malbec 750 ml",
    source: "Base ventas",
    data: {
      precio: 4500,
    },
  },
  {
    id: "pro-2",
    type: "Producto",
    name: "Aceite de oliva 1 L",
    source: "Base ventas",
    data: {
      precio: 6200,
    },
  },
  {
    id: "pro-3",
    type: "Producto",
    name: "Caja de cartón x12",
    source: "Base ventas",
    data: {
      precio: 1800,
    },
  },
  {
    id: "pro-4",
    type: "Producto",
    name: "Etiquetas adhesivas",
    source: "Base ventas",
    data: {
      precio: 950,
    },
  },
  {
    id: "ped-1",
    type: "Pedido",
    name: "Pedido #1001",
    source: "Base ventas",
    data: {
      fecha: "28/09/2026",
      total: 54000,
    },
  },
  {
    id: "ped-2",
    type: "Pedido",
    name: "Pedido #1002",
    source: "Base ventas",
    data: {
      fecha: "30/09/2026",
      total: 31500,
    },
  },
  {
    id: "ped-3",
    type: "Pedido",
    name: "Pedido #1003",
    source: "Base ventas",
    data: {
      fecha: "01/10/2026",
      total: 18600,
    },
  },
  {
    id: "ped-4",
    type: "Pedido",
    name: "Pedido #1004",
    source: "Base ventas",
    data: {
      fecha: "03/10/2026",
      total: 24800,
    },
  },
  {
    id: "ped-5",
    type: "Pedido",
    name: "Pedido #1005",
    source: "Base ventas",
    data: {
      fecha: "04/10/2026",
      total: 9500,
    },
  },
  {
    id: "ped-6",
    type: "Pedido",
    name: "Pedido #1006",
    source: "Base ventas",
    data: {
      fecha: "05/10/2026",
      total: 12000,
    },
  },
];

const createRelationship = (
  sourceId: string,
  targetId: string,
  type: string,
): Relationship => ({
  sourceId,
  targetId,
  type,
});

export const relationships: Relationship[] = [
  createRelationship("ped-1", "cli-1", "pertenece a"),
  createRelationship("ped-1", "pro-1", "contiene"),
  createRelationship("ped-1", "pro-3", "contiene"),

  createRelationship("ped-2", "cli-2", "pertenece a"),
  createRelationship("ped-2", "pro-1", "contiene"),
  createRelationship("ped-2", "pro-4", "contiene"),

  createRelationship("ped-3", "cli-2", "pertenece a"),
  createRelationship("ped-3", "pro-2", "contiene"),

  createRelationship("ped-4", "cli-3", "pertenece a"),
  createRelationship("ped-4", "pro-2", "contiene"),
  createRelationship("ped-4", "pro-3", "contiene"),

  createRelationship("ped-5", "cli-1", "pertenece a"),
  createRelationship("ped-5", "pro-4", "contiene"),

  createRelationship("ped-6", "cli-4", "pertenece a"),
  createRelationship("ped-6", "pro-1", "contiene"),
];