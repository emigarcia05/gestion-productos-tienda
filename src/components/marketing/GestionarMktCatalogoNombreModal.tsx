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
import type {
  MktCatalogoNombreItem,
  MktCatalogoNombreKind,
} from "@/lib/mktPublicacionesCatalogo";
import { TABLE_ROW_ICON_BUTTON_FILLED_BRAND_CLASS } from "@/lib/ui-classes";
import { cn } from "@/lib/utils";
import {
  crearMktPublicacionContenidoAction,
  crearMktPublicacionRedAction,
  crearMktPublicacionTipoAction,
  editarMktPublicacionContenidoAction,
  editarMktPublicacionRedAction,
  editarMktPublicacionTipoAction,
  eliminarMktPublicacionContenidoAction,
  eliminarMktPublicacionRedAction,
  eliminarMktPublicacionTipoAction,
  listarMktPublicacionContenidosAction,
  listarMktPublicacionRedesAction,
  listarMktPublicacionTiposAction,
} from "@/actions/mktPublicacionesCatalogo";

type CatalogoCopy = {
  title: string;
  searchPlaceholder: string;
  searchAria: string;
  addAria: string;
  emptyMessage: string;
  emptyFilterMessage: string;
  formCreateTitle: string;
  formEditTitle: string;
  formLabel: string;
  deleteTitle: string;
  deleteNoun: string;
  toastCreado: string;
  toastActualizado: string;
  toastEliminado: string;
};

const COPY_BY_KIND: Record<MktCatalogoNombreKind, CatalogoCopy> = {
  red: {
    title: "Gestionar Redes",
    searchPlaceholder: "Buscar red por nombre...",
    searchAria: "Buscar red por nombre",
    addAria: "Agregar red",
    emptyMessage: "No hay redes. Usá el botón + para agregar la primera.",
    emptyFilterMessage: "Ninguna red coincide con la búsqueda.",
    formCreateTitle: "Nueva Red",
    formEditTitle: "Editar Red",
    formLabel: "Nombre",
    deleteTitle: "Eliminar Red",
    deleteNoun: "la red",
    toastCreado: "Red creada.",
    toastActualizado: "Red actualizada.",
    toastEliminado: "Red eliminada.",
  },
  tipo: {
    title: "Gestionar Publicaciones",
    searchPlaceholder: "Buscar publicación por nombre...",
    searchAria: "Buscar publicación por nombre",
    addAria: "Agregar publicación",
    emptyMessage: "No hay publicaciones. Usá el botón + para agregar la primera.",
    emptyFilterMessage: "Ninguna publicación coincide con la búsqueda.",
    formCreateTitle: "Nueva Publicación",
    formEditTitle: "Editar Publicación",
    formLabel: "Nombre",
    deleteTitle: "Eliminar Publicación",
    deleteNoun: "la publicación",
    toastCreado: "Publicación creada.",
    toastActualizado: "Publicación actualizada.",
    toastEliminado: "Publicación eliminada.",
  },
  contenido: {
    title: "Gestionar Contenido",
    searchPlaceholder: "Buscar contenido por nombre...",
    searchAria: "Buscar contenido por nombre",
    addAria: "Agregar contenido",
    emptyMessage: "No hay contenidos. Usá el botón + para agregar el primero.",
    emptyFilterMessage: "Ningún contenido coincide con la búsqueda.",
    formCreateTitle: "Nuevo Contenido",
    formEditTitle: "Editar Contenido",
    formLabel: "Nombre",
    deleteTitle: "Eliminar Contenido",
    deleteNoun: "el contenido",
    toastCreado: "Contenido creado.",
    toastActualizado: "Contenido actualizado.",
    toastEliminado: "Contenido eliminado.",
  },
};

const LIST_ROW_ICON_BTN_CLASS = cn(
  TABLE_ROW_ICON_BUTTON_FILLED_BRAND_CLASS,
  "h-9 w-9 min-h-9 max-h-9"
);

function actionsForKind(kind: MktCatalogoNombreKind) {
  if (kind === "red") {
    return {
      listar: listarMktPublicacionRedesAction,
      crear: crearMktPublicacionRedAction,
      editar: editarMktPublicacionRedAction,
      eliminar: eliminarMktPublicacionRedAction,
    };
  }
  if (kind === "tipo") {
    return {
      listar: listarMktPublicacionTiposAction,
      crear: crearMktPublicacionTipoAction,
      editar: editarMktPublicacionTipoAction,
      eliminar: eliminarMktPublicacionTipoAction,
    };
  }
  return {
    listar: listarMktPublicacionContenidosAction,
    crear: crearMktPublicacionContenidoAction,
    editar: editarMktPublicacionContenidoAction,
    eliminar: eliminarMktPublicacionContenidoAction,
  };
}

interface Props {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  kind: MktCatalogoNombreKind;
  itemsIniciales: MktCatalogoNombreItem[];
  esEditor: boolean;
  onCatalogoChanged?: () => void;
}

export default function GestionarMktCatalogoNombreModal({
  open,
  onOpenChange,
  kind,
  itemsIniciales,
  esEditor,
  onCatalogoChanged,
}: Props) {
  const copy = COPY_BY_KIND[kind];

  const [items, setItems] = useState<MktCatalogoNombreItem[]>(itemsIniciales);
  const [loading, setLoading] = useState(false);
  const [busqueda, setBusqueda] = useState("");
  const [formOpen, setFormOpen] = useState(false);
  const [editingItem, setEditingItem] = useState<MktCatalogoNombreItem | null>(null);
  const [formNombre, setFormNombre] = useState("");
  const [pending, setPending] = useState(false);
  const [borrarTarget, setBorrarTarget] = useState<MktCatalogoNombreItem | null>(null);
  const [borrando, setBorrando] = useState(false);

  const cargar = useCallback(async () => {
    const api = actionsForKind(kind);
    setLoading(true);
    try {
      const res: ActionResult<MktCatalogoNombreItem[]> = await api.listar();
      if (!res.ok) {
        toast.error(res.error ?? "No se pudieron cargar los datos.");
        setItems([]);
        return;
      }
      setItems(res.data);
    } finally {
      setLoading(false);
    }
  }, [kind]);

  useEffect(() => {
    if (!open) return;
    setItems(itemsIniciales);
    setBusqueda("");
    setFormOpen(false);
    setEditingItem(null);
    setFormNombre("");
    setBorrarTarget(null);
    void cargar();
  }, [open, cargar, itemsIniciales]);

  const listaFiltrada = useMemo(() => {
    const q = busqueda.trim();
    if (!q) return items;
    return items.filter((item) => matchByMultiTerm([item.nombre], q));
  }, [items, busqueda]);

  function abrirCrear() {
    if (!esEditor || pending) return;
    setEditingItem(null);
    setFormNombre("");
    setFormOpen(true);
  }

  function abrirEditar(item: MktCatalogoNombreItem) {
    if (!esEditor || pending) return;
    setEditingItem(item);
    setFormNombre(item.nombre);
    setFormOpen(true);
  }

  async function handleGuardarForm() {
    if (!esEditor || !formNombre.trim() || pending) return;
    const api = actionsForKind(kind);
    setPending(true);
    try {
      if (editingItem) {
        const res = await api.editar({ id: editingItem.id, nombre: formNombre });
        if (!res.ok) {
          toast.error(res.error ?? "No se pudo guardar.");
          return;
        }
        toast.success(copy.toastActualizado);
      } else {
        const res = await api.crear({ nombre: formNombre });
        if (!res.ok) {
          toast.error(res.error ?? "No se pudo crear.");
          return;
        }
        toast.success(copy.toastCreado);
      }
      setFormOpen(false);
      setEditingItem(null);
      setFormNombre("");
      await cargar();
      onCatalogoChanged?.();
    } finally {
      setPending(false);
    }
  }

  async function confirmarBorrar() {
    if (!borrarTarget || borrando) return;
    const api = actionsForKind(kind);
    setBorrando(true);
    try {
      const res = await api.eliminar({ id: borrarTarget.id });
      if (!res.ok) {
        toast.error(res.error ?? "No se pudo eliminar.");
        return;
      }
      toast.success(copy.toastEliminado);
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
          title={copy.title}
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
                  placeholder={copy.searchPlaceholder}
                  className="h-10 pl-9"
                  aria-label={copy.searchAria}
                />
              </div>
              {esEditor ? (
                <Button
                  type="button"
                  variant="default"
                  size="icon"
                  className="h-10 w-10 shrink-0"
                  aria-label={copy.addAria}
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
                <p className="text-sm text-muted-foreground">{copy.emptyMessage}</p>
              ) : listaFiltrada.length === 0 ? (
                <p className="text-sm text-muted-foreground">{copy.emptyFilterMessage}</p>
              ) : (
                <ul className="flex max-h-[50vh] flex-col gap-2 overflow-y-auto pr-1">
                  {listaFiltrada.map((item) => (
                    <li
                      key={item.id}
                      className="flex items-center gap-2 rounded-md border border-border bg-card px-3 py-2"
                    >
                      <p className="min-w-0 flex-1 truncate text-left font-medium text-foreground">
                        {item.nombre}
                      </p>
                      {esEditor ? (
                        <div className="ml-auto flex shrink-0 items-center justify-end gap-1.5">
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
          }
        }}
      >
        <AppModal
          title={editingItem ? copy.formEditTitle : copy.formCreateTitle}
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
                  setFormNombre("");
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
          <div className="flex flex-col gap-1">
            <ModalMicroLabel>{copy.formLabel}</ModalMicroLabel>
            <Input
              value={formNombre}
              onChange={(e) => setFormNombre(e.target.value)}
              placeholder="Nombre (se guardará en mayúsculas)"
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
          title={copy.deleteTitle}
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
            ¿Eliminar {copy.deleteNoun}{" "}
            <span className="font-semibold text-foreground">{borrarTarget?.nombre}</span>? Esta acción no se
            puede deshacer.
          </p>
        </AppModal>
      </Dialog>
    </>
  );
}
