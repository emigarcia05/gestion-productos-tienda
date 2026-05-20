"use client";

import { useEffect, useState } from "react";
import AppModal from "@/components/shared/AppModal";
import ModalMicroLabel from "@/components/shared/ModalMicroLabel";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Dialog } from "@/components/ui/dialog";
import { toast } from "sonner";
import { guardarUrlVinculoCompetenciaAction } from "@/actions/competenciaPrecios";
import type { DatoVinculoCompetenciaCliente } from "@/services/competenciaVinculo.service";
import { ESTADO_RELEVAMIENTO_COMPETENCIA } from "@/lib/competenciaRelevamiento";

interface Props {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  codTienda: string;
  descripcion: string | null;
  competenciaId: string;
  competenciaNombre: string;
  vinculoInicial: DatoVinculoCompetenciaCliente;
  onGuardado: () => void;
}

export default function EditarUrlVinculoModal({
  open,
  onOpenChange,
  codTienda,
  descripcion,
  competenciaId,
  competenciaNombre,
  vinculoInicial,
  onGuardado,
}: Props) {
  const [url, setUrl] = useState("");
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (open) setUrl(vinculoInicial.urlProducto ?? "");
  }, [open, vinculoInicial.urlProducto]);

  const handleGuardar = async () => {
    setSaving(true);
    try {
      const result = await guardarUrlVinculoCompetenciaAction({
        codTienda,
        competenciaId,
        urlProducto: url.trim() || undefined,
      });
      if (!result.ok) {
        toast.error(result.error);
        return;
      }
      toast.success("URL guardada. El precio se obtiene al ejecutar Comparar Precios.");
      onOpenChange(false);
      onGuardado();
    } finally {
      setSaving(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <AppModal
        size="lg"
        title="Url Ficha Competidor"
        actions={
          <>
            <Button type="button" variant="outline" onClick={() => onOpenChange(false)} disabled={saving}>
              Cancelar
            </Button>
            <Button type="button" variant="default" disabled={saving} onClick={() => void handleGuardar()}>
              Guardar URL
            </Button>
          </>
        }
      >
        <div className="flex flex-col gap-3">
          <p className="text-sm text-foreground">
            <span className="font-semibold">{codTienda}</span>
            {descripcion ? ` — ${descripcion}` : null}
          </p>
          <p className="text-sm text-muted-foreground">Competidor: {competenciaNombre}</p>
          {vinculoInicial.estado === ESTADO_RELEVAMIENTO_COMPETENCIA.ERROR &&
          vinculoInicial.errorMensaje ? (
            <p className="text-sm text-destructive rounded-md border border-border bg-muted/50 p-2">
              Error previo: {vinculoInicial.errorMensaje}
            </p>
          ) : null}
          <div>
            <ModalMicroLabel>Url Del Producto</ModalMicroLabel>
            <Input
              value={url}
              onChange={(e) => setUrl(e.target.value)}
              placeholder="https://competidor.com/producto/..."
              className="mt-1"
            />
            <p className="mt-1 text-xs text-muted-foreground">
              Solo se guarda el enlace (no se consulta el sitio ahora). Dejá vacío para quitar el
              vínculo. El precio se busca al ejecutar Comparar Precios para ese competidor.
            </p>
          </div>
        </div>
      </AppModal>
    </Dialog>
  );
}
