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
  crearProdIaDisenoCatalogoNombreAction,
  editarProdIaDisenoCatalogoNombreAction,
  eliminarProdIaDisenoCatalogoNombreAction,
  listarProdIaDisenoCatalogoNombreAction,
} from "@/actions/prodIaDisenoCatalogos";
import { matchByMultiTerm } from "@/lib/busqueda";
import type {
  ProdIaDisenoCatalogoKind,
  ProdIaDisenoCatalogoNombreItem,
} from "@/lib/prodIaDisenoCatalogos";
import type { ActionResult } from "@/lib/types";
import { TABLE_ROW_ICON_BUTTON_FILLED_BRAND_CLASS } from "@/lib/ui-classes";
import { cn } from "@/lib/utils";

type CatalogoCopy = {
  title: string;
  searchPlaceholder: string;
  searchAria: string;
  addAria: string;
  emptyMessage: string;
  emptyFilterMessage: string;
  formCreateTitle: string;
  formEditTitle: string;
  formLabelEs: string;
  formLabelEn: string;
  deleteTitle: string;
  deleteNoun: string;
  toastCreado: string;
  toastActualizado: string;
  toastEliminado: string;
};

const COPY_BY_KIND: Record<ProdIaDisenoCatalogoKind, CatalogoCopy> = {
  sup_pintar: {
    title: "Superficie A Pintar",
    searchPlaceholder: "Buscar superficie...",
    searchAria: "Buscar superficie a pintar",
    addAria: "Agregar superficie",
    emptyMessage: "No hay superficies. Usá el botón + para agregar la primera.",
    emptyFilterMessage: "Ninguna superficie coincide con la búsqueda.",
    formCreateTitle: "Nueva Superficie",
    formEditTitle: "Editar Superficie",
    formLabelEs: "Nombre (español)",
    formLabelEn: "Nombre (inglés · prompt)",
    deleteTitle: "Eliminar Superficie",
    deleteNoun: "la superficie",
    toastCreado: "Superficie creada.",
    toastActualizado: "Superficie actualizada.",
    toastEliminado: "Superficie eliminada.",
  },
  estilos: {
    title: "Estilo De Diseño",
    searchPlaceholder: "Buscar estilo...",
    searchAria: "Buscar estilo de diseño",
    addAria: "Agregar estilo",
    emptyMessage: "No hay estilos. Usá el botón + para agregar el primero.",
    emptyFilterMessage: "Ningún estilo coincide con la búsqueda.",
    formCreateTitle: "Nuevo Estilo",
    formEditTitle: "Editar Estilo",
    formLabelEs: "Nombre (español)",
    formLabelEn: "Nombre (inglés · prompt)",
    deleteTitle: "Eliminar Estilo",
    deleteNoun: "el estilo",
    toastCreado: "Estilo creado.",
    toastActualizado: "Estilo actualizado.",
    toastEliminado: "Estilo eliminado.",
  },
  combinar: {
    title: "Combinar",
    searchPlaceholder: "Buscar opción...",
    searchAria: "Buscar opción de combinar",
    addAria: "Agregar opción",
    emptyMessage: "No hay opciones. Usá el botón + para agregar la primera.",
    emptyFilterMessage: "Ninguna opción coincide con la búsqueda.",
    formCreateTitle: "Nueva Opción",
    formEditTitle: "Editar Opción",
    formLabelEs: "Nombre (español)",
    formLabelEn: "Nombre (inglés · prompt)",
    deleteTitle: "Eliminar Opción",
    deleteNoun: "la opción",
    toastCreado: "Opción creada.",
    toastActualizado: "Opción actualizada.",
    toastEliminado: "Opción eliminada.",
  },
  objetivo: {
    title: "Objetivo De Diseño",
    searchPlaceholder: "Buscar objetivo...",
    searchAria: "Buscar objetivo de diseño",
    addAria: "Agregar objetivo",
    emptyMessage: "No hay objetivos. Usá el botón + para agregar el primero.",
    emptyFilterMessage: "Ningún objetivo coincide con la búsqueda.",
    formCreateTitle: "Nuevo Objetivo",
    formEditTitle: "Editar Objetivo",
    formLabelEs: "Nombre (español)",
    formLabelEn: "Nombre (inglés · prompt)",
    deleteTitle: "Eliminar Objetivo",
    deleteNoun: "el objetivo",
    toastCreado: "Objetivo creado.",
    toastActualizado: "Objetivo actualizado.",
    toastEliminado: "Objetivo eliminado.",
  },
  luz_natural: {
    title: "Luz Natural",
    searchPlaceholder: "Buscar opción...",
    searchAria: "Buscar iluminación natural",
    addAria: "Agregar iluminación natural",
    emptyMessage: "No hay opciones. Usá el botón + para agregar la primera.",
    emptyFilterMessage: "Ninguna opción coincide con la búsqueda.",
    formCreateTitle: "Nueva Opción",
    formEditTitle: "Editar Opción",
    formLabelEs: "Nombre (español)",
    formLabelEn: "Nombre (inglés · prompt)",
    deleteTitle: "Eliminar Opción",
    deleteNoun: "la opción",
    toastCreado: "Opción creada.",
    toastActualizado: "Opción actualizada.",
    toastEliminado: "Opción eliminada.",
  },
  luz_artificial: {
    title: "Luz Artificial",
    searchPlaceholder: "Buscar opción...",
    searchAria: "Buscar iluminación artificial",
    addAria: "Agregar iluminación artificial",
    emptyMessage: "No hay opciones. Usá el botón + para agregar la primera.",
    emptyFilterMessage: "Ninguna opción coincide con la búsqueda.",
    formCreateTitle: "Nueva Opción",
    formEditTitle: "Editar Opción",
    formLabelEs: "Nombre (español)",
    formLabelEn: "Nombre (inglés · prompt)",
    deleteTitle: "Eliminar Opción",
    deleteNoun: "la opción",
    toastCreado: "Opción creada.",
    toastActualizado: "Opción actualizada.",
    toastEliminado: "Opción eliminada.",
  },
};

const LIST_ROW_ICON_BTN_CLASS = cn(
  TABLE_ROW_ICON_BUTTON_FILLED_BRAND_CLASS,
  "h-9 w-9 min-h-9 max-h-9"
);

interface Props {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  kind: ProdIaDisenoCatalogoKind;
  esEditor: boolean;
  onCatalogoChanged?: () => void;
}

export default function GestionarProdIaDisenoCatalogoNombreModal({
  open,
  onOpenChange,
  kind,
  esEditor,
  onCatalogoChanged,
}: Props) {
  const copy = COPY_BY_KIND[kind];

  const [items, setItems] = useState<ProdIaDisenoCatalogoNombreItem[]>([]);
  const [loading, setLoading] = useState(false);
  const [busqueda, setBusqueda] = useState("");
  const [formOpen, setFormOpen] = useState(false);
  const [editingItem, setEditingItem] = useState<ProdIaDisenoCatalogoNombreItem | null>(null);
  const [formNombre, setFormNombre] = useState("");
  const [formNombreEn, setFormNombreEn] = useState("");
  const [pending, setPending] = useState(false);
  const [borrarTarget, setBorrarTarget] = useState<ProdIaDisenoCatalogoNombreItem | null>(null);
  const [borrando, setBorrando] = useState(false);

  const cargar = useCallback(async () => {
    setLoading(true);
    try {
      const res: ActionResult<ProdIaDisenoCatalogoNombreItem[]> =
        await listarProdIaDisenoCatalogoNombreAction(kind);
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
    setBusqueda("");
    setFormOpen(false);
    setEditingItem(null);
    setFormNombre("");
    setFormNombreEn("");
    setBorrarTarget(null);
    void cargar();
  }, [open, cargar]);

  const listaFiltrada = useMemo(() => {
    const q = busqueda.trim();
    if (!q) return items;
    return items.filter((item) =>
      matchByMultiTerm([item.nombre, item.nombreEn], q),
    );
  }, [items, busqueda]);

  function abrirCrear() {
    if (!esEditor || pending) return;
    setEditingItem(null);
    setFormNombre("");
    setFormNombreEn("");
    setFormOpen(true);
  }

  function abrirEditar(item: ProdIaDisenoCatalogoNombreItem) {
    if (!esEditor || pending) return;
    setEditingItem(item);
    setFormNombre(item.nombre);
    setFormNombreEn(item.nombreEn);
    setFormOpen(true);
  }

  async function handleGuardarForm() {
    if (!esEditor || !formNombre.trim() || !formNombreEn.trim() || pending) {
      return;
    }
    setPending(true);
    try {
      if (editingItem) {
        const res = await editarProdIaDisenoCatalogoNombreAction(kind, {
          id: editingItem.id,
          nombre: formNombre,
          nombreEn: formNombreEn,
        });
        if (!res.ok) {
          toast.error(res.error ?? "No se pudo guardar.");
          return;
        }
        toast.success(copy.toastActualizado);
      } else {
        const res = await crearProdIaDisenoCatalogoNombreAction(kind, {
          nombre: formNombre,
          nombreEn: formNombreEn,
        });
        if (!res.ok) {
          toast.error(res.error ?? "No se pudo crear.");
          return;
        }
        toast.success(copy.toastCreado);
      }
      setFormOpen(false);
      setEditingItem(null);
      setFormNombre("");
      setFormNombreEn("");
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
      const res = await eliminarProdIaDisenoCatalogoNombreAction(kind, {
        id: borrarTarget.id,
      });
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
                      <div className="min-w-0 flex-1">
                        <p className="truncate text-left font-medium text-foreground">
                          {item.nombre}
                        </p>
                        <p className="truncate text-xs text-muted-foreground">
                          EN: {item.nombreEn}
                        </p>
                      </div>
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
            setFormNombreEn("");
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
                  setFormNombreEn("");
                }}
              >
                Cancelar
              </Button>
              <Button
                type="button"
                disabled={
                  pending || !formNombre.trim() || !formNombreEn.trim()
                }
                onClick={() => void handleGuardarForm()}
              >
                Guardar
              </Button>
            </div>
          }
        >
          <div className="flex flex-col gap-3">
            <div className="flex flex-col gap-1">
              <ModalMicroLabel>{copy.formLabelEs}</ModalMicroLabel>
              <Input
                value={formNombre}
                onChange={(e) => setFormNombre(e.target.value)}
                placeholder="Se guarda en mayúsculas"
                disabled={pending}
                autoFocus
              />
            </div>
            <div className="flex flex-col gap-1">
              <ModalMicroLabel>{copy.formLabelEn}</ModalMicroLabel>
              <Input
                value={formNombreEn}
                onChange={(e) => setFormNombreEn(e.target.value)}
                placeholder="Se inyecta en el prompt (mayúsculas)"
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
