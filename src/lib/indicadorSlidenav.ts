/**
 * Indicador de Pendientes (slidenav). Tipos + fetch HTTP.
 * No usar Server Action: Next serializa actions y el armado de Generar Pedido
 * (~10 s) bloqueaba Elegir Usuario y el aviso de transferencia.
 */

import {
  indicadorSlidenavDtoSchema,
} from "@/lib/validations/transfDepositos";
import type { SucursalPreferida } from "@/lib/sucursalPreferida";

export const EVENTO_INDICADOR_SLIDENAV = "indicador-slidenav-refresh";

/** El COUNT de transf. pendiente ya resolvió: intentar abrir el aviso. */
export const EVENTO_AVISO_TRANSF_PENDIENTE = "main-app-aviso-transf-pendiente";

export function avisarIndicadorSlidenav(): void {
  if (typeof window === "undefined") return;
  window.dispatchEvent(new Event(EVENTO_INDICADOR_SLIDENAV));
}

export type IndicadorSlidenavProveedorPedidoDto = {
  proveedorId: string;
  proveedor: string;
  urgente: number;
  tintometrico: number;
  reposicion: number;
};

export type IndicadorSlidenavDto = {
  urgente: number;
  tintometrico: number;
  reposicion: number;
  proveedoresPedido: IndicadorSlidenavProveedorPedidoDto[];
  hayTransfOrigen: boolean;
};

export const INDICADOR_SLIDENAV_VACIO: IndicadorSlidenavDto = {
  urgente: 0,
  tintometrico: 0,
  reposicion: 0,
  proveedoresPedido: [],
  hayTransfOrigen: false,
};

export type ParteIndicadorSlidenav = "transf" | "completo";

function urlIndicadorSlidenav(
  sucursal: SucursalPreferida,
  parte: ParteIndicadorSlidenav
): string {
  const q = new URLSearchParams({ sucursal, parte });
  return `/api/indicador-slidenav?${q.toString()}`;
}

export async function fetchIndicadorSlidenav(
  sucursal: SucursalPreferida,
  parte: ParteIndicadorSlidenav,
  signal?: AbortSignal
): Promise<IndicadorSlidenavDto | null> {
  try {
    const res = await fetch(urlIndicadorSlidenav(sucursal, parte), {
      cache: "no-store",
      signal,
    });
    if (!res.ok) return null;
    const json: unknown = await res.json();
    if (!json || typeof json !== "object" || !("ok" in json) || json.ok !== true) {
      return null;
    }
    const dataUnknown =
      "data" in json ? (json as { data: unknown }).data : undefined;
    const parsed = indicadorSlidenavDtoSchema.safeParse(dataUnknown);
    return parsed.success ? parsed.data : null;
  } catch (e) {
    if (e instanceof DOMException && e.name === "AbortError") return null;
    return null;
  }
}
