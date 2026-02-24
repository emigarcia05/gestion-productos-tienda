"use client";

import { AlertTriangle, Loader2 } from "lucide-react";
import type { SyncDuxProgreso } from "@/hooks/useSyncDux";

interface Props {
  syncing:   boolean;
  progreso:  SyncDuxProgreso | null;
  onConfirm: () => void;
  onCancel:  () => void;
}

function fmtTiempo(segs: number): string {
  if (segs < 60) return `${segs}s`;
  const m = Math.floor(segs / 60);
  const s = segs % 60;
  return s > 0 ? `${m}m ${s}s` : `${m}m`;
}

export default function SyncModal({ syncing, progreso, onConfirm, onCancel }: Props) {
  const pct = progreso && progreso.total > 0
    ? Math.round((progreso.procesados / progreso.total) * 100)
    : 0;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm">
      <div className="bg-card border border-border rounded-2xl shadow-2xl w-full max-w-sm mx-4 p-6 flex flex-col gap-5">

        {!syncing ? (
          <>
            <div className="flex flex-col items-center gap-3 text-center">
              <div className="rounded-full bg-accent2/10 p-3">
                <AlertTriangle className="h-7 w-7 text-accent2" />
              </div>
              <h2 className="text-base font-bold text-foreground leading-snug">
                Actualización requerida
              </h2>
              <p className="text-sm text-muted-foreground leading-relaxed">
                Para continuar se debe actualizar la base de datos.
                Esto demorará aproximadamente{" "}
                <span className="text-accent2 font-semibold">5 a 10 minutos</span>.
              </p>
              <p className="text-sm font-medium text-foreground">
                ¿Desea continuar?
              </p>
            </div>

            <div className="flex gap-3">
              <button
                onClick={onCancel}
                className="flex-1 rounded-lg border border-border py-2 text-sm font-medium text-muted-foreground hover:text-foreground hover:border-foreground/30 transition-colors"
              >
                No
              </button>
              <button
                onClick={onConfirm}
                className="flex-1 rounded-lg bg-brand py-2 text-sm font-semibold text-white hover:bg-brand/90 transition-colors"
              >
                Sí, continuar
              </button>
            </div>
          </>
        ) : (
          <div className="flex flex-col items-center gap-4 text-center py-2">
            <Loader2 className="h-10 w-10 text-brand animate-spin" />

            <div className="w-full flex flex-col gap-2">
              <p className="text-sm font-semibold text-foreground">Actualizando base de datos...</p>

              {progreso ? (
                <>
                  {/* Barra de progreso */}
                  <div className="w-full bg-white/10 rounded-full h-2 overflow-hidden">
                    <div
                      className="h-2 rounded-full bg-brand transition-all duration-500"
                      style={{ width: `${pct}%` }}
                    />
                  </div>

                  {/* Ítems + porcentaje */}
                  <div className="flex justify-between text-xs text-muted-foreground tabular-nums">
                    <span>
                      <span className="text-white font-medium">{progreso.procesados.toLocaleString("es-AR")}</span>
                      {" / "}
                      {progreso.total.toLocaleString("es-AR")} ítems
                    </span>
                    <span className="text-accent2 font-semibold">{pct}%</span>
                  </div>

                  {/* Tiempo restante */}
                  {progreso.segsRestantes !== null && progreso.segsRestantes > 0 && (
                    <p className="text-xs text-muted-foreground">
                      Tiempo restante estimado:{" "}
                      <span className="text-accent2 font-semibold">
                        {fmtTiempo(progreso.segsRestantes)}
                      </span>
                    </p>
                  )}
                </>
              ) : (
                <p className="text-xs text-muted-foreground">Iniciando...</p>
              )}
            </div>

            <p className="text-xs text-muted-foreground">
              No cierres esta pestaña hasta que finalice.
            </p>
          </div>
        )}

      </div>
    </div>
  );
}
