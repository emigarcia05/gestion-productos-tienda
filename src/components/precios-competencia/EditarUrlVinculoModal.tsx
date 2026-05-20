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
import type { CompetenciaConfigExtraccion } from "@/lib/competenciaConfigExtraccion";
import { ESTADO_RELEVAMIENTO_COMPETENCIA } from "@/lib/competenciaRelevamiento";

interface Props {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  codTienda: string;
  descripcion: string | null;
  competenciaId: string;
  competenciaNombre: string;
  configExtraccion: CompetenciaConfigExtraccion | null;
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
  configExtraccion,
  vinculoInicial,
  onGuardado,
}: Props) {
  const [url, setUrl] = useState("");
  const [tipoPagina, setTipoPagina] = useState("");
  const [saving, setSaving] = useState(false);

  const reglas = configExtraccion?.reglas ?? [];
  const reglaDefault =
    configExtraccion?.reglaDefaultId?.trim() || reglas[0]?.id || "";

  useEffect(() => {
    if (!open) return;
    setUrl(vinculoInicial.urlProducto ?? "");
    setTipoPagina(vinculoInicial.tipoPagina ?? reglaDefault);
  }, [open, vinculoInicial.urlProducto, vinculoInicial.tipoPagina, reglaDefault]);

  const handleGuardar = async () => {
    setSaving(true);
    try {
      const result = await guardarUrlVinculoCompetenciaAction({
        codTienda,
        competenciaId,
        urlProducto: url.trim() || undefined,
        tipoPagina: reglas.length > 0 ? tipoPagina || reglaDefault : undefined,
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
          {reglas.length > 0 ? (
            <div>
              <ModalMicroLabel>Tipo de página</ModalMicroLabel>
              <select
                className="mt-1 input-filtro-unificado w-full"
                value={tipoPagina}
                onChange={(e) => setTipoPagina(e.target.value)}
              >
                {reglas.map((r) => (
                  <option key={r.id} value={r.id}>
                    {r.nombre}
                  </option>
                ))}
              </select>
              <p className="mt-1 text-xs text-muted-foreground">
                Define qué regla de extracción (selectores) se usa para esta URL.
              </p>
            </div>
          ) : (
            <p className="text-xs text-muted-foreground">
              Sin reglas de extracción en el competidor: se usará heurística genérica (menos precisa).
              Configuralas en Gestionar Competidores.
            </p>
          )}
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
