"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { Plus, Trash2 } from "lucide-react";
import { toast } from "sonner";
import { Dialog } from "@/components/ui/dialog";
import AppModal from "@/components/shared/AppModal";
import ModalMicroLabel from "@/components/shared/ModalMicroLabel";
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

  function cambiarMax(index: number, raw: string) {
    const digits = raw.replace(/\D/g, "");
    if (digits === "") return;
    const n = Number(digits);
    if (!Number.isFinite(n)) return;
    setFilas((prev) => actualizarMaxCategoriaMc(prev, index, n));
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
          <p className="text-sm text-muted-foreground">
            Definí rangos continuos de M.C. de 0 a 100. El mínimo de cada fila
            es el máximo de la anterior. Con máximo en 100 no se pueden agregar
            más categorías.
          </p>

          <div className="grid grid-cols-[minmax(0,1fr)_4.5rem_4.5rem_2.5rem] items-end gap-2 px-0.5">
            <ModalMicroLabel>CATEGORÍA</ModalMicroLabel>
            <ModalMicroLabel align="center">MÍN.</ModalMicroLabel>
            <ModalMicroLabel align="center">MÁX.</ModalMicroLabel>
            <span className="sr-only">Acciones</span>
          </div>

          <div className="flex flex-col gap-2">
            {filas.map((fila, index) => (
              <div
                key={fila.key}
                className="grid grid-cols-[minmax(0,1fr)_4.5rem_4.5rem_2.5rem] items-center gap-2"
              >
                <Input
                  value={fila.categoria}
                  onChange={(e) => cambiarNombre(fila.key, e.target.value)}
                  placeholder="CATEGORÍA"
                  disabled={!esEditor || bloqueado}
                  className="h-9 uppercase"
                  aria-label={`Categoría fila ${index + 1}`}
                />
                <Input
                  value={String(fila.desdePct)}
                  readOnly
                  tabIndex={-1}
                  className="h-9 text-center tabular-nums"
                  aria-label={`Mínimo fila ${index + 1}`}
                />
                <Input
                  value={String(fila.hastaPct)}
                  onChange={(e) => cambiarMax(index, e.target.value)}
                  disabled={!esEditor || bloqueado}
                  inputMode="numeric"
                  className="h-9 text-center tabular-nums"
                  aria-label={`Máximo fila ${index + 1}`}
                />
                <div className="flex items-center justify-center">
                  {esEditor && index === filas.length - 1 && filas.length > 1 ? (
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
                      <Trash2 className={TABLE_ROW_ACTION_ICON_CLASS} aria-hidden />
                    </Button>
                  ) : null}
                </div>
              </div>
            ))}
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
