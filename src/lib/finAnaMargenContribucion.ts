import type { FinAnaCosFinaPago } from "@prisma/client";
import {
  cxTotalConIvaFinAnaCosFina,
  etiquetaPagoFinAnaCosFina,
  FIN_ANA_COS_FINA_IVA_FACTOR,
  FIN_ANA_COS_FINA_PAGOS,
} from "@/lib/finAnaCosFina";
import { roundPorcentaje0a100 } from "@/lib/format";

/** Forma de pago adicional (sin costo financiero en Costos Financieros). */
export const FIN_ANA_MC_FORMA_PAGO_EFECTIVO = "EFECTIVO" as const;

export type FormaPagoMargenContribucion =
  | FinAnaCosFinaPago
  | typeof FIN_ANA_MC_FORMA_PAGO_EFECTIVO;

/** Columnas de la grilla: modalidades de Costos Financieros + Efectivo. */
export const FIN_ANA_MC_FORMAS_PAGO: FormaPagoMargenContribucion[] = [
  ...FIN_ANA_COS_FINA_PAGOS,
  FIN_ANA_MC_FORMA_PAGO_EFECTIVO,
];

const ETIQUETA_EFECTIVO = "Efectivo";

export function etiquetaFormaPagoMargenContribucion(
  forma: FormaPagoMargenContribucion
): string {
  if (forma === FIN_ANA_MC_FORMA_PAGO_EFECTIVO) return ETIQUETA_EFECTIVO;
  return etiquetaPagoFinAnaCosFina(forma);
}

/** Filas de la grilla (conceptos / CX). */
export const FIN_ANA_MC_FILAS = [
  "PX_LISTA",
  "DESCUENTO",
  "PORC_UTILIDAD",
  "PRECIO_VENTA",
  "IVA",
  "IIBB",
  "CX_MERCADERIA",
  "CX_FINANCIERO",
] as const;

export type FilaMargenContribucionId = (typeof FIN_ANA_MC_FILAS)[number];

const ETIQUETAS_FILA: Record<FilaMargenContribucionId, string> = {
  PX_LISTA: "PX LISTA",
  DESCUENTO: "DESCUENTO",
  PORC_UTILIDAD: "PORC. UTILIDAD",
  PRECIO_VENTA: "PRECIO VENTA",
  IVA: "IVA",
  IIBB: "IIBB",
  CX_MERCADERIA: "CX MERCADERÍA",
  CX_FINANCIERO: "CX FINANCIERO",
};

export function etiquetaFilaMargenContribucion(id: FilaMargenContribucionId): string {
  return ETIQUETAS_FILA[id];
}

export function esFilaEditableMargenContribucion(id: FilaMargenContribucionId): boolean {
  return id === "PX_LISTA" || id === "DESCUENTO" || id === "PORC_UTILIDAD";
}

export function esFilaPorFormaPagoMargenContribucion(id: FilaMargenContribucionId): boolean {
  return id === "CX_FINANCIERO";
}

/** Precio neto sin IVA desde precio de venta con IVA incluido. */
export function netoSinIvaMargenContribucion(precioVenta: number): number {
  return precioVenta / FIN_ANA_COS_FINA_IVA_FACTOR;
}

/** PRECIO VENTA = PX LISTA × (1 − descuento % / 100). */
export function precioVentaMargenContribucion(
  pxLista: number,
  descuentoPct: number
): number {
  if (!(pxLista > 0)) return 0;
  const factor = 1 - descuentoPct / 100;
  return Math.round(pxLista * Math.max(0, factor));
}

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
  const precioVenta = precioVentaMargenContribucion(
    inputs.pxLista,
    inputs.descuentoPct
  );
  return {
    precioVenta,
    iva: ivaMargenContribucion(precioVenta),
    iibb: iibbMargenContribucion(precioVenta),
    cxMercaderia: cxMercaderiaMargenContribucion(
      precioVenta,
      inputs.porcUtilidadPct
    ),
  };
}

export type CxFinancieroPorFormaPago = Record<FormaPagoMargenContribucion, number>;

/** Subconjunto de `FinAnaCosFinaItem` para cálculo en cliente (sin Prisma). */
export type FilaCostosFinancierosMargenContribucion = {
  habilitado: boolean;
  impCheque: boolean;
  terminalId: string;
  pago: FinAnaCosFinaPago;
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
  terminalId?: string
): CxFinancieroPorFormaPago {
  const habilitadas = filas.filter(
    (fila) =>
      fila.habilitado && (terminalId == null || fila.terminalId === terminalId)
  );

  const map = {} as CxFinancieroPorFormaPago;

  for (const pago of FIN_ANA_COS_FINA_PAGOS) {
    const delPago = habilitadas.filter((fila) => fila.pago === pago);
    map[pago] = promedioCxTotalConIvaMargenContribucion(delPago);
  }

  map[FIN_ANA_MC_FORMA_PAGO_EFECTIVO] = 0;

  return map;
}
