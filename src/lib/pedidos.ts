/**
 * Tipos y utilidades compartidas para módulos de pedidos (server y client).
 */

export type SucursalPedido = "guaymallen" | "maipu";

/** Etiquetas de sucursal para PDF / nota de pedido (alineado a `generarPdfEnviarPedidoAction`). */
export const SUCURSAL_LABEL_PEDIDO: Record<SucursalPedido, string> = {
  guaymallen: "Guaymallén",
  maipu: "Maipú",
};

export const TIPOS_PEDIDO = ["URGENTE", "TINTOMETRICO", "REPOSICION"] as const;
export type TipoPedido = (typeof TIPOS_PEDIDO)[number];

/** Parsea el query param "tipo" (valores separados por coma) a array de TipoPedido. */
export function parseTiposParam(param: string): TipoPedido[] {
  if (!param?.trim()) return [];
  const valid = new Set(TIPOS_PEDIDO);
  return param
    .split(",")
    .map((s) => s.trim().toUpperCase())
    .filter((v): v is TipoPedido => valid.has(v as TipoPedido));
}
