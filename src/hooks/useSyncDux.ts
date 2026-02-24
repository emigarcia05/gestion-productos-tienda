"use client";

import { useState } from "react";
import { toast } from "sonner";

const PAUSA_MS = 5000;
const TOAST_ID = "sync-dux";
const LIMIT    = 50;

export interface SyncDuxResult {
  creados:        number;
  actualizados:   number;
  deshabilitados: number;
  total:          number;
  duracionMs:     number;
}

export interface SyncDuxProgreso {
  procesados:    number;
  total:         number;
  /** Segundos restantes estimados, null hasta tener el primer lote */
  segsRestantes: number | null;
}

export function useSyncDux(onSuccess: (result: SyncDuxResult) => void) {
  const [syncing,  setSyncing]  = useState(false);
  const [progreso, setProgreso] = useState<SyncDuxProgreso | null>(null);

  async function ejecutar() {
    setSyncing(true);
    setProgreso(null);
    toast.loading("Actualizando base de datos... No cierres esta pestaña.", { id: TOAST_ID, duration: Infinity });

    try {
      let offset      = 0;
      let total       = 0;
      let msPorLote   = 0;   // tiempo real del primer lote (sin pausa)
      const inicioMs   = Date.now();
      const inicioSync = new Date().toISOString();
      let loteNum      = 0;

      while (true) {
        const lotInicio = Date.now();
        const res  = await fetch(`/api/sync-tienda?offset=${offset}`);
        const data = await res.json();

        if (!data.ok) {
          toast.error(`Error: ${data.error}`, { id: TOAST_ID });
          setSyncing(false);
          return;
        }

        total = data.total;
        const procesados = offset + data.procesados;
        loteNum++;

        // Calcular tiempo por lote con el promedio de los lotes reales transcurridos
        const tiempoLote = Date.now() - lotInicio;
        if (loteNum === 1) {
          msPorLote = tiempoLote;
        } else {
          // Promedio acumulado para refinar la estimación
          msPorLote = Math.round((msPorLote * (loteNum - 1) + tiempoLote) / loteNum);
        }

        const lotesRestantes  = Math.ceil((total - procesados) / LIMIT);
        // Cada lote restante = tiempo de procesamiento + pausa (excepto el último)
        const msRestantes     = lotesRestantes > 0
          ? lotesRestantes * (msPorLote + PAUSA_MS) - PAUSA_MS
          : 0;
        const segsRestantes   = Math.round(msRestantes / 1000);

        setProgreso({ procesados, total, segsRestantes });
        toast.loading(
          `Actualizando... ${procesados} / ${total} ítems. No cierres esta pestaña.`,
          { id: TOAST_ID, duration: Infinity }
        );

        if (!data.hayMas) break;
        offset = data.offset;
        await new Promise((r) => setTimeout(r, PAUSA_MS));
      }

      const duracionMs = Date.now() - inicioMs;
      const finRes  = await fetch("/api/sync-tienda", {
        method:  "POST",
        headers: { "content-type": "application/json" },
        body:    JSON.stringify({ inicioSync, totalApi: total, duracionMs }),
      });
      const finData = await finRes.json();

      const result: SyncDuxResult = {
        creados:        finData.creados        ?? 0,
        actualizados:   finData.actualizados   ?? 0,
        deshabilitados: finData.deshabilitados ?? 0,
        total,
        duracionMs,
      };

      toast.dismiss(TOAST_ID);
      onSuccess(result);

    } catch {
      toast.error("Error de conexión al actualizar.", { id: TOAST_ID });
      setSyncing(false);
      setProgreso(null);
    }
  }

  return { syncing, progreso, ejecutar };
}
