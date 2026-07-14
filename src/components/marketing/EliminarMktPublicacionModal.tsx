"use client";

import { useState } from "react";
import { toast } from "sonner";
import { Dialog } from "@/components/ui/dialog";
import AppModal from "@/components/shared/AppModal";
import { Button } from "@/components/ui/button";
import { eliminarMktPublicacionAction } from "@/actions/mktPublicaciones";

interface Props {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  id: string | null;
  label: string | null;
  onSuccess?: () => void;
}

export default function EliminarMktPublicacionModal({
  open,
  onOpenChange,
  id,
  label,
  onSuccess,
}: Props) {
  const [pending, setPending] = useState(false);

  async function handleDelete() {
    if (!id) return;
    setPending(true);
    try {
      const res = await eliminarMktPublicacionAction({ id });
      if (!res.ok) {
        toast.error(res.error ?? "No se pudo eliminar.");
        return;
      }
      toast.success("Publicación eliminada.");
      onSuccess?.();
      onOpenChange(false);
    } finally {
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
        title="Eliminar Publicación"
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
        <p className="text-sm text-foreground">
          ¿Confirmás eliminar{label ? ` “${label.slice(0, 80)}${label.length > 80 ? "…" : ""}”` : " esta publicación"}?
        </p>
      </AppModal>
    </Dialog>
  );
}
