import type { ProductoPedidoUrgente } from "@/components/pedidos/TablaPedidoUrgente";

/** Mapa `codExt` → cantidad pedida urgente para la UI (string vacío = sin cantidad). */
export function cantidadesUrgenteDesdeProductos(
  productos: ProductoPedidoUrgente[]
): Record<string, string> {
  const next: Record<string, string> = {};
  for (const p of productos) {
    const ids =
      p.miembrosAgrupacion && p.miembrosAgrupacion.length > 0
        ? p.miembrosAgrupacion.map((m) => m.codExt)
        : [p.id];
    for (const id of ids) {
      let cant = 0;
      if (p.miembrosAgrupacion && p.miembrosAgrupacion.length > 0) {
        const miembro = p.miembrosAgrupacion.find((m) => m.codExt === id);
        cant = Math.max(0, Math.floor(Number(miembro?.cantPedidaUrgente) || 0));
      } else {
        cant = Math.max(0, Math.floor(Number(p.cantPedidaUrgente) || 0));
      }
      next[id] = cant > 0 ? String(cant) : "";
    }
  }
  return next;
}

/** Limpia cantidades visibles en la página actual (p. ej. tras generar pedido). */
export function limpiarCantidadesUrgenteVisibles(
  productos: ProductoPedidoUrgente[],
  prev: Record<string, string>
): Record<string, string> {
  const next = { ...prev };
  for (const p of productos) {
    const ids =
      p.miembrosAgrupacion && p.miembrosAgrupacion.length > 0
        ? p.miembrosAgrupacion.map((m) => m.codExt)
        : [p.id];
    for (const id of ids) {
      next[id] = "";
    }
  }
  return next;
}
