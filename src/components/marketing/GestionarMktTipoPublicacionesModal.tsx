"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { Check, ChevronDown, Pencil, Plus, Search, Trash2, X } from "lucide-react";
import { toast } from "sonner";
import { Dialog } from "@/components/ui/dialog";
import AppModal from "@/components/shared/AppModal";
import ModalMicroLabel from "@/components/shared/ModalMicroLabel";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { matchByMultiTerm } from "@/lib/busqueda";
import type { ActionResult } from "@/lib/types";
import type {
  MktCatalogoNombreItem,
  MktPublicacionTipoItem,
} from "@/lib/mktPublicacionesCatalogo";
import { TABLE_ROW_ICON_BUTTON_FILLED_BRAND_CLASS } from "@/lib/ui-classes";
import { cn } from "@/lib/utils";
import {
  crearMktPublicacionTipoAction,
  editarMktPublicacionTipoAction,
  eliminarMktPublicacionTipoAction,
  listarMktPublicacionContenidosAction,
  listarMktPublicacionTiposAction,
} from "@/actions/mktPublicacionesCatalogo";

const LIST_ROW_ICON_BTN_CLASS = cn(
  TABLE_ROW_ICON_BUTTON_FILLED_BRAND_CLASS,
  "h-9 w-9 min-h-9 max-h-9"
);

function ControlesContenidoPermitidos({
  contenidos,
  selectedIds,
  onChange,
  disabled,
  listOpen,
  onListOpenChange,
}: {
  contenidos: MktCatalogoNombreItem[];
  selectedIds: string[];
  onChange: (ids: string[]) => void;
  disabled?: boolean;
  listOpen: boolean;
  onListOpenChange: (open: boolean) => void;
}) {
  const selectedSet = useMemo(() => new Set(selectedIds), [selectedIds]);
  const selectedItems = useMemo(
    () => contenidos.filter((c) => selectedSet.has(c.id)),
    [contenidos, selectedSet]
  );

  function toggle(id: string) {
    if (disabled) return;
    if (selectedSet.has(id)) {
      onChange(selectedIds.filter((x) => x !== id));
      return;
    }
    onChange([...selectedIds, id]);
  }

  return (
    <div className="flex flex-col gap-2">
      <ModalMicroLabel>Contenidos Permitidos</ModalMicroLabel>
      <div className="flex min-h-8 flex-wrap gap-1.5">
        {selectedItems.length === 0 ? (
          <span className="text-xs text-muted-foreground">Ninguno seleccionado.</span>
        ) : (
          selectedItems.map((item) => (
            <Badge key={item.id} variant="secondary" className="gap-1 pr-1 font-medium tracking-wide">
              {item.nombre}
              {!disabled ? (
                <button
                  type="button"
                  className="rounded-sm p-0.5 hover:bg-muted"
                  aria-label={`Quitar ${item.nombre}`}
                  onClick={() => toggle(item.id)}
                >
                  <X className="size-3" aria-hidden />
                </button>
              ) : null}
            </Badge>
          ))
        )}
      </div>
      <Button
        type="button"
        variant="outline"
        className="h-9 justify-between gap-2"
        disabled={disabled || contenidos.length === 0}
        aria-expanded={listOpen}
        onClick={() => onListOpenChange(!listOpen)}
      >
        <span className="truncate text-sm">
          {contenidos.length === 0
            ? "No hay tipos de contenido. Creá uno primero."
            : "Seleccionar tipos de contenido"}
        </span>
        <ChevronDown
          className={cn("size-4 shrink-0 transition-transform", listOpen && "rotate-180")}
          aria-hidden
        />
      </Button>
      {listOpen && contenidos.length > 0 ? (
        <ul
          className="max-h-40 space-y-0.5 overflow-y-auto rounded-md border border-border bg-background p-1"
          role="listbox"
          aria-multiselectable
        >
          {contenidos.map((item) => {
            const checked = selectedSet.has(item.id);
            return (
              <li key={item.id}>
                <button
                  type="button"
                  role="option"
                  aria-selected={checked}
                  disabled={disabled}
                  className={cn(
                    "flex w-full items-center gap-2 rounded-sm px-2 py-1.5 text-left text-sm hover:bg-muted/60",
                    checked && "bg-primary/8 font-medium"
                  )}
                  onClick={() => toggle(item.id)}
                >
                  <span
                    className={cn(
                      "flex size-4 shrink-0 items-center justify-center rounded-sm border border-border",
                      checked && "border-primary bg-primary text-primary-foreground"
                    )}
                    aria-hidden
                  >
                    {checked ? <Check className="size-3" /> : null}
                  </span>
                  <span className="min-w-0 truncate">{item.nombre}</span>
                </button>
              </li>
            );
          })}
        </ul>
      ) : null}
    </div>
  );
}

interface Props {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  itemsIniciales: MktPublicacionTipoItem[];
  contenidosIniciales: MktCatalogoNombreItem[];
  esEditor: boolean;
  onCatalogoChanged?: () => void;
}

export default function GestionarMktTipoPublicacionesModal({
  open,
  onOpenChange,
  itemsIniciales,
  contenidosIniciales,
  esEditor,
  onCatalogoChanged,
}: Props) {
  const [items, setItems] = useState<MktPublicacionTipoItem[]>(itemsIniciales);
  const [contenidos, setContenidos] = useState<MktCatalogoNombreItem[]>(contenidosIniciales);
  const [loading, setLoading] = useState(false);
  const [busqueda, setBusqueda] = useState("");
  const [formOpen, setFormOpen] = useState(false);
  const [editingItem, setEditingItem] = useState<MktPublicacionTipoItem | null>(null);
  const [formNombre, setFormNombre] = useState("");
  const [formContenidoIds, setFormContenidoIds] = useState<string[]>([]);
  const [formListOpen, setFormListOpen] = useState(false);
  const [pending, setPending] = useState(false);
  const [borrarTarget, setBorrarTarget] = useState<MktPublicacionTipoItem | null>(null);
  const [borrando, setBorrando] = useState(false);

  const contenidoById = useMemo(() => {
    const map = new Map<string, string>();
    for (const c of contenidos) map.set(c.id, c.nombre);
    return map;
  }, [contenidos]);

  const cargar = useCallback(async () => {
    setLoading(true);
    try {
      const [tiposRes, contenidosRes]: [
        ActionResult<MktPublicacionTipoItem[]>,
        ActionResult<MktCatalogoNombreItem[]>,
      ] = await Promise.all([listarMktPublicacionTiposAction(), listarMktPublicacionContenidosAction()]);
      if (!tiposRes.ok) {
        toast.error(tiposRes.error ?? "No se pudieron cargar los tipos.");
        setItems([]);
      } else {
        setItems(tiposRes.data);
      }
      if (!contenidosRes.ok) {
        toast.error(contenidosRes.error ?? "No se pudieron cargar los contenidos.");
        setContenidos([]);
      } else {
        setContenidos(contenidosRes.data);
      }
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    if (!open) return;
    setItems(itemsIniciales);
    setContenidos(contenidosIniciales);
    setBusqueda("");
    setFormOpen(false);
    setEditingItem(null);
    setFormNombre("");
    setFormContenidoIds([]);
    setFormListOpen(false);
    setBorrarTarget(null);
    void cargar();
  }, [open, cargar, itemsIniciales, contenidosIniciales]);

  const listaFiltrada = useMemo(() => {
    const q = busqueda.trim();
    if (!q) return items;
    return items.filter((item) => {
      const nombresContenido = item.contenidoIdsPermitidos
        .map((id) => contenidoById.get(id) ?? "")
        .filter(Boolean);
      return matchByMultiTerm([item.nombre, ...nombresContenido], q);
    });
  }, [items, busqueda, contenidoById]);

  function abrirCrear() {
    if (!esEditor || pending) return;
    setEditingItem(null);
    setFormNombre("");
    setFormContenidoIds([]);
    setFormListOpen(false);
    setFormOpen(true);
  }

  function abrirEditar(item: MktPublicacionTipoItem) {
    if (!esEditor || pending) return;
    setEditingItem(item);
    setFormNombre(item.nombre);
    setFormContenidoIds([...item.contenidoIdsPermitidos]);
    setFormListOpen(false);
    setFormOpen(true);
  }

  async function handleGuardarForm() {
    if (!esEditor || !formNombre.trim() || pending) return;
    setPending(true);
    try {
      if (editingItem) {
        const res = await editarMktPublicacionTipoAction({
          id: editingItem.id,
          nombre: formNombre,
          contenidoIdsPermitidos: formContenidoIds,
        });
        if (!res.ok) {
          toast.error(res.error ?? "No se pudo guardar.");
          return;
        }
        toast.success("Tipo de publicación actualizado.");
      } else {
        const res = await crearMktPublicacionTipoAction({
          nombre: formNombre,
          contenidoIdsPermitidos: formContenidoIds,
        });
        if (!res.ok) {
          toast.error(res.error ?? "No se pudo crear.");
          return;
        }
        toast.success("Tipo de publicación creado.");
      }
      setFormOpen(false);
      setEditingItem(null);
      setFormNombre("");
      setFormContenidoIds([]);
      setFormListOpen(false);
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
      const res = await eliminarMktPublicacionTipoAction({ id: borrarTarget.id });
      if (!res.ok) {
        toast.error(res.error ?? "No se pudo eliminar.");
        return;
      }
      toast.success("Tipo de publicación eliminado.");
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
          title="Gestionar Tipo Publicaciones"
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
                  placeholder="Buscar tipo de publicación por nombre..."
                  className="h-10 pl-9"
                  aria-label="Buscar tipo de publicación por nombre"
                />
              </div>
              {esEditor ? (
                <Button
                  type="button"
                  variant="default"
                  size="icon"
                  className="h-10 w-10 shrink-0"
                  aria-label="Agregar tipo de publicación"
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
                  No hay tipos de publicación. Usá el botón + para agregar el primero.
                </p>
              ) : listaFiltrada.length === 0 ? (
                <p className="text-sm text-muted-foreground">
                  Ningún tipo de publicación coincide con la búsqueda.
                </p>
              ) : (
                <ul className="flex max-h-[50vh] flex-col gap-2 overflow-y-auto pr-1">
                  {listaFiltrada.map((item) => (
                    <li
                      key={item.id}
                      className="flex items-center gap-2 rounded-md border border-border bg-card px-3 py-2"
                    >
                      <div className="min-w-0 flex-1 space-y-1.5">
                        <p className="truncate text-left font-medium text-foreground">{item.nombre}</p>
                        <div className="flex flex-wrap gap-1">
                          {item.contenidoIdsPermitidos.length === 0 ? (
                            <span className="text-xs text-muted-foreground">Sin contenidos permitidos.</span>
                          ) : (
                            item.contenidoIdsPermitidos.map((id) => {
                              const nombre = contenidoById.get(id);
                              if (!nombre) return null;
                              return (
                                <Badge key={id} variant="secondary" className="font-medium tracking-wide">
                                  {nombre}
                                </Badge>
                              );
                            })
                          )}
                        </div>
                      </div>
                      {esEditor ? (
                        <div className="ml-auto flex shrink-0 items-center justify-end gap-1.5 self-start">
                          <Button
                            type="button"
                            variant="ghost"
                            size="icon"
                            className={LIST_ROW_ICON_BTN_CLASS}
                            aria-label={`Editar ${item.nombre}`}
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
                            aria-label={`Eliminar ${item.nombre}`}
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
            setFormNombre("");
            setFormContenidoIds([]);
            setFormListOpen(false);
          }
        }}
      >
        <AppModal
          title={editingItem ? "Editar Tipo De Publicación" : "Nuevo Tipo De Publicación"}
          size="md"
          className="max-w-lg"
          scrollBody
          hideBodyScrollbars
          actions={
            <div className="flex w-full justify-end gap-2">
              <Button
                type="button"
                variant="outline"
                disabled={pending}
                onClick={() => {
                  setFormOpen(false);
                  setEditingItem(null);
                  setFormNombre("");
                  setFormContenidoIds([]);
                  setFormListOpen(false);
                }}
              >
                Cancelar
              </Button>
              <Button
                type="button"
                disabled={pending || !formNombre.trim()}
                onClick={() => void handleGuardarForm()}
              >
                Guardar
              </Button>
            </div>
          }
        >
          <div className="flex flex-col gap-4">
            <div className="flex flex-col gap-1">
              <ModalMicroLabel>Nombre</ModalMicroLabel>
              <Input
                value={formNombre}
                onChange={(e) => setFormNombre(e.target.value)}
                placeholder="Nombre (se guardará en mayúsculas)"
                disabled={pending}
                autoFocus
              />
            </div>
            <ControlesContenidoPermitidos
              contenidos={contenidos}
              selectedIds={formContenidoIds}
              onChange={setFormContenidoIds}
              disabled={pending}
              listOpen={formListOpen}
              onListOpenChange={setFormListOpen}
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
            <span className="font-semibold text-foreground">{borrarTarget?.nombre}</span>? Esta acción no se
            puede deshacer.
          </p>
        </AppModal>
      </Dialog>
    </>
  );
}
