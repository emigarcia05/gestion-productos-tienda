"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { Pencil, Plus, Search, Trash2 } from "lucide-react";
import { toast } from "sonner";
import { Dialog } from "@/components/ui/dialog";
import AppModal from "@/components/shared/AppModal";
import ModalMicroLabel from "@/components/shared/ModalMicroLabel";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  crearEstPorProdTerminacionAction,
  editarEstPorProdTerminacionAction,
  eliminarEstPorProdTerminacionAction,
  listarEstPorProdTerminacionesAction,
} from "@/actions/estPorProdTerminacion";
import { matchByMultiTerm } from "@/lib/busqueda";
import type { EstPorProdTerminacionItem } from "@/lib/estPorProdTerminacion";
import type { ActionResult } from "@/lib/types";
import { TABLE_ROW_ICON_BUTTON_FILLED_BRAND_CLASS } from "@/lib/ui-classes";
import { cn } from "@/lib/utils";

const LIST_ROW_ICON_BTN_CLASS = cn(
  TABLE_ROW_ICON_BUTTON_FILLED_BRAND_CLASS,
  "h-9 w-9 min-h-9 max-h-9"
);

interface Props {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  itemsIniciales: EstPorProdTerminacionItem[];
  esEditor: boolean;
  /** Tras crear/editar/eliminar: p. ej. `router.refresh()` para recalcular terminaciones. */
  onCatalogoChanged?: () => void;
}

export default function GestionarEstPorProdTerminacionModal({
  open,
  onOpenChange,
  itemsIniciales,
  esEditor,
  onCatalogoChanged,
}: Props) {
  const [items, setItems] = useState<EstPorProdTerminacionItem[]>(itemsIniciales);
  const [loading, setLoading] = useState(false);
  const [busqueda, setBusqueda] = useState("");
  const [formOpen, setFormOpen] = useState(false);
  const [editingItem, setEditingItem] = useState<EstPorProdTerminacionItem | null>(
    null
  );
  const [formTerminacion, setFormTerminacion] = useState("");
  const [pending, setPending] = useState(false);
  const [borrarTarget, setBorrarTarget] = useState<EstPorProdTerminacionItem | null>(
    null
  );
  const [borrando, setBorrando] = useState(false);

  const cargar = useCallback(async () => {
    setLoading(true);
    try {
      const res: ActionResult<EstPorProdTerminacionItem[]> =
        await listarEstPorProdTerminacionesAction();
      if (!res.ok) {
        toast.error(res.error ?? "No se pudieron cargar las terminaciones.");
        setItems([]);
        return;
      }
      setItems(res.data);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    if (!open) return;
    setItems(itemsIniciales);
    setBusqueda("");
    setFormOpen(false);
    setEditingItem(null);
    setFormTerminacion("");
    setBorrarTarget(null);
    void cargar();
  }, [open, cargar, itemsIniciales]);

  const listaFiltrada = useMemo(() => {
    const q = busqueda.trim();
    if (!q) return items;
    return items.filter((item) => matchByMultiTerm([item.terminacion], q));
  }, [items, busqueda]);

  function abrirCrear() {
    if (!esEditor || pending) return;
    setEditingItem(null);
    setFormTerminacion("");
    setFormOpen(true);
  }

  function abrirEditar(item: EstPorProdTerminacionItem) {
    if (!esEditor || pending) return;
    setEditingItem(item);
    setFormTerminacion(item.terminacion);
    setFormOpen(true);
  }

  async function handleGuardarForm() {
    if (!esEditor || !formTerminacion.trim() || pending) return;
    setPending(true);
    try {
      if (editingItem) {
        const res = await editarEstPorProdTerminacionAction({
          id: editingItem.id,
          terminacion: formTerminacion,
        });
        if (!res.ok) {
          toast.error(res.error ?? "No se pudo guardar.");
          return;
        }
        toast.success("Terminación actualizada.");
      } else {
        const res = await crearEstPorProdTerminacionAction({
          terminacion: formTerminacion,
        });
        if (!res.ok) {
          toast.error(res.error ?? "No se pudo crear.");
          return;
        }
        toast.success("Terminación creada.");
      }
      setFormOpen(false);
      setEditingItem(null);
      setFormTerminacion("");
      await cargar();
      onCatalogoChanged?.();
    } finally {
      setPending(false);
    }
  }

  async function confirmarBorrar() {
    if (!borrarTarget || borrando) return;
    setBorrando(true);
    try {
      const res = await eliminarEstPorProdTerminacionAction({ id: borrarTarget.id });
      if (!res.ok) {
        toast.error(res.error ?? "No se pudo eliminar.");
        return;
      }
      toast.success("Terminación eliminada.");
      setBorrarTarget(null);
      await cargar();
      onCatalogoChanged?.();
    } finally {
      setBorrando(false);
    }
  }

  return (
    <>
      <Dialog open={open} onOpenChange={(next) => !pending && !borrando && onOpenChange(next)}>
        <AppModal
          title="Gestion Terminacion"
          size="lg"
          className="max-w-xl"
          scrollBody
          hideBodyScrollbars
          actions={
            <Button
              type="button"
              variant="outline"
              disabled={pending}
              onClick={() => onOpenChange(false)}
            >
              Cerrar
            </Button>
          }
        >
          <div className="flex flex-col gap-4">
            <p className="text-xs text-muted-foreground">
              Las terminaciones se guardan en mayúsculas y se buscan dentro de la descripción
              del producto (p. ej. «… LAVABLE BLANCO MATE …» → MATE).
            </p>
            <div className="flex items-center gap-2">
              <div className="relative min-w-0 flex-1">
                <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-primary" />
                <Input
                  value={busqueda}
                  onChange={(e) => setBusqueda(e.target.value)}
                  placeholder="BUSCAR TERMINACIÓN POR NOMBRE..."
                  className="h-10 pl-9"
                  aria-label="Buscar terminación por nombre"
                />
              </div>
              {esEditor ? (
                <Button
                  type="button"
                  variant="default"
                  size="icon"
                  className="h-10 w-10 shrink-0"
                  aria-label="Agregar terminación"
                  disabled={pending}
                  onClick={abrirCrear}
                >
                  <Plus className="h-5 w-5" />
                </Button>
              ) : null}
            </div>

            <div className="min-h-[12rem]">
              {loading ? (
                <p className="text-sm text-muted-foreground">Cargando...</p>
              ) : items.length === 0 ? (
                <p className="text-sm text-muted-foreground">
                  No hay terminaciones. Usá el botón + para agregar la primera (p. ej. MATE,
                  SATINADO).
                </p>
              ) : listaFiltrada.length === 0 ? (
                <p className="text-sm text-muted-foreground">
                  Ninguna terminación coincide con la búsqueda.
                </p>
              ) : (
                <ul className="flex max-h-[50vh] flex-col gap-2 overflow-y-auto pr-1">
                  {listaFiltrada.map((item) => (
                    <li
                      key={item.id}
                      className="flex items-center gap-2 rounded-md border border-border bg-card px-3 py-2"
                    >
                      <p className="min-w-0 flex-1 truncate text-left font-medium text-foreground">
                        {item.terminacion}
                      </p>
                      {esEditor ? (
                        <div className="ml-auto flex shrink-0 items-center justify-end gap-1.5">
                          <Button
                            type="button"
                            variant="ghost"
                            size="icon"
                            className={LIST_ROW_ICON_BTN_CLASS}
                            aria-label={`Editar ${item.terminacion}`}
                            disabled={pending}
                            onClick={() => abrirEditar(item)}
                          >
                            <Pencil className="h-4 w-4" />
                          </Button>
                          <Button
                            type="button"
                            variant="ghost"
                            size="icon"
                            className={LIST_ROW_ICON_BTN_CLASS}
                            aria-label={`Eliminar ${item.terminacion}`}
                            disabled={pending}
                            onClick={() => setBorrarTarget(item)}
                          >
                            <Trash2 className="h-4 w-4" />
                          </Button>
                        </div>
                      ) : null}
                    </li>
                  ))}
                </ul>
              )}
            </div>
          </div>
        </AppModal>
      </Dialog>

      <Dialog
        open={formOpen}
        onOpenChange={(next) => {
          if (pending) return;
          setFormOpen(next);
          if (!next) {
            setEditingItem(null);
            setFormTerminacion("");
          }
        }}
      >
        <AppModal
          title={editingItem ? "Editar Terminacion" : "Nueva Terminacion"}
          size="sm"
          actions={
            <div className="flex w-full justify-end gap-2">
              <Button
                type="button"
                variant="outline"
                disabled={pending}
                onClick={() => {
                  setFormOpen(false);
                  setEditingItem(null);
                  setFormTerminacion("");
                }}
              >
                Cancelar
              </Button>
              <Button
                type="button"
                disabled={pending || !formTerminacion.trim()}
                onClick={() => void handleGuardarForm()}
              >
                Guardar
              </Button>
            </div>
          }
        >
          <div className="flex flex-col gap-1">
            <ModalMicroLabel>Terminacion</ModalMicroLabel>
            <Input
              value={formTerminacion}
              onChange={(e) => setFormTerminacion(e.target.value)}
              placeholder="Ej. MATE (se guardará en mayúsculas)"
              disabled={pending}
              autoFocus
              onKeyDown={(e) => {
                if (e.key === "Enter") {
                  e.preventDefault();
                  void handleGuardarForm();
                }
              }}
            />
          </div>
        </AppModal>
      </Dialog>

      <Dialog
        open={Boolean(borrarTarget)}
        onOpenChange={(o) => !o && !borrando && setBorrarTarget(null)}
      >
        <AppModal
          title="Eliminar Terminacion"
          size="sm"
          actions={
            <div className="flex w-full justify-end gap-2">
              <Button
                type="button"
                variant="outline"
                disabled={borrando}
                onClick={() => setBorrarTarget(null)}
              >
                Cancelar
              </Button>
              <Button
                type="button"
                variant="destructive"
                disabled={borrando}
                onClick={() => void confirmarBorrar()}
              >
                Eliminar
              </Button>
            </div>
          }
        >
          <p className="text-sm text-muted-foreground">
            ¿Eliminar la terminación{" "}
            <span className="font-semibold text-foreground">
              {borrarTarget?.terminacion}
            </span>
            ? Esta acción no se puede deshacer.
          </p>
        </AppModal>
      </Dialog>
    </>
  );
}
