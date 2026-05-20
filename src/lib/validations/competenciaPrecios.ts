import { z } from "zod";
import {
  ESTADO_RELEVAMIENTO_COMPETENCIA,
  type EstadoRelevamientoCompetencia,
} from "@/lib/competenciaRelevamiento";
import { listaPreciosCodTiendaSchema, paramsPaginaSchema, prismaCuidSchema } from "@/lib/validations/common";

export const competenciaWebSchema = z
  .string()
  .min(4, "La URL del sitio es obligatoria.")
  .max(500, "La URL es demasiado larga.")
  .refine(
    (v) => {
      const s = v.trim();
      try {
        const u = s.startsWith("http://") || s.startsWith("https://") ? s : `https://${s}`;
        new URL(u);
        return true;
      } catch {
        return false;
      }
    },
    { message: "URL del sitio inválida." }
  );

export const createCompetenciaSchema = z.object({
  nombre: z.string().min(1, "El nombre es obligatorio.").max(120, "Nombre demasiado largo."),
  web: competenciaWebSchema,
});

export const updateCompetenciaSchema = createCompetenciaSchema.extend({
  id: prismaCuidSchema,
});

export const deleteCompetenciaSchema = z.object({
  id: prismaCuidSchema,
});

const estadoVinculoSchema = z
  .enum([
    "",
    ESTADO_RELEVAMIENTO_COMPETENCIA.SIN_URL,
    ESTADO_RELEVAMIENTO_COMPETENCIA.PENDIENTE,
    ESTADO_RELEVAMIENTO_COMPETENCIA.OK,
    ESTADO_RELEVAMIENTO_COMPETENCIA.SIN_PRECIO,
    ESTADO_RELEVAMIENTO_COMPETENCIA.ERROR,
  ])
  .optional()
  .default("");

export const competenciaPreciosFiltrosSchema = paramsPaginaSchema.extend({
  q: z.string().max(200).optional().default(""),
  marca: z.string().max(120).optional().default(""),
  rubro: z.string().max(120).optional().default(""),
  /** Requerido si `estadoVinculo` ≠ vacío: filtra por competidor de la columna. */
  competenciaId: prismaCuidSchema.optional(),
  estadoVinculo: estadoVinculoSchema,
});

export type CompetenciaPreciosFiltros = z.infer<typeof competenciaPreciosFiltrosSchema>;

export const guardarUrlVinculoSchema = z.object({
  codTienda: listaPreciosCodTiendaSchema,
  competenciaId: prismaCuidSchema,
  urlProducto: z
    .string()
    .max(2000)
    .optional()
    .transform((v) => {
      const t = (v ?? "").trim();
      return t.length > 0 ? t : null;
    }),
});

export const syncCompetenciaPreciosBodySchema = z
  .object({
    competenciaId: prismaCuidSchema,
    codTienda: listaPreciosCodTiendaSchema.optional(),
    limiteProductos: z.coerce.number().int().min(1).max(500).optional(),
  })
  .strict();

export function esEstadoVinculoValido(v: string): v is EstadoRelevamientoCompetencia {
  return Object.values(ESTADO_RELEVAMIENTO_COMPETENCIA).includes(v as EstadoRelevamientoCompetencia);
}
