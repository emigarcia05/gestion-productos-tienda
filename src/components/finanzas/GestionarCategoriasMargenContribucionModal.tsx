"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { Plus, Trash2 } from "lucide-react";
import { toast } from "sonner";
import { Dialog } from "@/components/ui/dialog";
import AppModal from "@/components/shared/AppModal";
import ModalMicroLabel from "@/components/shared/ModalMicroLabel";
import PorcentajeEnteroMaskInput from "@/components/shared/PorcentajeEnteroMaskInput";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  listarFinAnaMcCategoriasAction,
  reemplazarFinAnaMcCategoriasAction,
} from "@/actions/finAnaMargenContribucion";
import {
  agregarCategoriaMc,
  actualizarMaxCategoriaMc,
  borradoresDesdeCategoriasMc,
  FIN_ANA_MC_CATEGORIA_PCT_MAX,
  puedeAgregarCategoriaMc,
  quitarUltimaCategoriaMc,
  validarContinuidadRangosMcCategorias,
  type BorradorCategoriaMc,
  type FinAnaMcCategoriaItem,
} from "@/lib/finAnaMcCategorias";
import {
  TABLE_ROW_ACTION_ICON_CLASS,
  TABLE_ROW_ICON_BUTTON_FILLED_BRAND_CLASS,
} from "@/lib/ui-classes";
import { cn } from "@/lib/utils";

interface Props {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  esEditor: boolean;
}

const BOTON_ICONO_CLASS = cn(
  TABLE_ROW_ICON_BUTTON_FILLED_BRAND_CLASS,
  "!size-8 max-h-8 min-h-8 min-w-8 shrink-0 !p-0"
);

const MASCARA_PCT_CLASS =
  "input-mascara-sufijo flex h-9 w-full min-w-0 items-center rounded-md border border-primary bg-transparent";

function PctEnteroSoloLectura({
  value,
  ariaLabel,
}: {
  value: number;
  ariaLabel: string;
}) {
  return (
    <div className={MASCARA_PCT_CLASS}>
      <input
        type="text"
        data-slot="input"
        readOnly
        tabIndex={-1}
        value={String(value)}
        aria-label={ariaLabel}
        className={cn(
          "min-h-0 min-w-0 flex-1 cursor-default border-0 bg-transparent px-1 py-0",
          "text-center text-sm tabular-nums shadow-none outline-none",
          "focus-visible:ring-0 focus-visible:outline-none"
        )}
      />
      <span
        className="input-mascara-sufijo__pct pointer-events-none select-none px-1.5 text-xs text-muted-foreground tabular-nums"
        aria-hidden
      >
        %
      </span>
    </div>
  );
}

export default function GestionarCategoriasMargenContribucionModal({
  open,
  onOpenChange,
  esEditor,
}: Props) {
  const [filas, setFilas] = useState<BorradorCategoriaMc[]>([]);
  const [cargando, setCargando] = useState(false);
  const [guardando, setGuardando] = useState(false);

  const cargar = useCallback(async () => {
    setCargando(true);
    try {
      const res = await listarFinAnaMcCategoriasAction();
      if (!res.ok) {
        toast.error(res.error ?? "No se pudieron cargar las categorías.");
        setFilas(borradoresDesdeCategoriasMc([]));
        return;
      }
      setFilas(borradoresDesdeCategoriasMc(res.data));
    } finally {
      setCargando(false);
    }
  }, []);

  useEffect(() => {
    if (!open) return;
    void cargar();
  }, [open, cargar]);

  const puedeAgregar = useMemo(() => puedeAgregarCategoriaMc(filas), [filas]);
  const bloqueado = cargando || guardando;

  function cambiarNombre(key: string, categoria: string) {
    setFilas((prev) =>
      prev.map((fila) => (fila.key === key ? { ...fila, categoria } : fila))
    );
  }

  function cambiarMax(index: number, next: number) {
    const entero = Math.trunc(next);
    if (!Number.isFinite(entero)) return;
    setFilas((prev) => actualizarMaxCategoriaMc(prev, index, entero));
  }

  function handleAgregar() {
    if (!esEditor || !puedeAgregar || bloqueado) return;
    setFilas((prev) => agregarCategoriaMc(prev));
  }

  function handleQuitarUltima() {
    if (!esEditor || filas.length <= 1 || bloqueado) return;
    setFilas((prev) => quitarUltimaCategoriaMc(prev));
  }

  async function handleGuardar() {
    if (!esEditor || bloqueado) return;

    const payload = filas.map((fila) => ({
      categoria: fila.categoria,
      desdePct: fila.desdePct,
      hastaPct: fila.hastaPct,
    }));
    const errorLocal = validarContinuidadRangosMcCategorias(payload);
    if (errorLocal) {
      toast.error(errorLocal);
      return;
    }

    setGuardando(true);
    try {
      const res = await reemplazarFinAnaMcCategoriasAction({
        categorias: payload,
      });
      if (!res.ok) {
        toast.error(res.error ?? "No se pudieron guardar las categorías.");
        return;
      }
      toast.success("Categorías de M.C. guardadas.");
      setFilas(borradoresDesdeCategoriasMc(res.data as FinAnaMcCategoriaItem[]));
      onOpenChange(false);
    } finally {
      setGuardando(false);
    }
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <AppModal
        title="Gestionar Cat. M.C."
        size="md"
        actions={
          <div className="flex w-full items-center justify-end gap-2">
            <Button
              type="button"
              variant="outline"
              onClick={() => onOpenChange(false)}
              disabled={guardando}
            >
              Cerrar
            </Button>
            {esEditor ? (
              <Button
                type="button"
                onClick={() => void handleGuardar()}
                disabled={bloqueado || filas.length === 0}
              >
                {guardando ? "Guardando…" : "Guardar"}
              </Button>
            ) : null}
          </div>
        }
      >
        <div className="flex flex-col gap-3">
          <div className="grid grid-cols-[minmax(0,1fr)_5.5rem_5.5rem_2.5rem] items-end gap-2 px-0.5">
            <ModalMicroLabel>CATEGORÍA</ModalMicroLabel>
            <ModalMicroLabel align="center">MÍN.</ModalMicroLabel>
            <ModalMicroLabel align="center">MÁX.</ModalMicroLabel>
            <span className="sr-only">Acciones</span>
          </div>

          <div className="flex flex-col gap-2">
            {filas.map((fila, index) => {
              const maxMinimo = fila.desdePct + 1;
              return (
                <div
                  key={fila.key}
                  className="grid grid-cols-[minmax(0,1fr)_5.5rem_5.5rem_2.5rem] items-center gap-2"
                >
                  <Input
                    value={fila.categoria}
                    onChange={(e) => cambiarNombre(fila.key, e.target.value)}
                    placeholder="CATEGORÍA"
                    disabled={!esEditor || bloqueado}
                    className="h-9 uppercase"
                    aria-label={`Categoría fila ${index + 1}`}
                  />
                  <PctEnteroSoloLectura
                    value={fila.desdePct}
                    ariaLabel={`Mínimo fila ${index + 1}`}
                  />
                  <PorcentajeEnteroMaskInput
                    value={fila.hastaPct}
                    onValueChange={(next) => cambiarMax(index, next)}
                    min={maxMinimo}
                    max={FIN_ANA_MC_CATEGORIA_PCT_MAX}
                    disabled={
                      !esEditor ||
                      bloqueado ||
                      maxMinimo > FIN_ANA_MC_CATEGORIA_PCT_MAX
                    }
                    aria-label={`Máximo fila ${index + 1}`}
                    className={MASCARA_PCT_CLASS}
                  />
                  <div className="flex items-center justify-center">
                    {esEditor &&
                    index === filas.length - 1 &&
                    filas.length > 1 ? (
                      <Button
                        type="button"
                        variant="ghost"
                        size="icon"
                        className={BOTON_ICONO_CLASS}
                        disabled={bloqueado}
                        onClick={handleQuitarUltima}
                        aria-label="Quitar última categoría"
                        title="Quitar última"
                      >
                        <Trash2
                          className={TABLE_ROW_ACTION_ICON_CLASS}
                          aria-hidden
                        />
                      </Button>
                    ) : null}
                  </div>
                </div>
              );
            })}
          </div>

          {esEditor ? (
            <div className="flex justify-center pt-1">
              <Button
                type="button"
                variant="outline"
                size="sm"
                className="gap-1.5"
                disabled={!puedeAgregar || bloqueado}
                onClick={handleAgregar}
                title={
                  puedeAgregar
                    ? "Agregar categoría"
                    : "El máximo ya llegó a 100"
                }
              >
                <Plus className="size-4" aria-hidden />
                Agregar
              </Button>
            </div>
          ) : null}
        </div>
      </AppModal>
    </Dialog>
  );
}
