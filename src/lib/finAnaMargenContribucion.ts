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
import { roundPorcentaje0a100 } from "@/lib/format";

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
  "MC_PONDERADO",
] as const;

export type FilaMargenContribucionDatoId = (typeof FIN_ANA_MC_FILAS_DATO)[number];

export type SeccionMargenContribucionId = "INGRESO" | "COSTOS" | "MARGEN";

export type SeccionMargenContribucion = {
  id: SeccionMargenContribucionId;
  etiqueta: string;
  filas: readonly FilaMargenContribucionDatoId[];
};

/**
 * Tres bloques visuales (columna izquierda con etiqueta vertical).
 * Separadores primary entre secciones en la UI.
 */
export const FIN_ANA_MC_SECCIONES: readonly SeccionMargenContribucion[] = [
  {
    id: "INGRESO",
    etiqueta: "INGRESO",
    /** PX LISTA / PX VENTA se calculan en memoria (base $100) pero no se muestran. */
    filas: ["DESCUENTO"],
  },
  {
    id: "COSTOS",
    etiqueta: "COSTOS",
    filas: ["IVA", "IIBB", "CX_MERCADERIA", "CX_FINANCIERO"],
  },
  {
    id: "MARGEN",
    etiqueta: "MARGEN",
    filas: ["MC", "MC_PONDERADO"],
  },
];

/** @deprecated Preferir `FIN_ANA_MC_SECCIONES`. Layout plano legacy. */
export type FilaMargenContribucionLayout =
  | { tipo: "dato"; id: FilaMargenContribucionDatoId }
  | { tipo: "subtotal"; id: "SUBTOTAL_COSTOS" }
  | { tipo: "espacio"; id: "SEPARACION" };

/** @deprecated Preferir `FIN_ANA_MC_SECCIONES`. */
export const FIN_ANA_MC_LAYOUT: FilaMargenContribucionLayout[] = [
  { tipo: "dato", id: "PX_LISTA" },
  { tipo: "dato", id: "DESCUENTO" },
  { tipo: "dato", id: "PX_VENTA" },
  { tipo: "espacio", id: "SEPARACION" },
  { tipo: "dato", id: "IVA" },
  { tipo: "dato", id: "IIBB" },
  { tipo: "dato", id: "CX_MERCADERIA" },
  { tipo: "dato", id: "CX_FINANCIERO" },
  { tipo: "dato", id: "MC" },
  { tipo: "dato", id: "MC_PONDERADO" },
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
  MC_PONDERADO: "M.C PONDERADO",
};

export function etiquetaFilaMargenContribucion(id: FilaMargenContribucionDatoId): string {
  return ETIQUETAS_FILA[id];
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
  return id === "CX_FINANCIERO" || id === "MC" || id === "MC_PONDERADO";
}

/** PX LISTA de referencia del simulador (base 100 → celdas = % sobre lista). */
export const FIN_ANA_MC_PX_LISTA_ESTIMADO_PORC_UTILIDAD = 100;

/** Rango del descuento % por forma de pago (entero, puede ser negativo). */
export const FIN_ANA_MC_DESCUENTO_MIN = -100;
export const FIN_ANA_MC_DESCUENTO_MAX = 100;

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

/** Precio neto sin IVA desde precio con IVA incluido. */
export function netoSinIvaMargenContribucion(precioConIva: number): number {
  return precioConIva / FIN_ANA_COS_FINA_IVA_FACTOR;
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

/**
 * Ratio IVA sobre PX VENTA: `(PX VTA sin IVA × 0,21) / PX VTA`.
 * Equivale a `0,21 / 1,21` cuando hay impuestos.
 */
export function ivaRatioMargenContribucion(pxVenta: number): number {
  if (!(pxVenta > 0)) return 0;
  return (netoSinIvaMargenContribucion(pxVenta) * 0.21) / pxVenta;
}

/**
 * Ratio IIBB sobre PX VENTA: `(PX VTA sin IVA × 0,04) / PX VTA`.
 * Equivale a `0,04 / 1,21` cuando hay impuestos.
 */
export function iibbRatioMargenContribucion(pxVenta: number): number {
  if (!(pxVenta > 0)) return 0;
  return (netoSinIvaMargenContribucion(pxVenta) * 0.04) / pxVenta;
}

/**
 * CX MERCADERÍA (pesos): `(PX LISTA / 1,21) / (1 + porc. utilidad % / 100)`.
 */
export function cxMercaderiaPesosDesdePorcUtilidadMargenContribucion(
  pxLista: number,
  porcUtilidadPct: number
): number | null {
  if (!(pxLista > 0) || !(porcUtilidadPct > 0)) return null;
  const netoLista = netoSinIvaMargenContribucion(pxLista);
  const factorUtilidad = 1 + porcUtilidadPct / 100;
  if (!(factorUtilidad > 0)) return null;
  return netoLista / factorUtilidad;
}

/**
 * Ratio CX MERCADERÍA sobre PX VENTA:
 * `((PX LISTA sin IVA) / (1 + porc. utilidad % / 100)) / PX VTA`.
 */
export function cxMercaderiaRatioMargenContribucion(
  pxLista: number,
  porcUtilidadPct: number,
  pxVenta: number
): number | null {
  if (!(pxVenta > 0)) return null;
  const cxPesos = cxMercaderiaPesosDesdePorcUtilidadMargenContribucion(
    pxLista,
    porcUtilidadPct
  );
  if (cxPesos == null) return null;
  return cxPesos / pxVenta;
}

/** @deprecated Usar `cxMercaderiaPesosDesdePorcUtilidadMargenContribucion`. */
export function cxMercaderiaDesdePorcUtilidadMargenContribucion(
  pxLista: number,
  porcUtilidadPct: number
): number | null {
  const pesos = cxMercaderiaPesosDesdePorcUtilidadMargenContribucion(
    pxLista,
    porcUtilidadPct
  );
  return pesos == null ? null : Math.round(pesos);
}

/**
 * @deprecated Usar `cxMercaderiaRatioMargenContribucion`.
 */
export function cxMercaderiaMargenContribucion(
  precioVenta: number,
  porcUtilidadPct: number
): number | null {
  return cxMercaderiaDesdePorcUtilidadMargenContribucion(
    precioVenta,
    porcUtilidadPct
  );
}

export type InputsMargenContribucion = {
  pxLista: number;
  descuentoPct: number;
  porcUtilidadPct: number;
  tipoComprobante?: TipoComprobanteVentaMargenContribucion;
};

/** Valores calculados: `iva` / `iibb` / `cxMercaderia` son **ratios** sobre PX VENTA (0–1). */
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
    iva: aplicaIva ? ivaRatioMargenContribucion(precioVenta) : 0,
    iibb: aplicaIibb ? iibbRatioMargenContribucion(precioVenta) : 0,
    cxMercaderia: cxMercaderiaRatioMargenContribucion(
      inputs.pxLista,
      inputs.porcUtilidadPct,
      precioVenta
    ),
  };
}

/** CX FINANCIERO (ratio): % de Costos Financieros / 100. */
export function cxFinancieroRatioMargenContribucion(cxFinPct: number): number {
  if (!(cxFinPct > 0)) return 0;
  return cxFinPct / 100;
}

/** @deprecated Usar `cxFinancieroRatioMargenContribucion` (ya no se expresa en pesos). */
export function cxFinancieroPesosMargenContribucion(
  pxVenta: number,
  cxFinPct: number
): number {
  if (!(pxVenta > 0) || !(cxFinPct > 0)) return 0;
  return Math.round(pxVenta * (cxFinPct / 100));
}

/**
 * Formato de ratios (0–1 → `N%`). Acepta también montos base-100 (M.C PONDERADO).
 * `escala`: `"ratio"` (default) multiplica ×100; `"base100"` redondea el valor tal cual.
 */
export function fmtCeldaMontoMargenContribucion(
  valor: number | null | undefined,
  escala: "ratio" | "base100" = "ratio"
): string {
  if (valor == null || Number.isNaN(valor)) return "—";
  const pct = escala === "ratio" ? valor * 100 : valor;
  return `${Math.round(pct).toLocaleString("es-AR")}%`;
}

/** Suma de costos (ratios): IVA + IIBB + CX MERCADERÍA + CX FINANCIERO. */
export function sumaCostosRatioMargenContribucionPorFormaPago(
  calculados: ValoresCalculadosMargenContribucion,
  cxFinPct: number
): number | null {
  if (!(calculados.precioVenta > 0)) return null;
  if (calculados.cxMercaderia == null) return null;
  const cxFin = cxFinancieroRatioMargenContribucion(cxFinPct);
  return calculados.iva + calculados.iibb + calculados.cxMercaderia + cxFin;
}

/** @deprecated Usar `sumaCostosRatioMargenContribucionPorFormaPago`. */
export function subtotalCostosMargenContribucionPorFormaPago(
  calculados: ValoresCalculadosMargenContribucion,
  cxFinPct: number
): number | null {
  return sumaCostosRatioMargenContribucionPorFormaPago(calculados, cxFinPct);
}

/** M.C (ratio) = 1 − suma de costos. */
export function mcMargenContribucionPorFormaPago(
  calculados: ValoresCalculadosMargenContribucion,
  cxFinPct: number
): number | null {
  const suma = sumaCostosRatioMargenContribucionPorFormaPago(
    calculados,
    cxFinPct
  );
  if (suma == null) return null;
  return 1 - suma;
}

/** M.C PONDERADO = M.C × PX VENTA (escala base-100 del simulador). */
export function mcPonderadoMargenContribucionPorFormaPago(
  calculados: ValoresCalculadosMargenContribucion,
  cxFinPct: number
): number | null {
  const mc = mcMargenContribucionPorFormaPago(calculados, cxFinPct);
  if (mc == null || !(calculados.precioVenta > 0)) return null;
  return mc * calculados.precioVenta;
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
