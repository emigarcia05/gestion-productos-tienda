import { roundPorcentaje0a100 } from "@/lib/format";
import { porcentajeCentFromNumber, porcentajeCentNormalizedToDisplay } from "@/lib/porcentajeCentMask";

/** Factor 0,012 para **Imp. Cheque** cuando `imp_cheque` es true. */
export const FIN_ANA_COS_FINA_IMP_CHEQUE_FACTOR = 0.012;

/** Factor IVA 21 % (misma convención que compras/ventas en el proyecto). */
export const FIN_ANA_COS_FINA_IVA_FACTOR = 1.21;

/** CX TERMINAL = ARANCEL + CX FINANCIERO (escala %, 2 decimales). */
export function cxTerminalFinAnaCosFina(arancel: number, costoFinanciero: number): number {
  return roundPorcentaje0a100(arancel + costoFinanciero);
}

/** IVA = (CX TERMINAL × 1,21) − CX TERMINAL (escala %, 2 decimales). */
export function ivaFinAnaCosFina(arancel: number, costoFinanciero: number): number {
  const cxTerminal = cxTerminalFinAnaCosFina(arancel, costoFinanciero);
  return roundPorcentaje0a100(cxTerminal * FIN_ANA_COS_FINA_IVA_FACTOR - cxTerminal);
}

/**
 * Imp. Cheque (escala %): si `imp_cheque` es false → 0; si true →
 * `(1 − (CX TERMINAL + IVA) / 100) × 0,012 × 100`.
 */
export function impChequeFinAnaCosFina(
  impCheque: boolean,
  arancel: number,
  costoFinanciero: number
): number {
  if (!impCheque) return 0;
  const cxTerminal = cxTerminalFinAnaCosFina(arancel, costoFinanciero);
  const iva = ivaFinAnaCosFina(arancel, costoFinanciero);
  const tasa = (1 - (cxTerminal + iva) / 100) * FIN_ANA_COS_FINA_IMP_CHEQUE_FACTOR;
  return roundPorcentaje0a100(tasa * 100);
}

/** CX TOTAL S/ IVA = CX TERMINAL + Imp. Cheque (escala %, 2 decimales). */
export function cxTotalSinIvaFinAnaCosFina(
  impCheque: boolean,
  arancel: number,
  costoFinanciero: number
): number {
  const cxTerminal = cxTerminalFinAnaCosFina(arancel, costoFinanciero);
  const imp = impChequeFinAnaCosFina(impCheque, arancel, costoFinanciero);
  return roundPorcentaje0a100(cxTerminal + imp);
}

/** CX TOTAL C/ IVA = CX TERMINAL + IVA + Imp. Cheque (escala %, 2 decimales). */
export function cxTotalConIvaFinAnaCosFina(
  impCheque: boolean,
  arancel: number,
  costoFinanciero: number
): number {
  const cxTerminal = cxTerminalFinAnaCosFina(arancel, costoFinanciero);
  const iva = ivaFinAnaCosFina(arancel, costoFinanciero);
  const imp = impChequeFinAnaCosFina(impCheque, arancel, costoFinanciero);
  return roundPorcentaje0a100(cxTerminal + iva + imp);
}

/** Display es-AR con coma y 2 decimales (sin `%`). */
export function fmtPorcentajeDosDecimalesFinAnaCosFina(valor: number): string {
  return porcentajeCentNormalizedToDisplay(porcentajeCentFromNumber(valor));
}
