/**
 * Ventana (días) para considerar un control de transferencia como duplicado reciente.
 * Mismo `cod_tienda` + origen + destino + cantidad dentro de esta ventana → advertencia.
 */
export const TRANSF_DEPOSITOS_VENTANA_DUPLICADO_DIAS = 7;
