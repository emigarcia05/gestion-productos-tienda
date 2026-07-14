"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { Check, ChevronDown, Pencil, Plus, Trash2, X } from "lucide-react";
import { toast } from "sonner";
import { Dialog } from "@/components/ui/dialog";
import AppModal from "@/components/shared/AppModal";
import ModalMicroLabel from "@/components/shared/ModalMicroLabel";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import type { ActionResult } from "@/lib/types";
import type {
  MktCatalogoNombreItem,
  MktPublicacionTipoItem,
} from "@/lib/mktPublicacionesCatalogo";
import {
  TABLE_ROW_ACTION_ICON_CLASS,
  TABLE_ROW_ICON_BUTTON_FILLED_BRAND_CLASS,
} from "@/lib/ui-classes";
import { cn } from "@/lib/utils";
import {
  crearMktPublicacionTipoAction,
  editarMktPublicacionTipoAction,
  eliminarMktPublicacionTipoAction,
  listarMktPublicacionContenidosAction,
  listarMktPublicacionTiposAction,
} from "@/actions/mktPublicacionesCatalogo";

const BOTON_ACCION_CATALOGO_CLASS = cn(
  TABLE_ROW_ICON_BUTTON_FILLED_BRAND_CLASS,
  "!size-8 max-h-8 min-h-8 min-w-8 shrink-0 !p-0"
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
  const [nuevoNombre, setNuevoNombre] = useState("");
  const [nuevoContenidoIds, setNuevoContenidoIds] = useState<string[]>([]);
  const [nuevoListOpen, setNuevoListOpen] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editDraft, setEditDraft] = useState("");
  const [editContenidoIds, setEditContenidoIds] = useState<string[]>([]);
  const [editListOpen, setEditListOpen] = useState(false);
  const [pending, setPending] = useState(false);
  const [borrarTarget, setBorrarTarget] = useState<MktPublicacionTipoItem | null>(null);
  const [borrando, setBorrando] = useState(false);

  const contenidoById = useMemo(() => {
    const map = new Map<string, string>();
    for (const c of contenidos) map.set(c.id, c.nombre);
    return map;
  }, [contenidos]);

  const cargar = useCallback(async () => {
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
  }, []);

  useEffect(() => {
    if (!open) return;
    setItems(itemsIniciales);
    setContenidos(contenidosIniciales);
    void cargar();
    setNuevoNombre("");
    setNuevoContenidoIds([]);
    setNuevoListOpen(false);
    setEditingId(null);
    setEditDraft("");
    setEditContenidoIds([]);
    setEditListOpen(false);
    setBorrarTarget(null);
  }, [open, cargar, itemsIniciales, contenidosIniciales]);

  async function handleCrear() {
    if (!esEditor || !nuevoNombre.trim() || pending) return;
    setPending(true);
    try {
      const res = await crearMktPublicacionTipoAction({
        nombre: nuevoNombre,
        contenidoIdsPermitidos: nuevoContenidoIds,
      });
      if (!res.ok) {
        toast.error(res.error ?? "No se pudo crear.");
        return;
      }
      toast.success("Tipo de publicación creado.");
      setNuevoNombre("");
      setNuevoContenidoIds([]);
      setNuevoListOpen(false);
      await cargar();
      onCatalogoChanged?.();
    } finally {
      setPending(false);
    }
  }

  async function handleGuardarEdicion() {
    if (!esEditor || !editingId || !editDraft.trim() || pending) return;
    setPending(true);
    try {
      const res = await editarMktPublicacionTipoAction({
        id: editingId,
        nombre: editDraft,
        contenidoIdsPermitidos: editContenidoIds,
      });
      if (!res.ok) {
        toast.error(res.error ?? "No se pudo guardar.");
        return;
      }
      toast.success("Tipo de publicación actualizado.");
      setEditingId(null);
      setEditDraft("");
      setEditContenidoIds([]);
      setEditListOpen(false);
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

  function chipsFor(ids: string[]) {
    return ids
      .map((id) => {
        const nombre = contenidoById.get(id);
        if (!nombre) return null;
        return (
          <Badge key={id} variant="secondary" className="font-medium tracking-wide">
            {nombre}
          </Badge>
        );
      })
      .filter(Boolean);
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
          <div className="flex min-h-0 flex-col gap-4">
            {esEditor ? (
              <div className="flex flex-col gap-3">
                <div className="flex flex-col gap-1">
                  <ModalMicroLabel>Nuevo Tipo</ModalMicroLabel>
                  <Input
                    value={nuevoNombre}
                    onChange={(e) => setNuevoNombre(e.target.value)}
                    placeholder="Nombre (se guardará en mayúsculas)"
                    disabled={pending}
                    onKeyDown={(e) => {
                      if (e.key === "Enter") {
                        e.preventDefault();
                        void handleCrear();
                      }
                    }}
                  />
                </div>
                <ControlesContenidoPermitidos
                  contenidos={contenidos}
                  selectedIds={nuevoContenidoIds}
                  onChange={setNuevoContenidoIds}
                  disabled={pending}
                  listOpen={nuevoListOpen}
                  onListOpenChange={setNuevoListOpen}
                />
                <Button
                  type="button"
                  disabled={pending || !nuevoNombre.trim()}
                  onClick={() => void handleCrear()}
                  className="gap-2 self-start"
                >
                  <Plus className="size-4 shrink-0" aria-hidden />
                  Crear
                </Button>
              </div>
            ) : null}

            <div className={cn("flex min-h-0 flex-1 flex-col gap-1", esEditor && "border-t pt-3")}>
              <ModalMicroLabel>Tipos Existentes</ModalMicroLabel>
              <ul className="max-h-[min(26rem,55vh)] space-y-2 overflow-y-auto pr-1">
                {items.map((item) => (
                  <li
                    key={item.id}
                    className="flex flex-col gap-2 rounded-md border border-border bg-muted/20 px-2 py-2"
                  >
                    {editingId === item.id && esEditor ? (
                      <div className="flex flex-col gap-3">
                        <Input
                          value={editDraft}
                          onChange={(ev) => setEditDraft(ev.target.value)}
                          className="h-8 text-xs"
                          disabled={pending}
                        />
                        <ControlesContenidoPermitidos
                          contenidos={contenidos}
                          selectedIds={editContenidoIds}
                          onChange={setEditContenidoIds}
                          disabled={pending}
                          listOpen={editListOpen}
                          onListOpenChange={setEditListOpen}
                        />
                        <div className="flex flex-wrap gap-2">
                          <Button
                            type="button"
                            size="sm"
                            className="h-8"
                            disabled={pending}
                            onClick={() => void handleGuardarEdicion()}
                          >
                            Guardar
                          </Button>
                          <Button
                            type="button"
                            size="sm"
                            variant="ghost"
                            className="h-8"
                            disabled={pending}
                            onClick={() => {
                              setEditingId(null);
                              setEditDraft("");
                              setEditContenidoIds([]);
                              setEditListOpen(false);
                            }}
                          >
                            Cancelar
                          </Button>
                        </div>
                      </div>
                    ) : (
                      <div className="flex items-start gap-2">
                        <div className="min-w-0 flex-1 space-y-1.5">
                          <span className="block truncate text-sm font-medium">{item.nombre}</span>
                          <div className="flex flex-wrap gap-1">
                            {item.contenidoIdsPermitidos.length === 0 ? (
                              <span className="text-xs text-muted-foreground">Sin contenidos permitidos.</span>
                            ) : (
                              chipsFor(item.contenidoIdsPermitidos)
                            )}
                          </div>
                        </div>
                        {esEditor ? (
                          <div className="flex shrink-0 items-center gap-1.5">
                            <Button
                              type="button"
                              variant="ghost"
                              size="icon"
                              className={BOTON_ACCION_CATALOGO_CLASS}
                              aria-label={`Editar ${item.nombre}`}
                              disabled={pending}
                              onClick={() => {
                                setEditingId(item.id);
                                setEditDraft(item.nombre);
                                setEditContenidoIds([...item.contenidoIdsPermitidos]);
                                setEditListOpen(false);
                                setNuevoListOpen(false);
                              }}
                            >
                              <Pencil className={TABLE_ROW_ACTION_ICON_CLASS} aria-hidden />
                            </Button>
                            <Button
                              type="button"
                              variant="ghost"
                              size="icon"
                              className={BOTON_ACCION_CATALOGO_CLASS}
                              aria-label={`Eliminar ${item.nombre}`}
                              disabled={pending}
                              onClick={() => setBorrarTarget(item)}
                            >
                              <Trash2 className={TABLE_ROW_ACTION_ICON_CLASS} aria-hidden />
                            </Button>
                          </div>
                        ) : null}
                      </div>
                    )}
                  </li>
                ))}
                {items.length === 0 ? (
                  <li className="py-6 text-center text-sm text-muted-foreground">
                    No hay tipos de publicación.
                  </li>
                ) : null}
              </ul>
            </div>
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
