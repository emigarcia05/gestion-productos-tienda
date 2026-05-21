"use client";

import { useEffect, useState } from "react";
import AppModal from "@/components/shared/AppModal";
import ModalMicroLabel from "@/components/shared/ModalMicroLabel";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Dialog } from "@/components/ui/dialog";
import { toast } from "sonner";
import { updateCompetenciaAction } from "@/actions/competenciaPrecios";
import type { CompetenciaParaCliente } from "@/services/competencia.service";
import {
  type CompetenciaConfigExtraccion,
} from "@/lib/competenciaConfigExtraccion";
import CompetenciaExtraccionReglasEditor from "@/components/precios-competencia/CompetenciaExtraccionReglasEditor";

interface Props {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  competidor: CompetenciaParaCliente | null;
  onGuardado: () => void;
}

const CONFIG_VACIA: CompetenciaConfigExtraccion = { reglaDefaultId: "", reglas: [] };

export default function ConfiguracionCompetidorModal({
  open,
  onOpenChange,
  competidor,
  onGuardado,
}: Props) {
  const [nombre, setNombre] = useState("");
  const [web, setWeb] = useState("");
  const [configExtraccion, setConfigExtraccion] =
    useState<CompetenciaConfigExtraccion>(CONFIG_VACIA);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (!open || !competidor) return;
    setNombre(competidor.nombre);
    setWeb(competidor.web);
    setConfigExtraccion(competidor.configExtraccion ?? CONFIG_VACIA);
  }, [open, competidor]);

  const handleGuardar = async () => {
    if (!competidor) return;
    setSaving(true);
    try {
      const result = await updateCompetenciaAction({
        id: competidor.id,
        nombre: nombre.trim(),
        web: web.trim(),
        configExtraccion,
      });
      if (!result.ok) {
        toast.error(result.error);
        return;
      }
      toast.success("Configuración guardada.");
      onOpenChange(false);
      onGuardado();
    } finally {
      setSaving(false);
    }
  };

  if (!competidor) return null;

  const tituloNombre = (nombre.trim() || competidor.nombre).toLocaleUpperCase("es");
  const titulo = `Configuracion Competidor - ${tituloNombre}`;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <AppModal
        size="xl"
        title={titulo}
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
              Guardar
            </Button>
          </>
        }
      >
        <div className="flex flex-col gap-4 max-h-[70vh] overflow-y-auto pr-1">
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
          <CompetenciaExtraccionReglasEditor
            value={configExtraccion}
            onChange={setConfigExtraccion}
          />
        </div>
      </AppModal>
    </Dialog>
  );
}
