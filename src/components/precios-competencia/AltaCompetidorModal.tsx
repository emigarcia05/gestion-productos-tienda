"use client";

import { useEffect, useState } from "react";
import AppModal from "@/components/shared/AppModal";
import ModalMicroLabel from "@/components/shared/ModalMicroLabel";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Dialog } from "@/components/ui/dialog";
import { toast } from "sonner";
import { createCompetenciaAction } from "@/actions/competenciaPrecios";
import type { CompetenciaParaCliente } from "@/services/competencia.service";

interface Props {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onCreado: (competidor: CompetenciaParaCliente) => void;
}

export default function AltaCompetidorModal({ open, onOpenChange, onCreado }: Props) {
  const [nombre, setNombre] = useState("");
  const [web, setWeb] = useState("");
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (open) {
      setNombre("");
      setWeb("");
    }
  }, [open]);

  const handleGuardar = async () => {
    setSaving(true);
    try {
      const result = await createCompetenciaAction({
        nombre: nombre.trim(),
        web: web.trim(),
        configExtraccion: { reglaDefaultId: "", reglas: [] },
      });
      if (!result.ok) {
        toast.error(result.error);
        return;
      }
      toast.success("Competidor creado.");
      onOpenChange(false);
      onCreado(result.data);
    } finally {
      setSaving(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <AppModal
        size="md"
        title="Nuevo Competidor"
        actions={
          <>
            <Button
              type="button"
              variant="outline"
              disabled={saving}
              onClick={() => onOpenChange(false)}
            >
              Cancelar
            </Button>
            <Button
              type="button"
              variant="default"
              disabled={saving || !nombre.trim() || !web.trim()}
              onClick={() => void handleGuardar()}
            >
              Crear
            </Button>
          </>
        }
      >
        <div className="flex flex-col gap-3">
          <p className="text-sm text-muted-foreground">
            Después de crearlo podés configurar cómo leer el precio en su sitio.
          </p>
          <div>
            <ModalMicroLabel>Nombre</ModalMicroLabel>
            <Input
              value={nombre}
              onChange={(e) => setNombre(e.target.value)}
              placeholder="Nombre del competidor"
              className="mt-1"
            />
          </div>
          <div>
            <ModalMicroLabel>Sitio Web</ModalMicroLabel>
            <Input
              value={web}
              onChange={(e) => setWeb(e.target.value)}
              placeholder="https://ejemplo.com"
              className="mt-1"
            />
          </div>
        </div>
      </AppModal>
    </Dialog>
  );
}
