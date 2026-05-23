import { z } from "zod";
import {
  CX_PROD_SELECCION_PROM,
  VINC_COSTO_MAS,
  VINC_COSTO_SIN,
  VINC_COSTO_UNO,
} from "@/lib/cxPxTienda";

/** Query vacío (`""`) → `undefined` para no romper el enum en Zod. */
const queryOpcional = z.preprocess(
  (v) => (v === "" || v === null || v === undefined ? undefined : v),
  z.string().optional()
);

export const getCxPxTiendaPageParamsSchema = z.object({
  q: queryOpcional.pipe(z.string().max(500).optional()),
  rubro: queryOpcional.pipe(z.string().max(200).optional()),
  subRubro: queryOpcional.pipe(z.string().max(200).optional()),
  marca: queryOpcional.pipe(z.string().max(200).optional()),
  /** `sin` | `uno` | `mas` — cantidad de proveedores vinculados (habilitados). */
  vincCosto: queryOpcional.pipe(
    z.union([z.literal(VINC_COSTO_SIN), z.literal(VINC_COSTO_UNO), z.literal(VINC_COSTO_MAS)]).optional()
  ),
  /** `prom` = Cx. Prom. (sin FK costo); si no, `id` de proveedor con al menos un vínculo. */
  costoProv: queryOpcional.pipe(
    z.union([z.literal(CX_PROD_SELECCION_PROM), z.string().min(1).max(128)]).optional()
  ),
  pagina: queryOpcional.pipe(z.string().max(20).optional()),
});
