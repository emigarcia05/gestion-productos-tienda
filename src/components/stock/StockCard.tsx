"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { PackageSearch, Loader2, AlertTriangle } from "lucide-react";
import { toast } from "sonner";

const PAUSA_MS = 5000;
const TARJETA  = "flex flex-col items-center justify-between w-44 h-56 rounded-2xl border-2 border-brand bg-card/80 hover:shadow-lg hover:shadow-brand/20 hover:scale-105 transition-all duration-200 p-5 group cursor-pointer select-none";

export default function StockCard() {
  const router = useRouter();
  const [modal,    setModal]    = useState(false);
  const [syncing,  setSyncing]  = useState(false);
  const [progreso, setProgreso] = useState("");

  async function handleSync() {
    setSyncing(true);
    setProgreso("");
    toast.loading("Actualizando base de datos... No cierres esta pestaña.", { id: "sync-stock", duration: Infinity });

    try {
      let offset = 0;
      let total  = 0;
      const inicioMs   = Date.now();
      const inicioSync = new Date().toISOString();

      while (true) {
        const res  = await fetch(`/api/sync-tienda?offset=${offset}`);
        const data = await res.json();

        if (!data.ok) {
          toast.error(`Error: ${data.error}`, { id: "sync-stock" });
          return;
        }

        total = data.total;
        const procesados = offset + data.procesados;
        setProgreso(`${procesados} / ${total}`);
        toast.loading(
          `Actualizando... ${procesados} / ${total} ítems. No cierres esta pestaña.`,
          { id: "sync-stock", duration: Infinity }
        );

        if (!data.hayMas) break;
        offset = data.offset;
        await new Promise((r) => setTimeout(r, PAUSA_MS));
      }

      const duracionMs = Date.now() - inicioMs;
      await fetch("/api/sync-tienda", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ inicioSync, totalApi: total, duracionMs }),
      });

      toast.success("Base de datos actualizada. Ingresando al módulo...", { id: "sync-stock", duration: 3000 });
      router.push("/stock");

    } catch {
      toast.error("Error de conexión al actualizar.", { id: "sync-stock" });
      setSyncing(false);
      setProgreso("");
    }
  }

  return (
    <>
      {/* Tarjeta */}
      <button className={TARJETA} onClick={() => setModal(true)}>
        <div className="flex-1 flex items-center justify-center w-full">
          <PackageSearch className="w-16 h-16 text-brand transition-colors" />
        </div>
        <span className="text-base font-medium text-accent2 text-center leading-tight">
          Control Stock
        </span>
      </button>

      {/* Modal de confirmación / progreso */}
      {modal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm">
          <div className="bg-card border border-border rounded-2xl shadow-2xl w-full max-w-sm mx-4 p-6 flex flex-col gap-5">

            {!syncing ? (
              <>
                {/* Ícono + título */}
                <div className="flex flex-col items-center gap-3 text-center">
                  <div className="rounded-full bg-accent2/10 p-3">
                    <AlertTriangle className="h-7 w-7 text-accent2" />
                  </div>
                  <h2 className="text-base font-bold text-foreground leading-snug">
                    Actualización requerida
                  </h2>
                  <p className="text-sm text-muted-foreground leading-relaxed">
                    Para ingresar a este módulo se debe actualizar la base de datos.
                    Esto demorará aproximadamente{" "}
                    <span className="text-accent2 font-semibold">5 a 10 minutos</span>.
                  </p>
                  <p className="text-sm font-medium text-foreground">
                    ¿Desea continuar?
                  </p>
                </div>

                {/* Botones */}
                <div className="flex gap-3">
                  <button
                    onClick={() => setModal(false)}
                    className="flex-1 rounded-lg border border-border py-2 text-sm font-medium text-muted-foreground hover:text-foreground hover:border-foreground/30 transition-colors"
                  >
                    No
                  </button>
                  <button
                    onClick={handleSync}
                    className="flex-1 rounded-lg bg-brand py-2 text-sm font-semibold text-white hover:bg-brand/90 transition-colors"
                  >
                    Sí, continuar
                  </button>
                </div>
              </>
            ) : (
              <>
                {/* Estado de progreso */}
                <div className="flex flex-col items-center gap-4 text-center py-2">
                  <Loader2 className="h-10 w-10 text-brand animate-spin" />
                  <div>
                    <p className="text-sm font-semibold text-foreground">Actualizando base de datos...</p>
                    {progreso && (
                      <p className="text-xs text-accent2 font-mono mt-1">{progreso} ítems procesados</p>
                    )}
                  </div>
                  <p className="text-xs text-muted-foreground">
                    No cierres esta pestaña hasta que finalice.
                  </p>
                </div>
              </>
            )}

          </div>
        </div>
      )}
    </>
  );
}
