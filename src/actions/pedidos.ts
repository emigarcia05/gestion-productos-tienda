"use server";

import { getRol } from "@/lib/sesion";
import { PERMISOS, puede } from "@/lib/permisos";
import {
  getListaPreciosParaPedidoUrgente,
  getProveedoresParaPedidoUrgente,
} from "@/services/listaPrecios.service";
import {
  syncPedidoUrgenteEnvio,
  type SucursalPedidoEnvio,
  type ItemPedidoUrgentePayload,
} from "@/services/pedidosEnvio.service";
import type { ActionResult } from "@/lib/types";
import { PAGE_SIZE } from "@/lib/pagination";

export async function getPedidoUrgenteData(params: {
  sucursal?: string;
  q?: string;
  pagina?: string;
  proveedor?: string;
}) {
  const rol = await getRol();
  if (!puede(rol, PERMISOS.pedidos.acceso)) {
    return {
      proveedores: [],
      productos: [],
      total: 0,
      totalPaginas: 0,
    };
  }

  const { sucursal = "", q = "", pagina = "1", proveedor = "" } = params;
  const sucursalValida = sucursal.trim();

  const paginaNum = Math.max(1, parseInt(pagina, 10) || 1);
  const [proveedores, result] = await Promise.all([
    getProveedoresParaPedidoUrgente(),
    sucursalValida
      ? getListaPreciosParaPedidoUrgente(
          sucursalValida,
          proveedor || undefined,
          q || undefined,
          paginaNum,
          PAGE_SIZE
        )
      : Promise.resolve({ items: [], total: 0, totalPaginas: 0 }),
  ]);

  return {
    proveedores,
    productos: result.items,
    total: result.total,
    totalPaginas: result.totalPaginas,
  };
}

/** Datos iniciales para la página Enviar Pedido (filtros: proveedores). */
export async function getEnviarPedidoData() {
  const rol = await getRol();
  if (!puede(rol, PERMISOS.pedidos.acceso)) {
    return { proveedores: [] };
  }
  const proveedores = await getProveedoresParaPedidoUrgente();
  return { proveedores };
}

const SUCURSALES_VALIDAS: SucursalPedidoEnvio[] = ["guaymallen", "maipu"];

/**
 * Sincroniza el pedido urgente a la tabla pedidos_envio.
 * Recibe sucursal + ítems (id lista precio, cantidad); solo se guardan cant > 0.
 * Reemplaza todos los ítems URGENTE de esa sucursal por el conjunto enviado.
 */
export async function syncPedidoUrgenteEnvioAction(
  sucursal: string,
  items: ItemPedidoUrgentePayload[]
): Promise<ActionResult<{ creados: number }>> {
  const rol = await getRol();
  if (!puede(rol, PERMISOS.pedidos.acceso)) {
    return { ok: false, error: "Sin permisos para pedidos." };
  }
  const sucursalValida = SUCURSALES_VALIDAS.includes(sucursal as SucursalPedidoEnvio)
    ? (sucursal as SucursalPedidoEnvio)
    : null;
  if (!sucursalValida) {
    return { ok: false, error: "Seleccioná una sucursal válida (Guaymallén o Maipú)." };
  }
  if (!Array.isArray(items)) {
    return { ok: false, error: "Ítems inválidos." };
  }
  const payload: ItemPedidoUrgentePayload[] = items
    .filter((i) => i && typeof i.id === "string" && typeof i.cant === "number" && i.cant > 0)
    .map((i) => ({ id: String(i.id).trim(), cant: Math.floor(Number(i.cant)) }))
    .filter((i) => i.id.length > 0);
  try {
    const { creados } = await syncPedidoUrgenteEnvio(sucursalValida, payload);
    return { ok: true, data: { creados } };
  } catch (e) {
    const message = e instanceof Error ? e.message : "Error al guardar el pedido.";
    return { ok: false, error: message };
  }
}
