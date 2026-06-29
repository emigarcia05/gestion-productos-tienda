import { z } from "zod";
import { listaPreciosCodTiendaSchema } from "@/lib/validations/common";

/** Parámetros de URL del listado Px Listas (`/gestion-productos/tienda/px-listas`). */
export const getPxListasPreciosPageParamsSchema = z.object({
  q: z.string().max(500).optional(),
  rubro: z.string().max(200).optional(),
  marca: z.string().max(200).optional(),
  subRubro: z.string().max(200).optional(),
  actualizar: z.string().max(8).optional(),
  pagina: z.string().max(20).optional(),
});

const margenListaTiendaSchema = z
  .number()
  .finite()
  .min(0, "El margen no puede ser negativo.")
  .max(9999.9999, "Margen demasiado alto.");

/** Guardar o quitar margen manual en Px Listas. `margenManual: null` elimina la edición. */
export const guardarPxListaMargenEdicionSchema = z.object({
  codTienda: listaPreciosCodTiendaSchema,
  idLista: z.coerce.number().int().positive("Lista inválida."),
  margenManual: z.union([margenListaTiendaSchema, z.null()]),
});
