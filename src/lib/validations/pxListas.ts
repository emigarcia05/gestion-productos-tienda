import { z } from "zod";

/** Parámetros de URL del listado Px Listas (`/gestion-productos/tienda/cx-px-tienda`). */
export const getPxListasPageParamsSchema = z.object({
  q: z.string().max(500).optional(),
  rubro: z.string().max(200).optional(),
  marca: z.string().max(200).optional(),
  /** CUID de `prod_competencia` con al menos un vínculo en `prod_precios_competencia`. */
  detPrecio: z.string().max(128).optional(),
  ordenMarcacion: z.string().max(32).optional(),
  pagina: z.string().max(20).optional(),
});
