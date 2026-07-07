import type { FinAnaCosFinaPago, FinAnaCosFinaTerminal } from "@prisma/client";

/** Orden canónico de terminales en grilla y semilla. */
export const FIN_ANA_COS_FINA_TERMINALES: FinAnaCosFinaTerminal[] = [
  "MERCADOPAGO",
  "PAYWAY",
  "NAVE",
];

/** Orden canónico de modalidades de pago en grilla y semilla. */
export const FIN_ANA_COS_FINA_PAGOS: FinAnaCosFinaPago[] = [
  "DEBITO",
  "CUOTA_1",
  "CUOTA_3",
  "CUOTA_6",
  "CUOTA_9",
  "CUOTA_12",
  "CUOTA_18",
];

const ETIQUETAS_TERMINAL: Record<FinAnaCosFinaTerminal, string> = {
  MERCADOPAGO: "MercadoPago",
  PAYWAY: "Payway",
  NAVE: "Nave",
};

const ETIQUETAS_PAGO: Record<FinAnaCosFinaPago, string> = {
  DEBITO: "Débito",
  CUOTA_1: "1 Cuota",
  CUOTA_3: "3 Cuotas",
  CUOTA_6: "6 Cuotas",
  CUOTA_9: "9 Cuotas",
  CUOTA_12: "12 Cuotas",
  CUOTA_18: "18 Cuotas",
};

export function etiquetaTerminalFinAnaCosFina(terminal: FinAnaCosFinaTerminal): string {
  return ETIQUETAS_TERMINAL[terminal];
}

export function etiquetaPagoFinAnaCosFina(pago: FinAnaCosFinaPago): string {
  return ETIQUETAS_PAGO[pago];
}

export function ordenTerminalFinAnaCosFina(terminal: FinAnaCosFinaTerminal): number {
  return FIN_ANA_COS_FINA_TERMINALES.indexOf(terminal);
}

export function ordenPagoFinAnaCosFina(pago: FinAnaCosFinaPago): number {
  return FIN_ANA_COS_FINA_PAGOS.indexOf(pago);
}
