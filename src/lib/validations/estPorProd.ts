import { z } from "zod";
import { globalSucursalIdSchema, listaPreciosCodTiendaSchema, prismaCuidSchema } from "@/lib/validations/common";
import { mesAnioQuerySchema } from "@/lib/validations/finBalGastoMensualBalance";

const VTAS_EN_UN_MAX = 999_999_999.9999;
const MAX_LINEAS_IMPORT = 20_000;

const estPorProdLineaImportSchema = z.object({
  codTienda: listaPreciosCodTiendaSchema,
  vtasEnUn: z.coerce
    .number()
    .min(0, "Las ventas en unidades no pueden ser negativas.")
    .max(VTAS_EN_UN_MAX, "El valor de ventas en unidades es demasiado grande."),
});

export const importarEstPorProdSchema = mesAnioQuerySchema.extend({
  sucursalId: globalSucursalIdSchema,
  lineas: z
    .array(estPorProdLineaImportSchema)
    .min(1, "La planilla no contiene filas válidas.")
    .max(MAX_LINEAS_IMPORT, `Máximo ${MAX_LINEAS_IMPORT.toLocaleString("es-AR")} filas por importación.`),
});
export type ImportarEstPorProdInput = z.infer<typeof importarEstPorProdSchema>;

export const eliminarEstPorProdSchema = z.object({
  id: prismaCuidSchema,
});
export type EliminarEstPorProdInput = z.infer<typeof eliminarEstPorProdSchema>;
