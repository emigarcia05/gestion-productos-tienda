import { z } from "zod";

export const PAGINA_INICIO_PDF_MATRIZ_DEFAULT = 9;

export const MAX_PDF_LISTA_PRECIOS_BYTES = 15 * 1024 * 1024;

export const parseListaPreciosPdfMatrizQuerySchema = z.object({
  paginaInicio: z.coerce
    .number()
    .int()
    .min(1)
    .max(500)
    .optional()
    .default(PAGINA_INICIO_PDF_MATRIZ_DEFAULT),
});

export const filaPdfMatrizNormalizadaSchema = z.object({
  descripcionBase: z.string().min(1).max(512),
  presentacion: z.string().min(1).max(32),
  descripcionExport: z.string().min(1).max(560),
  precio: z.number().positive().max(999_999_999),
});

export const parseListaPreciosPdfMatrizResponseSchema = z.object({
  ok: z.literal(true),
  filas: z.array(filaPdfMatrizNormalizadaSchema),
  meta: z.object({
    paginaInicioUsada: z.number().int().min(1),
    paginasProcesadas: z.number().int().min(0),
    filasOmitidasVacias: z.number().int().min(0),
    advertencias: z.array(z.string()),
  }),
});

export type FilaPdfMatrizNormalizadaDto = z.infer<typeof filaPdfMatrizNormalizadaSchema>;
export type ParseListaPreciosPdfMatrizResponse = z.infer<typeof parseListaPreciosPdfMatrizResponseSchema>;
