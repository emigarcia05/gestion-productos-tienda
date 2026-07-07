"use client";

import { useCallback, useEffect, useState } from "react";
import { Pencil, Plus } from "lucide-react";
import { toast } from "sonner";
import { Dialog } from "@/components/ui/dialog";
import AppModal from "@/components/shared/AppModal";
import ModalMicroLabel from "@/components/shared/ModalMicroLabel";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  crearFinAnaCosFinaTerminalAction,
  editarFinAnaCosFinaTerminalAction,
  listarFinAnaCosFinaTerminalesAction,
} from "@/actions/finAnaCosFina";
import type { FinAnaCosFinaTerminalItem } from "@/lib/finAnaCosFinaTerminales";
import { cn } from "@/lib/utils";

interface Props {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  terminalesIniciales: FinAnaCosFinaTerminalItem[];
  esEditor: boolean;
  onCatalogoChanged?: () => void;
}

export default function GestionarTerminalesFinAnaCosFinaModal({
  open,
  onOpenChange,
  terminalesIniciales,
  esEditor,
  onCatalogoChanged,
}: Props) {
  const [items, setItems] = useState<FinAnaCosFinaTerminalItem[]>(terminalesIniciales);
  const [nuevoNombre, setNuevoNombre] = useState("");
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editDraft, setEditDraft] = useState("");
  const [pending, setPending] = useState(false);

  const cargar = useCallback(async () => {
    const res = await listarFinAnaCosFinaTerminalesAction();
    if (!res.ok) {
      toast.error(res.error ?? "No se pudieron cargar las terminales.");
      setItems([]);
      return;
    }
    setItems(res.data);
  }, []);

  useEffect(() => {
    if (!open) return;
    setItems(terminalesIniciales);
    void cargar();
    setNuevoNombre("");
    setEditingId(null);
    setEditDraft("");
  }, [open, cargar, terminalesIniciales]);

  async function handleCrear() {
    if (!esEditor || !nuevoNombre.trim() || pending) return;
    setPending(true);
    try {
      const res = await crearFinAnaCosFinaTerminalAction({ nombre: nuevoNombre });
      if (!res.ok) {
        toast.error(res.error ?? "No se pudo crear la terminal.");
        return;
      }
      toast.success("Terminal creada.");
      setNuevoNombre("");
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
      const res = await editarFinAnaCosFinaTerminalAction({ id: editingId, nombre: editDraft });
      if (!res.ok) {
        toast.error(res.error ?? "No se pudo guardar.");
        return;
      }
      toast.success("Terminal actualizada.");
      setEditingId(null);
      setEditDraft("");
      await cargar();
      onCatalogoChanged?.();
    } finally {
      setPending(false);
    }
  }

  return (
    <Dialog open={open} onOpenChange={(next) => !pending && onOpenChange(next)}>
      <AppModal
        title="Gestionar Terminales"
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
              <ModalMicroLabel>NUEVA TERMINAL</ModalMicroLabel>
              <div className="flex gap-2">
                <Input
                  value={nuevoNombre}
                  onChange={(e) => setNuevoNombre(e.target.value)}
                  placeholder="Nombre (se guardará en mayúsculas)"
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
            <ModalMicroLabel>TERMINALES EXISTENTES</ModalMicroLabel>
            <ul className="max-h-[min(22rem,55vh)] space-y-2 overflow-y-auto pr-1">
              {items.map((terminal) => (
                <li
                  key={terminal.id}
                  className="flex items-center gap-2 rounded-md border border-border bg-muted/20 px-2 py-1.5"
                >
                  {editingId === terminal.id && esEditor ? (
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
                      <span className="min-w-0 flex-1 truncate text-sm font-medium">{terminal.nombre}</span>
                      {esEditor ? (
                        <Button
                          type="button"
                          size="icon"
                          variant="ghost"
                          className="h-8 w-8 shrink-0"
                          aria-label={`Editar ${terminal.nombre}`}
                          disabled={pending}
                          onClick={() => {
                            setEditingId(terminal.id);
                            setEditDraft(terminal.nombre);
                          }}
                        >
                          <Pencil className="size-4" />
                        </Button>
                      ) : null}
                    </>
                  )}
                </li>
              ))}
              {items.length === 0 ? (
                <li className="py-6 text-center text-sm text-muted-foreground">No hay terminales.</li>
              ) : null}
            </ul>
          </div>
        </div>
      </AppModal>
    </Dialog>
  );
}
