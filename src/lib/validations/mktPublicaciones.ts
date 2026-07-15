import { z } from "zod";
import { prismaCuidSchema } from "@/lib/validations/common";

const isoYmdSchema = z
  .string()
  .regex(/^\d{4}-\d{2}-\d{2}$/, "Fecha inválida (use YYYY-MM-DD).")
  .refine((s) => {
    const [y, m, d] = s.split("-").map(Number);
    const dt = new Date(Date.UTC(y, m - 1, d));
    return dt.getUTCFullYear() === y && dt.getUTCMonth() === m - 1 && dt.getUTCDate() === d;
  }, "Fecha de calendario inválida.");

export const crearMktPublicacionSchema = z.object({
  fechaIso: isoYmdSchema,
  contenidoCreado: z.boolean(),
  redId: prismaCuidSchema,
  tipoContenidoId: prismaCuidSchema,
  ideaDetalleId: prismaCuidSchema,
});

export const editarMktPublicacionSchema = z.object({
  id: prismaCuidSchema,
  fechaIso: isoYmdSchema,
  contenidoCreado: z.boolean(),
  redId: prismaCuidSchema,
  tipoContenidoId: prismaCuidSchema,
  ideaDetalleId: prismaCuidSchema,
});

export const eliminarMktPublicacionSchema = z.object({
  id: prismaCuidSchema,
});

export type CrearMktPublicacionInput = z.infer<typeof crearMktPublicacionSchema>;
export type EditarMktPublicacionInput = z.infer<typeof editarMktPublicacionSchema>;
export type EliminarMktPublicacionInput = z.infer<typeof eliminarMktPublicacionSchema>;
