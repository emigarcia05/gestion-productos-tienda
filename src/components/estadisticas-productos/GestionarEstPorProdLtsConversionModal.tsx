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
  crearEstPorProdLtsConversionAction,
  editarEstPorProdLtsConversionAction,
  eliminarEstPorProdLtsConversionAction,
  listarEstPorProdLtsConversionesAction,
} from "@/actions/estPorProdLtsConversion";
import { matchByMultiTerm } from "@/lib/busqueda";
import type { EstPorProdLtsConversionItem } from "@/lib/estPorProdLtsConversion";
import { etiquetaLitros } from "@/lib/estPorProdLitros";
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
  itemsIniciales: EstPorProdLtsConversionItem[];
  esEditor: boolean;
  /** Tras crear/editar/eliminar: p. ej. `router.refresh()` para recalcular LTS. */
  onCatalogoChanged?: () => void;
}

function formatoConversionInput(n: number): string {
  return etiquetaLitros(n);
}

export default function GestionarEstPorProdLtsConversionModal({
  open,
  onOpenChange,
  itemsIniciales,
  esEditor,
  onCatalogoChanged,
}: Props) {
  const [items, setItems] = useState<EstPorProdLtsConversionItem[]>(itemsIniciales);
  const [loading, setLoading] = useState(false);
  const [busqueda, setBusqueda] = useState("");
  const [formOpen, setFormOpen] = useState(false);
  const [editingItem, setEditingItem] = useState<EstPorProdLtsConversionItem | null>(
    null
  );
  const [formTexto, setFormTexto] = useState("");
  const [formConversion, setFormConversion] = useState("");
  const [pending, setPending] = useState(false);
  const [borrarTarget, setBorrarTarget] = useState<EstPorProdLtsConversionItem | null>(
    null
  );
  const [borrando, setBorrando] = useState(false);

  const cargar = useCallback(async () => {
    setLoading(true);
    try {
      const res: ActionResult<EstPorProdLtsConversionItem[]> =
        await listarEstPorProdLtsConversionesAction();
      if (!res.ok) {
        toast.error(res.error ?? "No se pudieron cargar las conversiones.");
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
    setFormTexto("");
    setFormConversion("");
    setBorrarTarget(null);
    void cargar();
  }, [open, cargar, itemsIniciales]);

  const listaFiltrada = useMemo(() => {
    const q = busqueda.trim();
    if (!q) return items;
    return items.filter((item) =>
      matchByMultiTerm([item.texto, etiquetaLitros(item.conversionLts)], q)
    );
  }, [items, busqueda]);

  function abrirCrear() {
    if (!esEditor || pending) return;
    setEditingItem(null);
    setFormTexto("");
    setFormConversion("");
    setFormOpen(true);
  }

  function abrirEditar(item: EstPorProdLtsConversionItem) {
    if (!esEditor || pending) return;
    setEditingItem(item);
    setFormTexto(item.texto);
    setFormConversion(formatoConversionInput(item.conversionLts));
    setFormOpen(true);
  }

  async function handleGuardarForm() {
    if (!esEditor || !formTexto.trim() || !formConversion.trim() || pending) return;
    setPending(true);
    try {
      if (editingItem) {
        const res = await editarEstPorProdLtsConversionAction({
          id: editingItem.id,
          texto: formTexto,
          conversionLts: formConversion,
        });
        if (!res.ok) {
          toast.error(res.error ?? "No se pudo guardar.");
          return;
        }
        toast.success("Conversión actualizada.");
      } else {
        const res = await crearEstPorProdLtsConversionAction({
          texto: formTexto,
          conversionLts: formConversion,
        });
        if (!res.ok) {
          toast.error(res.error ?? "No se pudo crear.");
          return;
        }
        toast.success("Conversión creada.");
      }
      setFormOpen(false);
      setEditingItem(null);
      setFormTexto("");
      setFormConversion("");
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
      const res = await eliminarEstPorProdLtsConversionAction({ id: borrarTarget.id });
      if (!res.ok) {
        toast.error(res.error ?? "No se pudo eliminar.");
        return;
      }
      toast.success("Conversión eliminada.");
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
          title="Gestion Lts"
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
              Definí un texto (p. ej. «440 CC») y su equivalente en litros (p. ej. 0,4). Se busca
              dentro de la descripción del producto y se muestra en la columna LTS.
            </p>
            <div className="flex items-center gap-2">
              <div className="relative min-w-0 flex-1">
                <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-primary" />
                <Input
                  value={busqueda}
                  onChange={(e) => setBusqueda(e.target.value)}
                  placeholder="Buscar por texto o litros..."
                  className="h-10 pl-9"
                  aria-label="Buscar conversión de litros"
                />
              </div>
              {esEditor ? (
                <Button
                  type="button"
                  variant="default"
                  size="icon"
                  className="h-10 w-10 shrink-0"
                  aria-label="Agregar conversión"
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
                  No hay conversiones. Usá el botón + para agregar la primera (p. ej. 440 CC →
                  0,4).
                </p>
              ) : listaFiltrada.length === 0 ? (
                <p className="text-sm text-muted-foreground">
                  Ninguna conversión coincide con la búsqueda.
                </p>
              ) : (
                <ul className="flex max-h-[50vh] flex-col gap-2 overflow-y-auto pr-1">
                  {listaFiltrada.map((item) => (
                    <li
                      key={item.id}
                      className="flex items-center gap-2 rounded-md border border-border bg-card px-3 py-2"
                    >
                      <div className="min-w-0 flex-1 text-left">
                        <p className="truncate font-medium text-foreground">{item.texto}</p>
                        <p className="text-xs text-muted-foreground">
                          → {etiquetaLitros(item.conversionLts)} LTS
                        </p>
                      </div>
                      {esEditor ? (
                        <div className="ml-auto flex shrink-0 items-center justify-end gap-1.5">
                          <Button
                            type="button"
                            variant="ghost"
                            size="icon"
                            className={LIST_ROW_ICON_BTN_CLASS}
                            aria-label={`Editar ${item.texto}`}
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
                            aria-label={`Eliminar ${item.texto}`}
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
            setFormTexto("");
            setFormConversion("");
          }
        }}
      >
        <AppModal
          title={editingItem ? "Editar Conversion Lts" : "Nueva Conversion Lts"}
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
                  setFormTexto("");
                  setFormConversion("");
                }}
              >
                Cancelar
              </Button>
              <Button
                type="button"
                disabled={pending || !formTexto.trim() || !formConversion.trim()}
                onClick={() => void handleGuardarForm()}
              >
                Guardar
              </Button>
            </div>
          }
        >
          <div className="flex flex-col gap-3">
            <div className="flex flex-col gap-1">
              <ModalMicroLabel>Texto</ModalMicroLabel>
              <Input
                value={formTexto}
                onChange={(e) => setFormTexto(e.target.value)}
                placeholder="Ej. 440 CC (se guarda en mayúsculas)"
                disabled={pending}
                autoFocus
              />
            </div>
            <div className="flex flex-col gap-1">
              <ModalMicroLabel>Conversion Lts</ModalMicroLabel>
              <Input
                value={formConversion}
                onChange={(e) => setFormConversion(e.target.value)}
                placeholder="Ej. 0,4"
                inputMode="decimal"
                disabled={pending}
                onKeyDown={(e) => {
                  if (e.key === "Enter") {
                    e.preventDefault();
                    void handleGuardarForm();
                  }
                }}
              />
            </div>
          </div>
        </AppModal>
      </Dialog>

      <Dialog
        open={Boolean(borrarTarget)}
        onOpenChange={(o) => !o && !borrando && setBorrarTarget(null)}
      >
        <AppModal
          title="Eliminar Conversion Lts"
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
            ¿Eliminar la conversión{" "}
            <span className="font-semibold text-foreground">{borrarTarget?.texto}</span>
            {borrarTarget
              ? ` → ${etiquetaLitros(borrarTarget.conversionLts)} LTS`
              : ""}
            ? Esta acción no se puede deshacer.
          </p>
        </AppModal>
      </Dialog>
    </>
  );
}
