/**
 * Ventana (días) compartida: historial del modal y aviso de transferencia duplicada.
 * Mismo `cod_tienda` + origen + destino + cantidad dentro de esta ventana → advertencia.
 */

import { GP_ROUTES } from "@/lib/gestionProductosRoutes";

export const TRANSF_DEPOSITOS_VENTANA_HISTORIAL_DIAS = 14;

/** Alias: misma ventana que el historial (14 días). */
export const TRANSF_DEPOSITOS_VENTANA_DUPLICADO_DIAS =
  TRANSF_DEPOSITOS_VENTANA_HISTORIAL_DIAS;

export const SUCURSAL_LABEL_TRANSF: Record<"guaymallen" | "maipu", string> = {
  guaymallen: "GUAYMALLÉN",
  maipu: "MAIPÚ",
};

/** Transferencia de depósitos en DUX (abre en pestaña nueva). */
export const DUX_TRANSFERENCIA_DEPOSITOS_URL =
  "https://erp.duxsoftware.com.ar/pages/deposito/transferenciaDep.faces";

/** Query para abrir `GenerarTransfDepositosModal` al entrar a Trans. Depósitos. */
export const QUERY_ABRIR_GENERAR_TRANSF = "generar";

/**
 * URL canónica de Trans. Depósitos con el modal **Generar Transf.** abierto.
 */
export function hrefAbrirGenerarTransfDepositos(
  origen?: "guaymallen" | "maipu" | null
): string {
  const p = new URLSearchParams();
  if (origen) p.set("origen", origen);
  p.set(QUERY_ABRIR_GENERAR_TRANSF, "1");
  return `${GP_ROUTES.ayudaVendedor.transfDepositos}?${p.toString()}`;
}
