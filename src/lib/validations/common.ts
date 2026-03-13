import { z } from "zod";

/** Un solo UUID (Prisma/crypto id). */
export const uuidSchema = z.string().uuid("ID inválido.");

/** Lista de UUIDs (mínimo uno). */
export const uuidsSchema = z.array(uuidSchema).min(1, "Al menos un ID es requerido.");

/** Parámetros de paginación y filtros de texto (para acciones de listado). */
export const paramsPaginaSchema = z.object({
  q: z.string().optional().default(""),
  pagina: z.string().optional().default("1"),
});

export type ParamsPagina = z.infer<typeof paramsPaginaSchema>;
