import { z } from "zod";
import { competenciaConfigExtraccionSchema } from "@/lib/competenciaConfigExtraccion";
import {
  CONFIGURADO_FILTRO,
  DIF_PROMEDIO_FILTRO,
} from "@/lib/competenciaPreciosFiltros";
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

const idProveedorCompetenciaSchema = z
  .union([prismaCuidSchema, z.literal(""), z.null()])
  .optional()
  .transform((v) => {
    if (v === "" || v == null) return null;
    return v;
  });

export const createCompetenciaSchema = z.object({
  nombre: z.string().min(1, "El nombre es obligatorio.").max(120, "Nombre demasiado largo."),
  web: competenciaWebSchema,
  idProveedor: idProveedorCompetenciaSchema,
  configExtraccion: competenciaConfigExtraccionSchema.optional().nullable(),
});

export const updateCompetenciaSchema = createCompetenciaSchema.extend({
  id: prismaCuidSchema,
});

export const deleteCompetenciaSchema = z.object({
  id: prismaCuidSchema,
});

const difPromedioFiltroSchema = z
  .enum(["", DIF_PROMEDIO_FILTRO.MAS_CARO, DIF_PROMEDIO_FILTRO.MAS_BARATO])
  .optional()
  .default("");

const configuradoFiltroSchema = z
  .enum(["", CONFIGURADO_FILTRO.SI, CONFIGURADO_FILTRO.NO])
  .optional()
  .default("");

export const competenciaPreciosFiltrosSchema = paramsPaginaSchema.extend({
  q: z.string().max(200).optional().default(""),
  difPromedio: difPromedioFiltroSchema,
  /** PROV. CARO: precio tienda menor que el del competidor (relevamiento OK). */
  provCaroCompetenciaId: prismaCuidSchema.optional(),
  /** PROV. BARATO: precio tienda mayor que el del competidor (relevamiento OK). */
  provBaratoCompetenciaId: prismaCuidSchema.optional(),
  /** Solo ítems con precio relevado para ese competidor (URL OK o px_vta_sugerido). */
  competenciaId: prismaCuidSchema.optional(),
  configurado: configuradoFiltroSchema,
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
  tipoPagina: z
    .string()
    .max(40)
    .optional()
    .transform((v) => {
      const t = (v ?? "").trim();
      return t.length > 0 ? t : null;
    }),
});

export const syncCompetenciaPreciosBodySchema = z
  .object({
    competenciaId: prismaCuidSchema.optional(),
    /** Compara todos los competidores con al menos una URL cargada. */
    todos: z.literal(true).optional(),
    codTienda: listaPreciosCodTiendaSchema.optional(),
    limiteProductos: z.coerce.number().int().min(1).max(500).optional(),
  })
  .strict()
  .refine((d) => d.todos === true || d.competenciaId != null, {
    message: "Indicá competenciaId o todos: true.",
  })
  .refine((d) => !(d.todos === true && d.competenciaId != null), {
    message: "No combines todos con competenciaId.",
  });

