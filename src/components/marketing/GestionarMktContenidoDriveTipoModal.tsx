"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { Pencil, Plus, Search, Trash2 } from "lucide-react";
import { toast } from "sonner";
import { Dialog } from "@/components/ui/dialog";
import AppModal from "@/components/shared/AppModal";
import ModalMicroLabel from "@/components/shared/ModalMicroLabel";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { matchByMultiTerm } from "@/lib/busqueda";
import type { ActionResult } from "@/lib/types";
import type { MktContenidoDriveTipoItem } from "@/lib/mktContenidoUrlDrive";
import {
  crearMktContenidoDriveTipoAction,
  editarMktContenidoDriveTipoAction,
  eliminarMktContenidoDriveTipoAction,
  listarMktContenidoDriveTiposAction,
} from "@/actions/mktContenidoDriveTipo";
import { TABLE_ROW_ICON_BUTTON_FILLED_BRAND_CLASS } from "@/lib/ui-classes";
import { cn } from "@/lib/utils";

const LIST_ROW_ICON_BTN_CLASS = cn(
  TABLE_ROW_ICON_BUTTON_FILLED_BRAND_CLASS,
  "h-9 w-9 min-h-9 max-h-9"
);

interface Props {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  itemsIniciales: MktContenidoDriveTipoItem[];
  esEditor: boolean;
  onCatalogoChanged?: () => void;
}

export default function GestionarMktContenidoDriveTipoModal({
  open,
  onOpenChange,
  itemsIniciales,
  esEditor,
  onCatalogoChanged,
}: Props) {
  const [items, setItems] = useState<MktContenidoDriveTipoItem[]>(itemsIniciales);
  const [loading, setLoading] = useState(false);
  const [busqueda, setBusqueda] = useState("");
  const [formOpen, setFormOpen] = useState(false);
  const [editingItem, setEditingItem] = useState<MktContenidoDriveTipoItem | null>(null);
  const [formTipo, setFormTipo] = useState("");
  const [pending, setPending] = useState(false);
  const [borrarTarget, setBorrarTarget] = useState<MktContenidoDriveTipoItem | null>(null);
  const [borrando, setBorrando] = useState(false);

  const cargar = useCallback(async () => {
    setLoading(true);
    try {
      const res: ActionResult<MktContenidoDriveTipoItem[]> =
        await listarMktContenidoDriveTiposAction();
      if (!res.ok) {
        toast.error(res.error ?? "No se pudieron cargar los tipos.");
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
    setFormTipo("");
    setBorrarTarget(null);
    void cargar();
  }, [open, cargar, itemsIniciales]);

  const listaFiltrada = useMemo(() => {
    const q = busqueda.trim();
    if (!q) return items;
    return items.filter((item) => matchByMultiTerm([item.tipo], q));
  }, [items, busqueda]);

  function abrirCrear() {
    if (!esEditor || pending) return;
    setEditingItem(null);
    setFormTipo("");
    setFormOpen(true);
  }

  function abrirEditar(item: MktContenidoDriveTipoItem) {
    if (!esEditor || pending) return;
    setEditingItem(item);
    setFormTipo(item.tipo);
    setFormOpen(true);
  }

  async function handleGuardarForm() {
    if (!esEditor || !formTipo.trim() || pending) return;
    setPending(true);
    try {
      if (editingItem) {
        const res = await editarMktContenidoDriveTipoAction({
          id: editingItem.id,
          tipo: formTipo,
        });
        if (!res.ok) {
          toast.error(res.error ?? "No se pudo guardar.");
          return;
        }
        toast.success("Tipo actualizado.");
      } else {
        const res = await crearMktContenidoDriveTipoAction({ tipo: formTipo });
        if (!res.ok) {
          toast.error(res.error ?? "No se pudo crear.");
          return;
        }
        toast.success("Tipo creado.");
      }
      setFormOpen(false);
      setEditingItem(null);
      setFormTipo("");
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
      const res = await eliminarMktContenidoDriveTipoAction({ id: borrarTarget.id });
      if (!res.ok) {
        toast.error(res.error ?? "No se pudo eliminar.");
        return;
      }
      toast.success("Tipo eliminado.");
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
          title="Gestionar Tipos De Contenido"
          size="lg"
          className="max-w-xl"
          scrollBody
          hideBodyScrollbars
          actions={
            <Button type="button" variant="outline" disabled={pending} onClick={() => onOpenChange(false)}>
              Cerrar
            </Button>
          }
        >
          <div className="flex flex-col gap-4">
            <div className="flex items-center gap-2">
              <div className="relative min-w-0 flex-1">
                <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-primary" />
                <Input
                  value={busqueda}
                  onChange={(e) => setBusqueda(e.target.value)}
                  placeholder="BUSCAR TIPO..."
                  className="h-10 pl-9"
                  aria-label="Buscar tipo de contenido"
                />
              </div>
              {esEditor ? (
                <Button
                  type="button"
                  variant="default"
                  size="icon"
                  className="h-10 w-10 shrink-0"
                  aria-label="Agregar tipo"
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
                  No hay tipos. Usá el botón + para agregar el primero.
                </p>
              ) : listaFiltrada.length === 0 ? (
                <p className="text-sm text-muted-foreground">Ningún tipo coincide con la búsqueda.</p>
              ) : (
                <ul className="flex max-h-[50vh] flex-col gap-2 overflow-y-auto pr-1">
                  {listaFiltrada.map((item) => (
                    <li
                      key={item.id}
                      className="flex items-center gap-2 rounded-md border border-border bg-card px-3 py-2"
                    >
                      <p className="min-w-0 flex-1 truncate text-left font-medium text-foreground">
                        {item.tipo}
                      </p>
                      {esEditor ? (
                        <div className="ml-auto flex shrink-0 items-center justify-end gap-1.5">
                          <Button
                            type="button"
                            variant="ghost"
                            size="icon"
                            className={LIST_ROW_ICON_BTN_CLASS}
                            aria-label={`Editar ${item.tipo}`}
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
                            aria-label={`Eliminar ${item.tipo}`}
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
            setFormTipo("");
          }
        }}
      >
        <AppModal
          title={editingItem ? "Editar Tipo" : "Nuevo Tipo"}
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
                  setFormTipo("");
                }}
              >
                Cancelar
              </Button>
              <Button
                type="button"
                disabled={pending || !formTipo.trim()}
                onClick={() => void handleGuardarForm()}
              >
                Guardar
              </Button>
            </div>
          }
        >
          <div className="flex flex-col gap-1">
            <ModalMicroLabel>Tipo</ModalMicroLabel>
            <Input
              value={formTipo}
              onChange={(e) => setFormTipo(e.target.value.toLocaleUpperCase("es-AR"))}
              placeholder="TIPO (se guardará en mayúsculas)"
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

      <Dialog open={Boolean(borrarTarget)} onOpenChange={(o) => !o && !borrando && setBorrarTarget(null)}>
        <AppModal
          title="Eliminar Tipo"
          size="sm"
          actions={
            <div className="flex w-full justify-end gap-2">
              <Button type="button" variant="outline" disabled={borrando} onClick={() => setBorrarTarget(null)}>
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
            ¿Eliminar el tipo{" "}
            <span className="font-semibold text-foreground">{borrarTarget?.tipo}</span>? Esta acción no se
            puede deshacer.
          </p>
        </AppModal>
      </Dialog>
    </>
  );
}
