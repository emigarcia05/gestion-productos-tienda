import type { CampoReglaDescuentoListaPrecioInput } from "@/lib/validations/descuentosListaPrecioReglas";

/** Columnas dto_* / cx_transporte materializadas por reglas dimensionales. */
export interface DescuentosMaterializadosItem {
  dtoProveedor: number;
  dtoMarca: number;
  dtoRubro: number;
  dtoCantidad: number;
  dtoFinanciero: number;
  cxTransporte: number;
}

/** Campo virtual de descuento activo (no está en enum Prisma de reglas dimensionales). */
export const CAMPO_DESC_ESPECIAL = "desc_especial" as const;

export type CampoDescuentoActivoListaPrecio =
  | CampoReglaDescuentoListaPrecioInput
  | typeof CAMPO_DESC_ESPECIAL;
