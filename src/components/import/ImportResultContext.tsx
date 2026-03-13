"use client";

import React, { createContext, useCallback, useContext, useState } from "react";
import { Dialog } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import AppModal from "@/components/shared/AppModal";

export interface ImportProgressResult {
  creados: number;
  actualizados: number;
  eliminados: number;
  errores: string[];
}

type ImportResultModalState =
  | { type: "closed" }
  | { type: "result"; data: ImportProgressResult }
  | { type: "error"; message: string };

interface ImportResultContextValue {
  openResult: (result: ImportProgressResult) => void;
  openError: (message: string) => void;
  close: () => void;
}

const ImportResultContext = createContext<ImportResultContextValue | null>(null);

export function useImportResult() {
  const ctx = useContext(ImportResultContext);
  if (!ctx) throw new Error("useImportResult must be used within ImportResultProvider");
  return ctx;
}

export function ImportResultProvider({ children }: { children: React.ReactNode }) {
  const [state, setState] = useState<ImportResultModalState>({ type: "closed" });

  const openResult = useCallback((result: ImportProgressResult) => {
    setState({ type: "result", data: result });
  }, []);

  const openError = useCallback((message: string) => {
    setState({ type: "error", message });
  }, []);

  const close = useCallback(() => {
    setState({ type: "closed" });
  }, []);

  const open = state.type !== "closed";

  return (
    <ImportResultContext.Provider value={{ openResult, openError, close }}>
      {children}
      <Dialog open={open} onOpenChange={(open) => !open && close()}>
        <AppModal
          title={state.type === "error" ? "Error En La Importación" : "Resultado De Importación"}
          actions={
            <Button variant="default" onClick={close}>
              Cerrar
            </Button>
          }
        >
          {state.type === "error" && (
            <p className="text-destructive text-sm">{state.message}</p>
          )}
          {state.type === "result" && (
            <div className="space-y-4 text-sm">
              <ul className="grid gap-2">
                <li>
                  <span className="font-medium">Creados:</span> {state.data.creados}
                </li>
                <li>
                  <span className="font-medium">Actualizados:</span> {state.data.actualizados}
                </li>
                {state.data.eliminados > 0 && (
                  <li>
                    <span className="font-medium">Eliminados:</span> {state.data.eliminados}
                  </li>
                )}
              </ul>
              {state.data.errores.length > 0 && (
                <div>
                  <p className="font-medium text-amber-700 dark:text-amber-400 mb-1">
                    Advertencias ({state.data.errores.length}):
                  </p>
                  <ul className="max-h-40 overflow-auto list-disc list-inside text-muted-foreground space-y-0.5">
                    {state.data.errores.slice(0, 20).map((e, i) => (
                      <li key={i}>{e}</li>
                    ))}
                    {state.data.errores.length > 20 && (
                      <li>… y {state.data.errores.length - 20} más</li>
                    )}
                  </ul>
                </div>
              )}
            </div>
          )}
        </AppModal>
      </Dialog>
    </ImportResultContext.Provider>
  );
}
