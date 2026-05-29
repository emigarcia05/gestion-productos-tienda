import { z } from "zod";
import {
  CX_PROD_SELECCION_PROM,
  MARCACION_ORDEN_MAYOR_MENOR,
  MARCACION_ORDEN_MENOR_MAYOR,
  PX_LISTA_SELECCION_PROM,
  VINC_COSTO_MAS,
  VINC_COSTO_SIN,
  VINC_COSTO_UNO,
} from "@/lib/cxPxTienda";
import { listaPreciosCodTiendaSchema, prismaCuidSchema } from "@/lib/validations/common";

/** Query vacío (`""`) → `undefined` para no romper el enum en Zod. */
const queryOpcional = z.preprocess(
  (v) => (v === "" || v === null || v === undefined ? undefined : v),
  z.string().optional()
);

export const getCxPxTiendaPageParamsSchema = z.object({
  q: queryOpcional.pipe(z.string().max(500).optional()),
  marca: queryOpcional.pipe(z.string().max(200).optional()),
  /** `sin` | `uno` | `mas` — cantidad de proveedores vinculados (habilitados). */
  vincCosto: queryOpcional.pipe(
    z.union([z.literal(VINC_COSTO_SIN), z.literal(VINC_COSTO_UNO), z.literal(VINC_COSTO_MAS)]).optional()
  ),
  /** `prom` = Cx. Prom. (`cx_px_cx_cod_ext` nulo); si no, `id` de proveedor de la fila FK persistida. */
  costoProv: queryOpcional.pipe(
    z.union([z.literal(CX_PROD_SELECCION_PROM), z.string().min(1).max(128)]).optional()
  ),
  /** `prom` = Px. Prom. (`cx_px_px_comp_ref` nulo); si no, `id` del competidor persistido. */
  pxLista: queryOpcional.pipe(
    z.union([z.literal(PX_LISTA_SELECCION_PROM), prismaCuidSchema]).optional()
  ),
  /** Orden por columna MARCACION calculada en servidor. */
  marcacionOrden: queryOpcional.pipe(
    z
      .union([z.literal(MARCACION_ORDEN_MENOR_MAYOR), z.literal(MARCACION_ORDEN_MAYOR_MENOR)])
      .optional()
  ),
  pagina: queryOpcional.pipe(z.string().max(20).optional()),
});

/** Valor manual de PX LISTA en grilla (pesos enteros, blur → persistencia). */
export const guardarPxListaCxPxValorSchema = z.object({
  codTienda: listaPreciosCodTiendaSchema,
  seleccion: z.union([z.literal(PX_LISTA_SELECCION_PROM), prismaCuidSchema]),
  pxLista: z.number().int().min(1).max(999_999_999),
});
