"use server";

import { esEditor } from "@/lib/sesion";
import type { ActionResult } from "@/lib/types";
import {
  postActualizarCostosEnDuxBatch,
  DUX_POST_COSTOS_BATCH_SIZE,
} from "@/lib/duxApi";
import { getPayloadsActualizarCostosDux } from "@/services/actualizarPreciosDux.service";
import {
  startExportInDb,
  setExportProgressInDb,
  setExportResultInDb,
  setExportErrorInDb,
} from "@/lib/exportProgressDb";

/** Pausa entre POSTs a DUX (rate limit: al menos 5 s entre peticiones). */
const DELAY_MS = 5000;

/**
 * Actualiza precios en DUX a partir de los ítems de Control Aumentos (con cambio de precio).
 * Escribe progreso en BD para que la sidebar muestre "Exportando!" (polling /api/exportar-precios-dux/status).
 *
 * Lógica: cod_item, costo (px_compra_final), id_proveedor (id_proveedor_dux).
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

    await startExportInDb(payloads.length);

    const total = payloads.length;
    let processed = 0;
    try {
      for (let i = 0; i < payloads.length; i += DUX_POST_COSTOS_BATCH_SIZE) {
        const chunk = payloads.slice(i, i + DUX_POST_COSTOS_BATCH_SIZE);
        const batchPayloads = chunk.map((p) => ({
          cod_item: p.codItem,
          costo: p.costo,
          id_proveedor: p.idProveedorDux,
        }));
        await postActualizarCostosEnDuxBatch(batchPayloads);
        processed += chunk.length;
        await setExportProgressInDb(processed, total);
        if (i + chunk.length < payloads.length) {
          await new Promise((r) => setTimeout(r, DELAY_MS));
        }
      }
      await setExportResultInDb(payloads.length);
      return { ok: true, data: { enviados: payloads.length } };
    } catch (err) {
      const msg = err instanceof Error ? err.message : String(err);
      await setExportErrorInDb(msg);
      throw err;
    }
  } catch (e: unknown) {
    const message =
      e instanceof Error ? e.message : typeof e === "string" ? e : "Error al actualizar costos en Dux.";
    console.error("[Exportar Px. Dux]", e);
    return { ok: false, error: message };
  }
}

