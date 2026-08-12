/**
 * Ventana (días) compartida: historial del modal y aviso de transferencia duplicada.
 * Mismo `cod_tienda` + origen + destino + cantidad dentro de esta ventana → advertencia.
 */
export const TRANSF_DEPOSITOS_VENTANA_HISTORIAL_DIAS = 14;

/** Alias: misma ventana que el historial (14 días). */
export const TRANSF_DEPOSITOS_VENTANA_DUPLICADO_DIAS =
  TRANSF_DEPOSITOS_VENTANA_HISTORIAL_DIAS;

export const SUCURSAL_LABEL_TRANSF: Record<"guaymallen" | "maipu", string> = {
  guaymallen: "GUAYMALLÉN",
  maipu: "MAIPÚ",
};
