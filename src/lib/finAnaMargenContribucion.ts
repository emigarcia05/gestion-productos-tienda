import {
  buscarPagoPorId,
  etiquetaPagoDesdeItem,
  filtrarPagosMargenContribucion,
  type FinAnaCosFinaPagoItem,
  type FormaPagoMargenContribucion,
} from "@/lib/finAnaCosFinaPagos";
import {
  cxTotalConIvaFinAnaCosFina,
  FIN_ANA_COS_FINA_IVA_FACTOR,
} from "@/lib/finAnaCosFina";
import { fmtPrecio, roundPorcentaje0a100 } from "@/lib/format";

export type { FormaPagoMargenContribucion } from "@/lib/finAnaCosFinaPagos";

export function idsFormasPagoMargenContribucion(
  pagos: FinAnaCosFinaPagoItem[]
): FormaPagoMargenContribucion[] {
  return filtrarPagosMargenContribucion(pagos).map((p) => p.id);
}

export function etiquetaFormaPagoMargenContribucion(
  formaPagoId: FormaPagoMargenContribucion,
  pagos: FinAnaCosFinaPagoItem[]
): string {
  const item = buscarPagoPorId(pagos, formaPagoId);
  return item ? etiquetaPagoDesdeItem(item) : formaPagoId;
}

/** Filas de datos de la grilla. */
export const FIN_ANA_MC_FILAS_DATO = [
  "PX_LISTA",
  "DESCUENTO",
  "PX_VENTA",
  "IVA",
  "IIBB",
  "CX_MERCADERIA",
  "CX_FINANCIERO",
  "MC",
] as const;

export type FilaMargenContribucionDatoId = (typeof FIN_ANA_MC_FILAS_DATO)[number];

/** Tipos de fila en el layout (secciones, subtotales, espacio). */
export type FilaMargenContribucionLayout =
  | { tipo: "dato"; id: FilaMargenContribucionDatoId }
  | { tipo: "subtotal"; id: "SUBTOTAL_COSTOS" }
  | { tipo: "espacio"; id: "SEPARACION" };

/** Orden visual de filas con secciones. */
export const FIN_ANA_MC_LAYOUT: FilaMargenContribucionLayout[] = [
  { tipo: "dato", id: "PX_LISTA" },
  { tipo: "dato", id: "DESCUENTO" },
  { tipo: "dato", id: "PX_VENTA" },
  { tipo: "espacio", id: "SEPARACION" },
  { tipo: "dato", id: "IVA" },
  { tipo: "dato", id: "IIBB" },
  { tipo: "dato", id: "CX_MERCADERIA" },
  { tipo: "dato", id: "CX_FINANCIERO" },
  { tipo: "subtotal", id: "SUBTOTAL_COSTOS" },
  { tipo: "dato", id: "MC" },
];

const ETIQUETAS_FILA: Record<FilaMargenContribucionDatoId, string> = {
  PX_LISTA: "PX LISTA",
  DESCUENTO: "DESCUENTO",
  PX_VENTA: "PX VENTA",
  IVA: "IVA",
  IIBB: "IIBB",
  CX_MERCADERIA: "CX MERCADERÍA",
  CX_FINANCIERO: "CX FINANCIERO",
  MC: "M.C",
};

export function etiquetaFilaMargenContribucion(id: FilaMargenContribucionDatoId): string {
  return ETIQUETAS_FILA[id];
}

export function esFilaEditableMargenContribucion(id: FilaMargenContribucionDatoId): boolean {
  return id === "PX_LISTA";
}

/** Descuento editable por columna (forma de pago). */
export function esFilaDescuentoPorFormaPagoMargenContribucion(
  id: FilaMargenContribucionDatoId
): boolean {
  return id === "DESCUENTO";
}

export function crearDescuentoPctPorFormaPagoVacios(
  formasPago: readonly FormaPagoMargenContribucion[] = []
): Record<FormaPagoMargenContribucion, number> {
  const map = {} as Record<FormaPagoMargenContribucion, number>;
  for (const forma of formasPago) {
    map[forma] = 0;
  }
  return map;
}

export function esFilaPorFormaPagoMargenContribucion(id: FilaMargenContribucionDatoId): boolean {
  return id === "CX_FINANCIERO" || id === "MC";
}

/** Modo de evaluación del simulador (mutuamente excluyente). */
export type ModoEvaluacionMargenContribucion = "producto" | "porc_utilidad";

export const FIN_ANA_MC_MODOS_EVALUACION: ModoEvaluacionMargenContribucion[] = [
  "producto",
  "porc_utilidad",
];

/** PX LISTA de referencia en modo **PORC. UTILIDAD** (simulador). */
export const FIN_ANA_MC_PX_LISTA_ESTIMADO_PORC_UTILIDAD = 100;

/** Rango del descuento % por forma de pago (entero, puede ser negativo). */
export const FIN_ANA_MC_DESCUENTO_MIN = -100;
export const FIN_ANA_MC_DESCUENTO_MAX = 100;

const ETIQUETAS_MODO_EVALUACION: Record<ModoEvaluacionMargenContribucion, string> = {
  producto: "PRODUCTO",
  porc_utilidad: "PORC. UTILIDAD",
};

export function etiquetaModoEvaluacionMargenContribucion(
  modo: ModoEvaluacionMargenContribucion
): string {
  return ETIQUETAS_MODO_EVALUACION[modo];
}

/** Tipo de comprobante de venta (afecta IVA e IIBB en el simulador). */
export type TipoComprobanteVentaMargenContribucion =
  | "FACTURA_A"
  | "FACTURA_C"
  | "FACTURA_X";

export const FIN_ANA_MC_TIPOS_COMPROBANTE: TipoComprobanteVentaMargenContribucion[] = [
  "FACTURA_A",
  "FACTURA_C",
  "FACTURA_X",
];

const ETIQUETAS_TIPO_COMPROBANTE: Record<
  TipoComprobanteVentaMargenContribucion,
  string
> = {
  FACTURA_A: "FACTURA A",
  FACTURA_C: "FACTURA C",
  FACTURA_X: "FACTURA X",
};

export function etiquetaTipoComprobanteVentaMargenContribucion(
  tipo: TipoComprobanteVentaMargenContribucion
): string {
  return ETIQUETAS_TIPO_COMPROBANTE[tipo];
}

export function aplicaImpuestosComprobanteMargenContribucion(
  tipo: TipoComprobanteVentaMargenContribucion
): { aplicaIva: boolean; aplicaIibb: boolean } {
  switch (tipo) {
    case "FACTURA_C":
      return { aplicaIva: false, aplicaIibb: false };
    case "FACTURA_A":
    case "FACTURA_X":
    default:
      return { aplicaIva: true, aplicaIibb: true };
  }
}

/** @deprecated Usar `FilaMargenContribucionDatoId`. */
export type FilaMargenContribucionId = FilaMargenContribucionDatoId;

/** @deprecated Usar `FIN_ANA_MC_LAYOUT`. */
export const FIN_ANA_MC_FILAS = FIN_ANA_MC_FILAS_DATO;

/** Precio neto sin IVA desde precio de venta con IVA incluido. */
export function netoSinIvaMargenContribucion(precioVenta: number): number {
  return precioVenta / FIN_ANA_COS_FINA_IVA_FACTOR;
}

/** PX VENTA = PX LISTA × (1 + descuento % / 100). Negativo = descuento; positivo = recargo. */
export function pxVentaMargenContribucion(
  pxLista: number,
  descuentoPct: number
): number {
  if (!(pxLista > 0)) return 0;
  const factor = 1 + descuentoPct / 100;
  return Math.round(pxLista * Math.max(0, factor));
}

/** @deprecated Usar `pxVentaMargenContribucion`. */
export const precioVentaMargenContribucion = pxVentaMargenContribucion;

/** IVA = (PRECIO VENTA / 1,21) × 0,21. */
export function ivaMargenContribucion(precioVenta: number): number {
  if (!(precioVenta > 0)) return 0;
  return Math.round(netoSinIvaMargenContribucion(precioVenta) * 0.21);
}

/** IIBB = (PRECIO VENTA / 1,21) × 0,04. */
export function iibbMargenContribucion(precioVenta: number): number {
  if (!(precioVenta > 0)) return 0;
  return Math.round(netoSinIvaMargenContribucion(precioVenta) * 0.04);
}

/**
 * CX MERCADERÍA = (PRECIO VENTA / 1,21) / factor utilidad,
 * con factor = 1 + (porc. utilidad % / 100) — alineado a margen sobre costo (Px Listas).
 */
export function cxMercaderiaMargenContribucion(
  precioVenta: number,
  porcUtilidadPct: number
): number | null {
  if (!(precioVenta > 0) || !(porcUtilidadPct > 0)) return null;
  const neto = netoSinIvaMargenContribucion(precioVenta);
  const factorUtilidad = 1 + porcUtilidadPct / 100;
  if (!(factorUtilidad > 0)) return null;
  return Math.round(neto / factorUtilidad);
}

export type InputsMargenContribucion = {
  pxLista: number;
  descuentoPct: number;
  porcUtilidadPct: number;
  tipoComprobante?: TipoComprobanteVentaMargenContribucion;
};

export type ValoresCalculadosMargenContribucion = {
  precioVenta: number;
  iva: number;
  iibb: number;
  cxMercaderia: number | null;
};

export function calcularValoresMargenContribucion(
  inputs: InputsMargenContribucion
): ValoresCalculadosMargenContribucion {
  const precioVenta = pxVentaMargenContribucion(
    inputs.pxLista,
    inputs.descuentoPct
  );
  const tipoComprobante = inputs.tipoComprobante ?? "FACTURA_A";
  const { aplicaIva, aplicaIibb } =
    aplicaImpuestosComprobanteMargenContribucion(tipoComprobante);
  return {
    precioVenta,
    iva: aplicaIva ? ivaMargenContribucion(precioVenta) : 0,
    iibb: aplicaIibb ? iibbMargenContribucion(precioVenta) : 0,
    cxMercaderia: cxMercaderiaMargenContribucion(
      precioVenta,
      inputs.porcUtilidadPct
    ),
  };
}

/** CX FINANCIERO en pesos desde % sobre PX VENTA. */
export function cxFinancieroPesosMargenContribucion(
  pxVenta: number,
  cxFinPct: number
): number {
  if (!(pxVenta > 0) || !(cxFinPct > 0)) return 0;
  return Math.round(pxVenta * (cxFinPct / 100));
}

/**
 * Formato de montos (ingresos/costos) en la grilla según modo de evaluación.
 * - `porc_utilidad` (PX LISTA = 100): el monto en $ equivale al % → `10%`
 * - `producto`: pesos + % sobre PX LISTA → `$1.426 (54%)`
 * DESCUENTO sigue siendo % firmado (no usa esta función).
 */
export function fmtCeldaMontoMargenContribucion(
  valorPesos: number | null | undefined,
  modo: ModoEvaluacionMargenContribucion,
  pxLista: number
): string {
  if (valorPesos == null || Number.isNaN(valorPesos) || valorPesos <= 0) {
    return "—";
  }
  const n = Math.round(valorPesos);
  if (modo === "porc_utilidad") {
    return `${n.toLocaleString("es-AR")}%`;
  }
  const money = `$${fmtPrecio(n)}`;
  if (!(pxLista > 0)) return money;
  const pct = Math.round((valorPesos / pxLista) * 100);
  return `${money} (${pct.toLocaleString("es-AR")}%)`;
}

/** Subtotal de costos (IVA + IIBB + CX MERCADERÍA + CX FINANCIERO en $) por forma de pago. */
export function subtotalCostosMargenContribucionPorFormaPago(
  calculados: ValoresCalculadosMargenContribucion,
  cxFinPct: number
): number | null {
  if (!(calculados.precioVenta > 0)) return null;
  const cxFin = cxFinancieroPesosMargenContribucion(
    calculados.precioVenta,
    cxFinPct
  );
  const cxMerc = calculados.cxMercaderia ?? 0;
  return calculados.iva + calculados.iibb + cxMerc + cxFin;
}

/** M.C = PX VENTA − subtotal de costos (por forma de pago). */
export function mcMargenContribucionPorFormaPago(
  calculados: ValoresCalculadosMargenContribucion,
  cxFinPct: number
): number | null {
  const subtotal = subtotalCostosMargenContribucionPorFormaPago(
    calculados,
    cxFinPct
  );
  if (subtotal == null || !(calculados.precioVenta > 0)) return null;
  return calculados.precioVenta - subtotal;
}

export type CxFinancieroPorFormaPago = Record<FormaPagoMargenContribucion, number>;

/** Subconjunto de `FinAnaCosFinaItem` para cálculo en cliente (sin Prisma). */
export type FilaCostosFinancierosMargenContribucion = {
  habilitado: boolean;
  impCheque: boolean;
  terminalId: string;
  pagoId: string;
  arancel: number;
  costoFinanciero: number;
};

function promedioCxTotalConIvaMargenContribucion(
  filas: FilaCostosFinancierosMargenContribucion[]
): number {
  if (filas.length === 0) return 0;
  const suma = filas.reduce(
    (acc, fila) =>
      acc +
      cxTotalConIvaFinAnaCosFina(
        fila.impCheque,
        fila.arancel,
        fila.costoFinanciero
      ),
    0
  );
  return roundPorcentaje0a100(suma / filas.length);
}

/**
 * CX FINANCIERO por forma de pago: **CX TOTAL C/ IVA** de Costos Financieros.
 * Si `terminalId` está definido, solo filas de esa terminal habilitadas; si no, promedio entre terminales habilitadas.
 */
export function mapCxFinancieroPorFormaPago(
  filas: FilaCostosFinancierosMargenContribucion[],
  pagosCatalogo: FinAnaCosFinaPagoItem[],
  terminalId?: string
): CxFinancieroPorFormaPago {
  const habilitadas = filas.filter(
    (fila) =>
      fila.habilitado && (terminalId == null || fila.terminalId === terminalId)
  );

  const map = {} as CxFinancieroPorFormaPago;

  for (const pago of filtrarPagosMargenContribucion(pagosCatalogo)) {
    if (pago.enCostosFinancieros) {
      const delPago = habilitadas.filter((fila) => fila.pagoId === pago.id);
      map[pago.id] = promedioCxTotalConIvaMargenContribucion(delPago);
    } else {
      map[pago.id] = 0;
    }
  }

  return map;
}
