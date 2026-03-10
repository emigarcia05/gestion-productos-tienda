"use client";

import { AlertTriangle, Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import type { SyncDuxProgreso } from "@/hooks/useSyncDux";

interface Props {
  syncing: boolean;
  progreso: SyncDuxProgreso | null;
  onConfirm: () => void;
  onCancel: () => void;
}

function fmtTiempo(segs: number): string {
  if (segs < 60) return `${segs}s`;
  const m = Math.floor(segs / 60);
  const s = segs % 60;
  return s > 0 ? `${m}m ${s}s` : `${m}m`;
}

export default function SyncModal({ syncing, progreso, onConfirm, onCancel }: Props) {
  const pct =
    progreso && progreso.total > 0
      ? Math.round((progreso.procesados / progreso.total) * 100)
      : 0;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm">
      <div className="modal-app mx-4 w-full max-w-md">
        <div className="modal-app__header">
          <h2 className="modal-app__title">Importar Datos Dux</h2>
        </div>

        <div className="modal-app__content">
          <div className="modal-app__body modal-app__body--centered flex flex-col items-center gap-4 py-4">
            {!syncing ? (
              <>
                <div className="rounded-full bg-accent2/10 p-3">
                  <AlertTriangle className="h-7 w-7 text-accent2" />
                </div>
                <p className="text-sm text-muted-foreground leading-relaxed">
                  Para continuar se debe actualizar la base de datos. Esto
                  demorará aproximadamente{" "}
                  <span className="text-accent2 font-semibold">
                    5 a 10 minutos
                  </span>
                  .
                </p>
                <p className="text-sm font-medium text-foreground">
                  ¿Desea continuar?
                </p>
              </>
            ) : (
              <>
                <Loader2 className="h-10 w-10 text-primary animate-spin" />
                <p className="text-sm font-semibold text-foreground">
                  Actualizando base de datos...
                </p>

                {progreso ? (
                  <div className="w-full flex flex-col gap-2">
                    <div className="w-full bg-muted rounded-full h-2 overflow-hidden">
                      <div
                        className="h-2 rounded-full bg-primary transition-all duration-500"
                        style={{ width: `${pct}%` }}
                      />
                    </div>
                    <div className="flex justify-between text-xs text-muted-foreground tabular-nums">
                      <span>
                        <span className="text-foreground font-medium">
                          {progreso.procesados.toLocaleString("es-AR")}
                        </span>
                        {" / "}
                        {progreso.total.toLocaleString("es-AR")} ítems
                      </span>
                      <span className="text-accent2 font-semibold">{pct}%</span>
                    </div>
                    {progreso.segsRestantes !== null &&
                      progreso.segsRestantes > 0 && (
                        <p className="text-xs text-muted-foreground">
                          Tiempo restante estimado:{" "}
                          <span className="text-accent2 font-semibold">
                            {fmtTiempo(progreso.segsRestantes)}
                          </span>
                        </p>
                      )}
                  </div>
                ) : (
                  <p className="text-xs text-muted-foreground">Iniciando...</p>
                )}

                <p className="text-xs text-muted-foreground">
                  No cierres esta pestaña hasta que finalice.
                </p>
              </>
            )}
          </div>

          {!syncing && (
            <div className="modal-app__footer flex gap-3 justify-center">
              <Button variant="outline" onClick={onCancel} className="flex-1 max-w-[8rem]">
                No
              </Button>
              <Button
                onClick={onConfirm}
                className="flex-1 max-w-[8rem] bg-primary text-primary-foreground hover:brightness-90"
              >
                Sí, continuar
              </Button>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
