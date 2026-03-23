import { z } from "zod";

export const getPedidoUrgenteDataParamsSchema = z.object({
  sucursal: z.string().max(50).optional(),
  q: z.string().max(500).optional(),
  pagina: z.string().max(20).optional(),
  proveedor: z.string().max(128).optional(),
  pedido: z.string().max(100).optional(),
});

const tipoPedidoTablaSchema = z.enum(["URGENTE", "TINTOMETRICO", "REPOSICION"]);

export const getEnviarPedidoTablaParamsSchema = z.object({
  sucursal: z.string().max(50).default(""),
  proveedor: z.string().max(128).default(""),
  tipos: z.array(tipoPedidoTablaSchema).max(10).default([]),
  q: z.string().max(500).optional(),
});
