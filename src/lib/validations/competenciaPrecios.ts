import { z } from "zod";
import { competenciaConfigExtraccionSchema } from "@/lib/competenciaConfigExtraccion";
import { listaPreciosCodTiendaSchema, prismaCuidSchema } from "@/lib/validations/common";

/** URL del sitio: opcional; si se informa, debe ser válida. */
export const competenciaWebSchema = z
  .string()
  .max(500, "La URL es demasiado larga.")
  .optional()
  .default("")
  .transform((v) => (v ?? "").trim())
  .refine(
    (v) => {
      if (!v) return true;
      try {
        const u = v.startsWith("http://") || v.startsWith("https://") ? v : `https://${v}`;
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

export const relevarUrlVinculoSchema = z.object({
  codTienda: listaPreciosCodTiendaSchema,
  competenciaId: prismaCuidSchema,
});

export const relevarUrlsProductoSchema = z.object({
  codTienda: listaPreciosCodTiendaSchema,
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

