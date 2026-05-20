import { z } from "zod";
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

const competenciaUrlBusquedaSchema = z
  .string()
  .max(500, "La URL de búsqueda es demasiado larga.")
  .optional()
  .transform((v) => {
    const t = (v ?? "").trim();
    return t.length > 0 ? t : undefined;
  })
  .refine(
    (v) => {
      if (!v) return true;
      try {
        const u = v.startsWith("http://") || v.startsWith("https://") ? v : `https://${v}`;
        new URL(u.replace("{q}", "test"));
        return true;
      } catch {
        return false;
      }
    },
    { message: "URL de búsqueda inválida." }
  );

export const createCompetenciaSchema = z.object({
  nombre: z.string().min(1, "El nombre es obligatorio.").max(120, "Nombre demasiado largo."),
  web: competenciaWebSchema,
  urlBusqueda: competenciaUrlBusquedaSchema,
});

export const updateCompetenciaSchema = createCompetenciaSchema.extend({
  id: prismaCuidSchema,
});

export const deleteCompetenciaSchema = z.object({
  id: prismaCuidSchema,
});

export const competenciaPreciosFiltrosSchema = paramsPaginaSchema.extend({
  q: z.string().max(200).optional().default(""),
  marca: z.string().max(120).optional().default(""),
  rubro: z.string().max(120).optional().default(""),
});

export type CompetenciaPreciosFiltros = z.infer<typeof competenciaPreciosFiltrosSchema>;

export const syncCompetenciaPreciosBodySchema = z
  .object({
    competenciaId: prismaCuidSchema,
    codTienda: listaPreciosCodTiendaSchema.optional(),
  })
  .strict();
