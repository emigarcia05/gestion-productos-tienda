"use server";

import { esEditor } from "@/lib/sesion";
import type { ActionResult } from "@/lib/types";
import { postActualizarCostoEnDux } from "@/lib/duxApi";
import { getPayloadsActualizarCostosDux } from "@/services/actualizarPreciosDux.service";

/** Pausa entre POSTs a DUX (rate limit: al menos 5 s entre peticiones). */
const DELAY_MS = 5000;

/**
 * Actualiza precios en DUX a partir de los ítems de Control Stock (precios_tienda) visibles.
 *
 * Lógica: lista proveedores (precios_proveedores) es la fuente actualizada.
 * - cod_item → precios_tienda.cod_tienda
 * - costo → precios_proveedores.px_compra_final
 * - id_proveedor → proveedores.id_proveedor_dux
 *
 * @param idsPreciosTienda IDs de los ítems de precios_tienda actualmente mostrados en la tabla.
 */
export async function actualizarPreciosDuxDesdeStock(
  idsPreciosTienda: string[]
): Promise<ActionResult<{ enviados: number }>> {
  if (!(await esEditor())) return { ok: false, error: "Sin permisos de editor." };
  if (!Array.isArray(idsPreciosTienda) || idsPreciosTienda.length === 0) {
    return { ok: false, error: "No hay ítems seleccionados para actualizar en Dux." };
  }

  try {
    const payloads = await getPayloadsActualizarCostosDux(idsPreciosTienda);
    if (payloads.length === 0) {
      return {
        ok: false,
        error:
          "No hay combinaciones ítem–proveedor con id_proveedor_dux y px_compra_final. Revisá Lista Proveedores y precios.",
      };
    }

    for (const p of payloads) {
      await postActualizarCostoEnDux({
        cod_item: p.codItem,
        costo: p.costo,
        id_proveedor: p.idProveedorDux,
      });
      await new Promise((r) => setTimeout(r, DELAY_MS));
    }

    return { ok: true, data: { enviados: payloads.length } };
  } catch (e: unknown) {
    const message = e instanceof Error ? e.message : "Error al actualizar costos en Dux.";
    return { ok: false, error: message };
  }
}

