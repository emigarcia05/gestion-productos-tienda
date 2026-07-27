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
  crearProdIaDisenoPrompAction,
  editarProdIaDisenoPrompAction,
  eliminarProdIaDisenoPrompAction,
  listarProdIaDisenoPrompsAction,
} from "@/actions/prodIaDisenoPromp";
import type { ProdIaDisenoPrompItem } from "@/lib/asistenteIa";
import { matchByMultiTerm } from "@/lib/busqueda";
import type { ActionResult } from "@/lib/types";
import { TABLE_ROW_ICON_BUTTON_FILLED_BRAND_CLASS } from "@/lib/ui-classes";
import { cn } from "@/lib/utils";

const LIST_ROW_ICON_BTN_CLASS = cn(
  TABLE_ROW_ICON_BUTTON_FILLED_BRAND_CLASS,
  "h-9 w-9 min-h-9 max-h-9",
);

interface Props {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  itemsIniciales: ProdIaDisenoPrompItem[];
  esEditor: boolean;
  onCatalogoChanged?: () => void;
}

export default function GestionarProdIaDisenoPrompModal({
  open,
  onOpenChange,
  itemsIniciales,
  esEditor,
  onCatalogoChanged,
}: Props) {
  const [items, setItems] = useState<ProdIaDisenoPrompItem[]>(itemsIniciales);
  const [loading, setLoading] = useState(false);
  const [busqueda, setBusqueda] = useState("");
  const [formOpen, setFormOpen] = useState(false);
  const [editingItem, setEditingItem] = useState<ProdIaDisenoPrompItem | null>(null);
  const [formSubmodulo, setFormSubmodulo] = useState("");
  const [formPromp, setFormPromp] = useState("");
  const [formUrl, setFormUrl] = useState("");
  const [pending, setPending] = useState(false);
  const [borrarTarget, setBorrarTarget] = useState<ProdIaDisenoPrompItem | null>(null);
  const [borrando, setBorrando] = useState(false);

  const cargar = useCallback(async () => {
    setLoading(true);
    try {
      const res: ActionResult<ProdIaDisenoPrompItem[]> =
        await listarProdIaDisenoPrompsAction();
      if (!res.ok) {
        toast.error(res.error ?? "No se pudieron cargar los prompts.");
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
    setFormSubmodulo("");
    setFormPromp("");
    setFormUrl("");
    setBorrarTarget(null);
    void cargar();
  }, [open, cargar, itemsIniciales]);

  const listaFiltrada = useMemo(() => {
    const q = busqueda.trim();
    if (!q) return items;
    return items.filter((item) =>
      matchByMultiTerm([item.submodulo, item.promp, item.urlRedireccion], q),
    );
  }, [items, busqueda]);

  function abrirCrear() {
    if (!esEditor || pending) return;
    setEditingItem(null);
    setFormSubmodulo("");
    setFormPromp("");
    setFormUrl("");
    setFormOpen(true);
  }

  function abrirEditar(item: ProdIaDisenoPrompItem) {
    if (!esEditor || pending) return;
    setEditingItem(item);
    setFormSubmodulo(item.submodulo);
    setFormPromp(item.promp);
    setFormUrl(item.urlRedireccion);
    setFormOpen(true);
  }

  async function handleGuardarForm() {
    if (!esEditor || pending) return;
    setPending(true);
    try {
      if (editingItem) {
        const res = await editarProdIaDisenoPrompAction({
          id: editingItem.id,
          submodulo: formSubmodulo,
          promp: formPromp,
          urlRedireccion: formUrl,
        });
        if (!res.ok) {
          toast.error(res.error ?? "No se pudo guardar.");
          return;
        }
        toast.success("Prompt Actualizado");
      } else {
        const res = await crearProdIaDisenoPrompAction({
          submodulo: formSubmodulo,
          promp: formPromp,
          urlRedireccion: formUrl,
        });
        if (!res.ok) {
          toast.error(res.error ?? "No se pudo crear.");
          return;
        }
        toast.success("Prompt Creado");
      }
      setFormOpen(false);
      setEditingItem(null);
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
      const res = await eliminarProdIaDisenoPrompAction({ id: borrarTarget.id });
      if (!res.ok) {
        toast.error(res.error ?? "No se pudo eliminar.");
        return;
      }
      toast.success("Prompt Eliminado");
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
          title="Gestionar Promo Y Url"
          size="lg"
          className="max-w-3xl"
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
            <div className="flex items-center gap-2">
              <div className="relative min-w-0 flex-1">
                <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-primary" />
                <Input
                  value={busqueda}
                  onChange={(e) => setBusqueda(e.target.value)}
                  placeholder="BUSCAR POR SUBMÓDULO..."
                  className="h-10 pl-9"
                  aria-label="Buscar prompt por submódulo"
                />
              </div>
              {esEditor ? (
                <Button
                  type="button"
                  variant="default"
                  size="icon"
                  className="h-10 w-10 shrink-0"
                  aria-label="Agregar prompt"
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
                  No hay prompts. Usá el botón + para agregar el primero.
                </p>
              ) : listaFiltrada.length === 0 ? (
                <p className="text-sm text-muted-foreground">Sin resultados.</p>
              ) : (
                <ul className="flex flex-col gap-2">
                  {listaFiltrada.map((item) => (
                    <li
                      key={item.id}
                      className="flex items-start gap-2 rounded-lg border border-border bg-muted/30 p-3"
                    >
                      <div className="min-w-0 flex-1">
                        <p className="text-sm font-semibold text-foreground">{item.submodulo}</p>
                        <p className="mt-1 line-clamp-2 text-xs text-muted-foreground">{item.promp}</p>
                        <p className="mt-1 truncate text-xs text-primary">{item.urlRedireccion}</p>
                      </div>
                      {esEditor ? (
                        <div className="flex shrink-0 gap-1">
                          <Button
                            type="button"
                            variant="ghost"
                            size="icon"
                            className={LIST_ROW_ICON_BTN_CLASS}
                            aria-label={`Editar ${item.submodulo}`}
                            disabled={pending || borrando}
                            onClick={() => abrirEditar(item)}
                          >
                            <Pencil className="h-4 w-4" />
                          </Button>
                          <Button
                            type="button"
                            variant="ghost"
                            size="icon"
                            className={LIST_ROW_ICON_BTN_CLASS}
                            aria-label={`Eliminar ${item.submodulo}`}
                            disabled={pending || borrando}
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
          if (!next) setEditingItem(null);
        }}
      >
        <AppModal
          title={editingItem ? "Editar Prompt Y Url" : "Nuevo Prompt Y Url"}
          size="lg"
          className="max-w-2xl"
          scrollBody
          actions={
            <>
              <Button
                type="button"
                variant="outline"
                disabled={pending}
                onClick={() => setFormOpen(false)}
              >
                Cancelar
              </Button>
              <Button
                type="button"
                disabled={
                  pending ||
                  !formSubmodulo.trim() ||
                  !formPromp.trim() ||
                  !formUrl.trim()
                }
                onClick={() => void handleGuardarForm()}
              >
                Guardar
              </Button>
            </>
          }
        >
          <div className="flex flex-col gap-3">
            <div className="flex flex-col gap-1">
              <ModalMicroLabel>Submódulo</ModalMicroLabel>
              <Input
                value={formSubmodulo}
                onChange={(e) => setFormSubmodulo(e.target.value)}
                placeholder="Ej. Buscar Color Desde Imagen"
                className="h-10"
                disabled={pending}
              />
            </div>
            <div className="flex flex-col gap-1">
              <ModalMicroLabel>Prompt</ModalMicroLabel>
              <textarea
                value={formPromp}
                onChange={(e) => setFormPromp(e.target.value)}
                rows={6}
                disabled={pending}
                className={cn(
                  "border-input min-h-[8rem] w-full rounded-md border bg-transparent px-3 py-2 text-sm",
                  "text-foreground shadow-xs outline-none",
                  "focus-visible:border-ring focus-visible:ring-ring/50 focus-visible:ring-[3px]",
                  "disabled:cursor-not-allowed disabled:opacity-50",
                )}
              />
            </div>
            <div className="flex flex-col gap-1">
              <ModalMicroLabel>Url Redirección</ModalMicroLabel>
              <Input
                value={formUrl}
                onChange={(e) => setFormUrl(e.target.value)}
                placeholder="https://..."
                className="h-10"
                disabled={pending}
              />
            </div>
          </div>
        </AppModal>
      </Dialog>

      <Dialog
        open={borrarTarget != null}
        onOpenChange={(next) => {
          if (borrando) return;
          if (!next) setBorrarTarget(null);
        }}
      >
        <AppModal
          title="Eliminar Prompt"
          size="sm"
          actions={
            <>
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
            </>
          }
        >
          <p className="text-sm text-foreground">
            ¿Eliminar el prompt de{" "}
            <span className="font-semibold">{borrarTarget?.submodulo}</span>?
          </p>
        </AppModal>
      </Dialog>
    </>
  );
}
