"use client";

import { useEffect, useState } from "react";
import { toast } from "sonner";
import { Dialog } from "@/components/ui/dialog";
import AppModal from "@/components/shared/AppModal";
import ModalMicroLabel from "@/components/shared/ModalMicroLabel";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  crearMktIdeaSeccionAction,
  editarMktIdeaSeccionAction,
} from "@/actions/mktPublicacionesIdeas";

interface Props {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  modo: "crear" | "editar";
  id?: string;
  nombreInicial?: string;
  onSuccess?: () => void;
}

export default function CrearEditarMktIdeaSeccionModal({
  open,
  onOpenChange,
  modo,
  id,
  nombreInicial = "",
  onSuccess,
}: Props) {
  const [nombre, setNombre] = useState("");
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (!open) return;
    setNombre(modo === "editar" ? nombreInicial : "");
  }, [open, modo, nombreInicial]);

  async function handleSubmit() {
    if (!nombre.trim() || saving) return;
    if (modo === "editar" && !id) return;
    setSaving(true);
    try {
      const res =
        modo === "crear"
          ? await crearMktIdeaSeccionAction({ nombre })
          : await editarMktIdeaSeccionAction({ id: id!, nombre });
      if (!res.ok) {
        toast.error(res.error ?? "No se pudo guardar.");
        return;
      }
      toast.success(modo === "crear" ? "Sección creada." : "Sección actualizada.");
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
        title={modo === "crear" ? "Nueva Sección" : "Editar Sección"}
        size="sm"
        actions={
          <div className="flex w-full justify-end gap-2">
            <Button type="button" variant="outline" disabled={saving} onClick={() => onOpenChange(false)}>
              Cancelar
            </Button>
            <Button
              type="button"
              disabled={saving || !nombre.trim()}
              onClick={() => void handleSubmit()}
            >
              Guardar
            </Button>
          </div>
        }
      >
        <div className="flex flex-col gap-1">
          <ModalMicroLabel>Nombre</ModalMicroLabel>
          <Input
            value={nombre}
            onChange={(e) => setNombre(e.target.value.toLocaleUpperCase("es-AR"))}
            placeholder="Nombre (se guardará en mayúsculas)"
            disabled={saving}
            autoFocus
            onKeyDown={(e) => {
              if (e.key === "Enter") {
                e.preventDefault();
                void handleSubmit();
              }
            }}
          />
        </div>
      </AppModal>
    </Dialog>
  );
}
