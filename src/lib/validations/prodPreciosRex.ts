import { z } from "zod";
import { prismaCuidSchema } from "@/lib/validations/common";
import { filaPdfMatrizNormalizadaSchema } from "@/lib/validations/parseListaPreciosPdfMatriz";

export const guardarPreciosRexDesdePdfSchema = z.object({
  proveedorId: prismaCuidSchema,
  filas: z.array(filaPdfMatrizNormalizadaSchema).min(1).max(50_000),
});

export type GuardarPreciosRexDesdePdfInput = z.infer<typeof guardarPreciosRexDesdePdfSchema>;
