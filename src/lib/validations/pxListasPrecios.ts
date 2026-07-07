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

const pxListaEdicionSchema = z
  .number()
  .finite()
  .positive("El precio debe ser mayor a cero.")
  .max(999_999_999, "Precio demasiado alto.");

/** Guardar margen en UI → persiste PX en `prod_tienda_precios_edicion`. `margenManual: null` elimina staging. */
export const guardarPxListaMargenEdicionSchema = z.object({
  codTienda: listaPreciosCodTiendaSchema,
  idLista: z.coerce.number().int().positive("Lista inválida."),
  margenManual: z.union([margenListaTiendaSchema, z.null()]),
});

/** Guardar PX entero en UI → persiste staging y deriva margen %. `pxEdicion: null` elimina staging. */
export const guardarPxListaPrecioEdicionSchema = z.object({
  codTienda: listaPreciosCodTiendaSchema,
  idLista: z.coerce.number().int().positive("Lista inválida."),
  pxEdicion: z.union([pxListaEdicionSchema, z.null()]),
});
