/**
 * Ventana (días) para considerar un control de transferencia como duplicado reciente.
 * Mismo `cod_tienda` + origen + destino + cantidad dentro de esta ventana → advertencia en grilla.
 */
export const TRANSF_DEPOSITOS_VENTANA_DUPLICADO_DIAS = 7;

/** Ventana (días) del historial por producto en el modal CONTROL. */
export const TRANSF_DEPOSITOS_VENTANA_HISTORIAL_DIAS = 14;

export const SUCURSAL_LABEL_TRANSF: Record<"guaymallen" | "maipu", string> = {
  guaymallen: "GUAYMALLÉN",
  maipu: "MAIPÚ",
};
