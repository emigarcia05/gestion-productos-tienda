"use client";

import { useState } from "react";
import { toast } from "sonner";
import { RefreshCw, Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";

const PAUSA_MS = 5000; // 5 segundos entre páginas para respetar el rate limit

export default function SyncButton() {
  const [pending, setPending] = useState(false);
  const [progreso, setProgreso] = useState("");

  async function handleSync() {
    setPending(true);
    setProgreso("");
    toast.loading("Iniciando sincronización... Este proceso puede tardar entre 5 y 10 minutos. No cierres esta pestaña.", { id: "sync", duration: Infinity });

    try {
      let offset = 0;
      let total = 0;
      const inicioMs = Date.now();
      const inicioSync = new Date().toISOString();

      // Loop: una llamada por página hasta que no haya más
      while (true) {
        const res = await fetch(`/api/sync-tienda?offset=${offset}`);
        const data = await res.json();

        if (!data.ok) {
          toast.error(`Error: ${data.error}`, { id: "sync" });
          return;
        }

        total = data.total;
        const procesados = offset + data.procesados;
        setProgreso(`${procesados} / ${total}`);
        toast.loading(`Sincronizando... ${procesados} / ${total} items. No cierres esta pestaña.`, { id: "sync", duration: Infinity });

        if (!data.hayMas) break;

        offset = data.offset;

        // Pausa para respetar el rate limit de la API
        await new Promise((r) => setTimeout(r, PAUSA_MS));
      }

      // Llamada final: deshabilitar items que ya no están y guardar log
      // Para saber qué codItems están en la API, hacemos una query a la BD
      // (todos los que se actualizaron en esta sesión tienen updatedAt reciente)
      const duracionMs = Date.now() - inicioMs;

      const finRes = await fetch("/api/sync-tienda", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ inicioSync, totalApi: total, duracionMs }),
      });
      const finData = await finRes.json();
      const deshabilitados = finData.deshabilitados ?? 0;
      const creadosFinal = finData.creados ?? 0;
      const actualizadosFinal = finData.actualizados ?? 0;

      toast.success(
        `Sync completado en ${(duracionMs / 1000).toFixed(1)}s — ${total.toLocaleString()} items: ${creadosFinal} nuevos, ${actualizadosFinal} actualizados, ${deshabilitados} deshabilitados`,
        { id: "sync", duration: 8000 }
      );
      window.location.reload();

    } catch {
      toast.error("Error de conexión al sincronizar.", { id: "sync" });
    } finally {
      setPending(false);
      setProgreso("");
    }
  }

  return (
    <Button onClick={handleSync} disabled={pending} variant="outline" size="sm" className="gap-2">
      {pending
        ? <Loader2 className="h-4 w-4 animate-spin" />
        : <RefreshCw className="h-4 w-4" />
      }
      {pending
        ? progreso ? `Sincronizando ${progreso}...` : "Iniciando..."
        : "Sincronizar ahora"
      }
    </Button>
  );
}
