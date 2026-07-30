"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { toast } from "sonner";
import { Dialog } from "@/components/ui/dialog";
import AppModal from "@/components/shared/AppModal";
import ModalMicroLabel from "@/components/shared/ModalMicroLabel";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  guardarProdIaDisenoPrompVarsAction,
  listarProdIaDisenoPrompVarsAction,
} from "@/actions/prodIaDisenoPrompVar";
import {
  fuentesPromptParaModulo,
  moduloVariableDesdeSubmodulo,
  normalizarNombreVariablePrompt,
  tokenVariablePrompt,
  type ProdIaDisenoPrompVarItem,
} from "@/lib/asistenteIa";
import type { ActionResult } from "@/lib/types";

interface Props {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  prompId: string;
  submodulo: string;
  esEditor: boolean;
  onSaved?: (items: ProdIaDisenoPrompVarItem[]) => void;
}

type FilaVar = {
  fuente: string;
  etiqueta: string;
  descripcion: string;
  variable: string;
};

export default function GestionarProdIaDisenoPrompVarsModal({
  open,
  onOpenChange,
  prompId,
  submodulo,
  esEditor,
  onSaved,
}: Props) {
  const modulo = useMemo(
    () => moduloVariableDesdeSubmodulo(submodulo),
    [submodulo],
  );
  const fuentes = useMemo(() => fuentesPromptParaModulo(modulo), [modulo]);

  const [filas, setFilas] = useState<FilaVar[]>([]);
  const [loading, setLoading] = useState(false);
  const [pending, setPending] = useState(false);

  const cargar = useCallback(async () => {
    setLoading(true);
    try {
      const res: ActionResult<ProdIaDisenoPrompVarItem[]> =
        await listarProdIaDisenoPrompVarsAction({ prompId });
      if (!res.ok) {
        toast.error(res.error ?? "No se pudieron cargar las variables.");
        setFilas(
          fuentes.map((f) => ({
            fuente: f.clave,
            etiqueta: f.etiqueta,
            descripcion: f.descripcion,
            variable: f.clave,
          })),
        );
        return;
      }
      const byFuente = new Map(res.data.map((g) => [g.fuente, g.variable]));
      setFilas(
        fuentes.map((f) => ({
          fuente: f.clave,
          etiqueta: f.etiqueta,
          descripcion: f.descripcion,
          variable: byFuente.get(f.clave) ?? f.clave,
        })),
      );
    } finally {
      setLoading(false);
    }
  }, [prompId, fuentes]);

  useEffect(() => {
    if (!open) return;
    void cargar();
  }, [open, cargar]);

  function setVariable(fuente: string, value: string) {
    setFilas((prev) =>
      prev.map((f) =>
        f.fuente === fuente
          ? { ...f, variable: value.toUpperCase().replace(/\s+/g, "_") }
          : f,
      ),
    );
  }

  async function handleGuardar() {
    if (!esEditor || pending) return;
    const items = filas.map((f) => ({
      fuente: f.fuente,
      variable: normalizarNombreVariablePrompt(f.variable),
    }));
    if (items.some((i) => !i.variable)) {
      toast.error("Nombres Inválidos", {
        description: "Cada variable debe tener un nombre en MAYÚSCULA válido.",
      });
      return;
    }
    const nombres = items.map((i) => i.variable);
    if (new Set(nombres).size !== nombres.length) {
      toast.error("Nombres Duplicados", {
        description: "Cada variable debe tener un nombre distinto.",
      });
      return;
    }

    setPending(true);
    try {
      const res = await guardarProdIaDisenoPrompVarsAction({
        prompId,
        items,
      });
      if (!res.ok) {
        toast.error(res.error ?? "No se pudo guardar.");
        return;
      }
      toast.success("Variables Guardadas");
      onSaved?.(res.data);
      onOpenChange(false);
    } finally {
      setPending(false);
    }
  }

  return (
    <Dialog
      open={open}
      onOpenChange={(next) => {
        if (pending) return;
        onOpenChange(next);
      }}
    >
      <AppModal
        title="Gestionar Variables"
        size="lg"
        className="max-w-2xl"
        scrollBody
        actions={
          <>
            <Button
              type="button"
              variant="outline"
              disabled={pending}
              onClick={() => onOpenChange(false)}
            >
              Cerrar
            </Button>
            {esEditor ? (
              <Button
                type="button"
                disabled={pending || loading || filas.length === 0}
                onClick={() => void handleGuardar()}
              >
                Guardar
              </Button>
            ) : null}
          </>
        }
      >
        <div className="flex flex-col gap-3">
          <p className="text-sm text-muted-foreground">
            Fuentes que la app puede inyectar en este módulo. Asigná el nombre
            de variable en MAYÚSCULA (se inserta como{" "}
            <span className="font-mono text-foreground">{"{{NOMBRE}}"}</span>).
          </p>
          {loading ? (
            <p className="text-sm text-muted-foreground">Cargando...</p>
          ) : filas.length === 0 ? (
            <p className="text-sm text-muted-foreground">
              Este submódulo no tiene fuentes de variable configuradas.
            </p>
          ) : (
            <ul className="flex flex-col gap-3">
              {filas.map((fila) => (
                <li
                  key={fila.fuente}
                  className="rounded-lg border border-border bg-muted/30 p-3"
                >
                  <div className="flex items-end gap-3">
                    <div className="min-w-0 flex-1">
                      <p className="text-sm font-semibold text-foreground">
                        {fila.etiqueta}
                      </p>
                      <p className="text-xs text-muted-foreground">
                        {fila.descripcion}
                      </p>
                      <p className="mt-1 font-mono text-xs text-muted-foreground">
                        Fuente: {fila.fuente}
                      </p>
                    </div>
                    <div className="flex w-56 shrink-0 flex-col gap-1">
                      <ModalMicroLabel>Variable</ModalMicroLabel>
                      <Input
                        value={fila.variable}
                        onChange={(e) =>
                          setVariable(fila.fuente, e.target.value)
                        }
                        className="h-10 font-mono uppercase"
                        disabled={pending || !esEditor}
                        aria-label={`Variable para ${fila.etiqueta}`}
                      />
                      <p className="font-mono text-xs text-muted-foreground">
                        {tokenVariablePrompt(
                          normalizarNombreVariablePrompt(fila.variable) ||
                            "…",
                        )}
                      </p>
                    </div>
                  </div>
                </li>
              ))}
            </ul>
          )}
        </div>
      </AppModal>
    </Dialog>
  );
}
