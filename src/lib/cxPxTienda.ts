import { calcMargenSinIvaPct } from "@/lib/calculos";

export const CX_PROD_SELECCION_PROM = "prom" as const;
export const PX_LISTA_SELECCION_PROM = "prom" as const;

export const MARCACION_ORDEN_MENOR_MAYOR = "menor_mayor" as const;
export const MARCACION_ORDEN_MAYOR_MENOR = "mayor_menor" as const;

export type MarcacionOrdenCxPx =
  | typeof MARCACION_ORDEN_MENOR_MAYOR
  | typeof MARCACION_ORDEN_MAYOR_MENOR;

export type CompetenciaCxPxFiltro = {
  id: string;
  etiqueta: string;
};

/** IVA % para netear px lista en marcación Cx & Px Tienda. */
export const CX_PX_MARCACION_IVA_PCT = 21;

/** Tolerancia relativa (%) al comparar `px_lista_tienda` (DUX) vs PX LISTA (export / diff). */
export const CX_PX_DIFF_PRECIO_MARGEN_PCT = 0.02;

/**
 * Hay diferencia si |a − b| supera el umbral porcentual sobre el mayor de los dos (enteros).
 * Umbral = max(a, b) × (margenPct / 100).
 */
export function preciosListaDifierenMasQueMargen(
  pxListaTienda: number,
  pxReferencia: number,
  margenPct: number = CX_PX_DIFF_PRECIO_MARGEN_PCT
): boolean {
  const a = Math.round(pxListaTienda);
  const b = Math.round(pxReferencia);
  const diff = Math.abs(a - b);
  if (diff === 0) return false;
  const base = Math.max(a, b, 1);
  const umbral = base * (margenPct / 100);
  return diff > umbral;
}

/**
 * Marcación visual: ((pxLista / (1 + IVA%)) / cxProd) − 1) × 100, redondeada a 2 decimales.
 * Reutiliza `calcMargenSinIvaPct` (`src/lib/calculos.ts`).
 */
export function calcMarcacionCxPxTienda(
  pxLista: number,
  cxProd: number,
  porcIva: number = CX_PX_MARCACION_IVA_PCT
): number | null {
  const raw = calcMargenSinIvaPct(pxLista, cxProd, porcIva);
  if (raw == null) return null;
  return Math.round(raw * 100) / 100;
}

/** Query `vincCosto` en Cx & Px Tienda. */
export const VINC_COSTO_SIN = "sin" as const;
export const VINC_COSTO_UNO = "uno" as const;
export const VINC_COSTO_MAS = "mas" as const;

export type ProveedorCxPxFiltro = {
  id: string;
  nombre: string;
  prefijo: string;
};

export interface OpcionCostoCxProdProveedor {
  tipo: "proveedor";
  codExt: string;
  etiqueta: string;
  costo: number;
}

export interface OpcionPxListaCompetidor {
  competenciaId: string;
  etiqueta: string;
  px: number | null;
}

export interface ItemCxPxTiendaParaTabla {
  id: string;
  codTienda: string;
  descripcion: string;
  codExtCostoCompra: string | null;
  costoPromedio: number | null;
  opcionesProveedor: OpcionCostoCxProdProveedor[];
  /** `prom` = Cx. Prom.; si no, `cod_ext` del proveedor persistido o elegido. */
  seleccion: typeof CX_PROD_SELECCION_PROM | string;
  costoMostrado: number;
  pxListaTiendaDux: number;
  /** Valor persistido en `px_lista_cx_px` (null = aún no guardado en Cx & Px). */
  pxListaCxPxPersistido: number | null;
  competenciaIdPxLista: string | null;
  opcionesPxLista: OpcionPxListaCompetidor[];
  /** `prom` = Px. Prom. (promedio competidores con precio); si no, `competenciaId`. */
  seleccionPxLista: typeof PX_LISTA_SELECCION_PROM | string;
  pxListaMostrado: number;
}

/** Costo CX PROD. mostrado según selección persistida en la fila. */
export function costoCxProdMostrado(item: ItemCxPxTiendaParaTabla): number {
  if (item.seleccion === CX_PROD_SELECCION_PROM) {
    return item.costoPromedio ?? item.costoMostrado;
  }
  const op = item.opcionesProveedor.find((o) => o.codExt === item.seleccion);
  return op?.costo ?? item.costoMostrado;
}

/** Px lista mostrado: valor persistido en BD o cálculo en lectura según selección. */
export function pxListaMostrado(item: ItemCxPxTiendaParaTabla): number {
  if (item.pxListaCxPxPersistido != null && item.pxListaCxPxPersistido > 0) {
    return item.pxListaCxPxPersistido;
  }
  if (item.seleccionPxLista === PX_LISTA_SELECCION_PROM) {
    const valores = item.opcionesPxLista
      .map((o) => o.px)
      .filter((n): n is number => n != null && n > 0);
    if (valores.length > 0) {
      return Math.round(valores.reduce((a, b) => a + b, 0) / valores.length);
    }
    return item.pxListaTiendaDux;
  }
  const op = item.opcionesPxLista.find((o) => o.competenciaId === item.seleccionPxLista);
  return op?.px ?? item.pxListaMostrado;
}

export function marcacionCxPxDeItem(item: ItemCxPxTiendaParaTabla): number | null {
  return calcMarcacionCxPxTienda(pxListaMostrado(item), costoCxProdMostrado(item));
}
