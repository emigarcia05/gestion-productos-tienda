"use client";

import { useCallback, useEffect, useState } from "react";
import { Pencil, Plus, Trash2 } from "lucide-react";
import { toast } from "sonner";
import { Dialog } from "@/components/ui/dialog";
import AppModal from "@/components/shared/AppModal";
import ModalMicroLabel from "@/components/shared/ModalMicroLabel";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import type { ActionResult } from "@/lib/types";
import type {
  MktCatalogoNombreItem,
  MktCatalogoNombreKind,
} from "@/lib/mktPublicacionesCatalogo";
import {
  TABLE_ROW_ACTION_ICON_CLASS,
  TABLE_ROW_ICON_BUTTON_FILLED_BRAND_CLASS,
} from "@/lib/ui-classes";
import { cn } from "@/lib/utils";
import {
  crearMktPublicacionRedAction,
  crearMktPublicacionTipoAction,
  editarMktPublicacionRedAction,
  editarMktPublicacionTipoAction,
  eliminarMktPublicacionRedAction,
  eliminarMktPublicacionTipoAction,
  listarMktPublicacionRedesAction,
  listarMktPublicacionTiposAction,
} from "@/actions/mktPublicacionesCatalogo";

type CatalogoCopy = {
  title: string;
  labelNuevo: string;
  labelListado: string;
  placeholder: string;
  emptyMessage: string;
  deleteTitle: string;
  deleteNoun: string;
  toastCreado: string;
  toastActualizado: string;
  toastEliminado: string;
};

const COPY_BY_KIND: Record<MktCatalogoNombreKind, CatalogoCopy> = {
  red: {
    title: "Gestionar Redes",
    labelNuevo: "NUEVA RED",
    labelListado: "REDES EXISTENTES",
    placeholder: "Nombre (se guardará en mayúsculas)",
    emptyMessage: "No hay redes.",
    deleteTitle: "Eliminar Red",
    deleteNoun: "la red",
    toastCreado: "Red creada.",
    toastActualizado: "Red actualizada.",
    toastEliminado: "Red eliminada.",
  },
  tipo: {
    title: "Gestionar Tipo Publicaciones",
    labelNuevo: "NUEVO TIPO",
    labelListado: "TIPOS EXISTENTES",
    placeholder: "Nombre (se guardará en mayúsculas)",
    emptyMessage: "No hay tipos de publicación.",
    deleteTitle: "Eliminar Tipo",
    deleteNoun: "el tipo",
    toastCreado: "Tipo de publicación creado.",
    toastActualizado: "Tipo de publicación actualizado.",
    toastEliminado: "Tipo de publicación eliminado.",
  },
};

const BOTON_ACCION_CATALOGO_CLASS = cn(
  TABLE_ROW_ICON_BUTTON_FILLED_BRAND_CLASS,
  "!size-8 max-h-8 min-h-8 min-w-8 shrink-0 !p-0"
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
  return {
    listar: listarMktPublicacionTiposAction,
    crear: crearMktPublicacionTipoAction,
    editar: editarMktPublicacionTipoAction,
    eliminar: eliminarMktPublicacionTipoAction,
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
  const [nuevoNombre, setNuevoNombre] = useState("");
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editDraft, setEditDraft] = useState("");
  const [pending, setPending] = useState(false);
  const [borrarTarget, setBorrarTarget] = useState<MktCatalogoNombreItem | null>(null);
  const [borrando, setBorrando] = useState(false);

  const cargar = useCallback(async () => {
    const api = actionsForKind(kind);
    const res: ActionResult<MktCatalogoNombreItem[]> = await api.listar();
    if (!res.ok) {
      toast.error(res.error ?? "No se pudieron cargar los datos.");
      setItems([]);
      return;
    }
    setItems(res.data);
  }, [kind]);

  useEffect(() => {
    if (!open) return;
    setItems(itemsIniciales);
    void cargar();
    setNuevoNombre("");
    setEditingId(null);
    setEditDraft("");
    setBorrarTarget(null);
  }, [open, cargar, itemsIniciales]);

  async function handleCrear() {
    if (!esEditor || !nuevoNombre.trim() || pending) return;
    const api = actionsForKind(kind);
    setPending(true);
    try {
      const res = await api.crear({ nombre: nuevoNombre });
      if (!res.ok) {
        toast.error(res.error ?? "No se pudo crear.");
        return;
      }
      toast.success(copy.toastCreado);
      setNuevoNombre("");
      await cargar();
      onCatalogoChanged?.();
    } finally {
      setPending(false);
    }
  }

  async function handleGuardarEdicion() {
    if (!esEditor || !editingId || !editDraft.trim() || pending) return;
    const api = actionsForKind(kind);
    setPending(true);
    try {
      const res = await api.editar({ id: editingId, nombre: editDraft });
      if (!res.ok) {
        toast.error(res.error ?? "No se pudo guardar.");
        return;
      }
      toast.success(copy.toastActualizado);
      setEditingId(null);
      setEditDraft("");
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
          <div className="flex min-h-0 flex-col gap-4">
            {esEditor ? (
              <div className="flex flex-col gap-1">
                <ModalMicroLabel>{copy.labelNuevo}</ModalMicroLabel>
                <div className="flex gap-2">
                  <Input
                    value={nuevoNombre}
                    onChange={(e) => setNuevoNombre(e.target.value)}
                    placeholder={copy.placeholder}
                    disabled={pending}
                    className="flex-1"
                    onKeyDown={(e) => {
                      if (e.key === "Enter") {
                        e.preventDefault();
                        void handleCrear();
                      }
                    }}
                  />
                  <Button
                    type="button"
                    disabled={pending || !nuevoNombre.trim()}
                    onClick={() => void handleCrear()}
                    className="gap-2"
                  >
                    <Plus className="size-4 shrink-0" aria-hidden />
                    Crear
                  </Button>
                </div>
              </div>
            ) : null}

            <div className={cn("flex min-h-0 flex-1 flex-col gap-1", esEditor && "border-t pt-3")}>
              <ModalMicroLabel>{copy.labelListado}</ModalMicroLabel>
              <ul className="max-h-[min(22rem,55vh)] space-y-2 overflow-y-auto pr-1">
                {items.map((item) => (
                  <li
                    key={item.id}
                    className="flex items-center gap-2 rounded-md border border-border bg-muted/20 px-2 py-1.5"
                  >
                    {editingId === item.id && esEditor ? (
                      <>
                        <Input
                          value={editDraft}
                          onChange={(ev) => setEditDraft(ev.target.value)}
                          className="h-8 flex-1 text-xs"
                          disabled={pending}
                        />
                        <Button
                          type="button"
                          size="sm"
                          className="h-8 shrink-0"
                          disabled={pending}
                          onClick={() => void handleGuardarEdicion()}
                        >
                          Guardar
                        </Button>
                        <Button
                          type="button"
                          size="sm"
                          variant="ghost"
                          className="h-8 shrink-0"
                          disabled={pending}
                          onClick={() => {
                            setEditingId(null);
                            setEditDraft("");
                          }}
                        >
                          Cancelar
                        </Button>
                      </>
                    ) : (
                      <>
                        <span className="min-w-0 flex-1 truncate text-sm font-medium">{item.nombre}</span>
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
                      </>
                    )}
                  </li>
                ))}
                {items.length === 0 ? (
                  <li className="py-6 text-center text-sm text-muted-foreground">{copy.emptyMessage}</li>
                ) : null}
              </ul>
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
