import { z } from "zod";
import { listaPreciosCodExtSchema, prismaCuidSchema } from "@/lib/validations/common";
import { filaPdfMatrizNormalizadaSchema } from "@/lib/validations/parseListaPreciosPdfMatriz";

export const guardarPreciosRexDesdePdfSchema = z.object({
  proveedorId: prismaCuidSchema,
  filas: z.array(filaPdfMatrizNormalizadaSchema).min(1).max(50_000),
});

export const listarPreciosRexParaVincularSchema = z.object({
  proveedorId: prismaCuidSchema,
  codExtLista: listaPreciosCodExtSchema,
  q: z.string().max(500).optional(),
});

export const vincularListaPrecioConPrecioRexSchema = z.object({
  codExtLista: listaPreciosCodExtSchema,
  idPrecioRex: prismaCuidSchema,
});

export type GuardarPreciosRexDesdePdfInput = z.infer<typeof guardarPreciosRexDesdePdfSchema>;
export type ListarPreciosRexParaVincularInput = z.infer<typeof listarPreciosRexParaVincularSchema>;
export type VincularListaPrecioConPrecioRexInput = z.infer<typeof vincularListaPrecioConPrecioRexSchema>;
