import { z } from "zod";
import { listaPreciosCodTiendaSchema } from "@/lib/validations/common";

/** Parámetros de URL del listado Px Listas (`/gestion-productos/tienda/px-listas`). */
export const getPxListasPreciosPageParamsSchema = z.object({
  q: z.string().max(500).optional(),
  rubro: z.string().max(200).optional(),
  marca: z.string().max(200).optional(),
  subRubro: z.string().max(200).optional(),
  pagina: z.string().max(20).optional(),
});

const precioListaTiendaSchema = z
  .number()
  .finite()
  .positive("El precio debe ser mayor a cero.")
  .max(999_999_999.9999, "Precio demasiado alto.");

/** Guardar o quitar override de precio en Px Listas. `precio: null` elimina la edición. */
export const guardarPxListaPrecioEdicionSchema = z.object({
  codTienda: listaPreciosCodTiendaSchema,
  idLista: z.coerce.number().int().positive("Lista inválida."),
  precio: z.union([precioListaTiendaSchema, z.null()]),
});
