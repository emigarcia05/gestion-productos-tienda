"use client";

import { useEffect, useState } from "react";
import { toast } from "sonner";
import { Dialog } from "@/components/ui/dialog";
import AppModal from "@/components/shared/AppModal";
import ModalMicroLabel from "@/components/shared/ModalMicroLabel";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  crearMktIdeaDetalleAction,
  editarMktIdeaDetalleAction,
} from "@/actions/mktPublicacionesIdeas";
import type { MktIdeaDetalleItem } from "@/lib/mktPublicacionesIdeas";
import { cn } from "@/lib/utils";

interface Props {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  modo: "crear" | "editar";
  seccionId: string;
  seccionNombre?: string;
  id?: string;
  tituloIdeaInicial?: string;
  detalleInicial?: string;
  onSuccess?: () => void;
  /** Solo en alta: entrega el ítem creado (p. ej. para seleccionarlo en el padre). */
  onSuccessCreated?: (item: MktIdeaDetalleItem) => void;
}

export default function CrearEditarMktIdeaDetalleModal({
  open,
  onOpenChange,
  modo,
  seccionId,
  seccionNombre = "",
  id,
  tituloIdeaInicial = "",
  detalleInicial = "",
  onSuccess,
  onSuccessCreated,
}: Props) {
  const [tituloIdea, setTituloIdea] = useState("");
  const [detalle, setDetalle] = useState("");
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (!open) return;
    setTituloIdea(modo === "editar" ? tituloIdeaInicial : "");
    setDetalle(modo === "editar" ? detalleInicial : "");
  }, [open, modo, tituloIdeaInicial, detalleInicial]);

  const puedeGuardar = tituloIdea.trim().length > 0 && Boolean(seccionId);

  async function handleSubmit() {
    if (!puedeGuardar || saving) return;
    if (modo === "editar" && !id) return;
    setSaving(true);
    try {
      const res =
        modo === "crear"
          ? await crearMktIdeaDetalleAction({
              seccionId,
              tituloIdea,
              detalle,
            })
          : await editarMktIdeaDetalleAction({
              id: id!,
              tituloIdea,
              detalle,
            });
      if (!res.ok) {
        toast.error(res.error ?? "No se pudo guardar.");
        return;
      }
      toast.success(modo === "crear" ? "Detalle creado." : "Detalle actualizado.");
      if (modo === "crear" && res.data) {
        onSuccessCreated?.(res.data);
      }
      onOpenChange(false);
      onSuccess?.();
    } finally {
      setSaving(false);
    }
  }

  return (
    <Dialog
      open={open}
      onOpenChange={(next) => {
        if (saving && !next) return;
        onOpenChange(next);
      }}
    >
      <AppModal
        title={modo === "crear" ? "Nuevo Detalle" : "Editar Detalle"}
        size="md"
        className="max-w-lg"
        scrollBody
        hideBodyScrollbars
        actions={
          <div className="flex w-full justify-end gap-2">
            <Button type="button" variant="outline" disabled={saving} onClick={() => onOpenChange(false)}>
              Cancelar
            </Button>
            <Button
              type="button"
              disabled={saving || !puedeGuardar}
              onClick={() => void handleSubmit()}
            >
              Guardar
            </Button>
          </div>
        }
      >
        <div className="flex flex-col gap-4">
          {seccionNombre ? (
            <div className="flex flex-col gap-1">
              <ModalMicroLabel>Sección</ModalMicroLabel>
              <p className="text-sm font-medium text-foreground">{seccionNombre}</p>
            </div>
          ) : null}
          <Input
            value={tituloIdea}
            onChange={(e) => setTituloIdea(e.target.value.toLocaleUpperCase("es-AR"))}
            placeholder="TITULO"
            disabled={saving}
            aria-label="Título"
            className="h-9"
          />
          <textarea
            value={detalle}
            onChange={(e) => setDetalle(e.target.value)}
            disabled={saving}
            placeholder="DETALLE"
            rows={5}
            aria-label="Detalle"
            className={cn(
              "border-input placeholder:text-muted-foreground focus-visible:border-ring focus-visible:ring-ring/50",
              "flex w-full min-w-0 rounded-md border bg-transparent px-3 py-2 text-sm shadow-xs outline-none",
              "focus-visible:ring-[3px] disabled:cursor-not-allowed disabled:opacity-50"
            )}
          />
        </div>
      </AppModal>
    </Dialog>
  );
}
