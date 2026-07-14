"use client";

import { useState } from "react";
import { toast } from "sonner";
import { Dialog } from "@/components/ui/dialog";
import AppModal from "@/components/shared/AppModal";
import { Button } from "@/components/ui/button";
import {
  eliminarMktIdeaDetalleAction,
  eliminarMktIdeaSeccionAction,
} from "@/actions/mktPublicacionesIdeas";

type Kind = "seccion" | "detalle";

interface Props {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  kind: Kind;
  id: string | null;
  label: string | null;
  onSuccess?: () => void;
}

export default function EliminarMktIdeaModal({
  open,
  onOpenChange,
  kind,
  id,
  label,
  onSuccess,
}: Props) {
  const [pending, setPending] = useState(false);
  const title = kind === "seccion" ? "Eliminar Sección" : "Eliminar Detalle";
  const noun = kind === "seccion" ? "la sección" : "el detalle";

  async function handleDelete() {
    if (!id) return;
    setPending(true);
    try {
      const res =
        kind === "seccion"
          ? await eliminarMktIdeaSeccionAction({ id })
          : await eliminarMktIdeaDetalleAction({ id });
      if (!res.ok) {
        toast.error(res.error ?? "No se pudo eliminar.");
        return;
      }
      toast.success(kind === "seccion" ? "Sección eliminada." : "Detalle eliminado.");
      onSuccess?.();
      onOpenChange(false);    } finally {
      setPending(false);
    }
  }

  return (
    <Dialog
      open={open}
      onOpenChange={(next) => {
        if (pending && !next) return;
        onOpenChange(next);
      }}
    >
      <AppModal
        title={title}
        size="sm"
        actions={
          <div className="flex w-full justify-end gap-2">
            <Button type="button" variant="outline" disabled={pending} onClick={() => onOpenChange(false)}>
              Cancelar
            </Button>
            <Button
              type="button"
              variant="destructive"
              disabled={pending}
              onClick={() => void handleDelete()}
            >
              Eliminar
            </Button>
          </div>
        }
      >
        <p className="text-sm text-muted-foreground">
          ¿Eliminar {noun}{" "}
          <span className="font-semibold text-foreground">{label}</span>?
          {kind === "seccion" ? " También se eliminarán sus detalles." : ""} Esta acción no se puede
          deshacer.
        </p>
      </AppModal>
    </Dialog>
  );
}
