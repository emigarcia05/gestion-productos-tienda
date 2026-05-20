"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { RefreshCw } from "lucide-react";
import AppModal from "@/components/shared/AppModal";
import ModalMicroLabel from "@/components/shared/ModalMicroLabel";
import { Button } from "@/components/ui/button";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Dialog } from "@/components/ui/dialog";
import { toast } from "sonner";
import { cn } from "@/lib/utils";
import { listCompetenciasAction } from "@/actions/competenciaPrecios";
import type { CompetenciaParaCliente } from "@/services/competencia.service";
import { labelUltimaComparacionCompetencia } from "@/lib/competenciaUltimaComparacion";

interface Props {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onCompletado: () => void;
}

export default function SincronizarCompetenciaModal({
  open,
  onOpenChange,
  onCompletado,
}: Props) {
  const [lista, setLista] = useState<CompetenciaParaCliente[]>([]);
  const [loadingLista, setLoadingLista] = useState(false);
  const [competenciaId, setCompetenciaId] = useState("");
  const [syncing, setSyncing] = useState(false);

  const cargar = useCallback(async () => {
    setLoadingLista(true);
    try {
      const rows = await listCompetenciasAction();
      setLista(rows);
      if (rows.length === 1) setCompetenciaId(rows[0].id);
    } finally {
      setLoadingLista(false);
    }
  }, []);

  useEffect(() => {
    if (open) void cargar();
  }, [open, cargar]);

  const seleccionado = useMemo(
    () => lista.find((c) => c.id === competenciaId) ?? null,
    [lista, competenciaId]
  );

  const handleSync = async () => {
    if (!competenciaId) {
      toast.error("Seleccioná un competidor.");
      return;
    }
    setSyncing(true);
    try {
      const res = await fetch("/api/sync-competencia-precios", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ competenciaId }),
      });
      const json = (await res.json()) as {
        ok?: boolean;
        error?: string;
        encontrados?: number;
        vacios?: number;
        competenciaNombre?: string;
      };
      if (!res.ok || !json.ok) {
        toast.error(json.error ?? "No se pudo comparar precios.");
        return;
      }
      toast.success(
        `${json.competenciaNombre ?? "Competidor"}: ${json.encontrados ?? 0} con precio, ${json.vacios ?? 0} sin precio.`
      );
      onOpenChange(false);
      onCompletado();
    } catch {
      toast.error("Error de red al comparar precios.");
    } finally {
      setSyncing(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <AppModal
        size="md"
        title="Comparar Precios Competencia"
        actions={
          <>
            <Button type="button" variant="outline" onClick={() => onOpenChange(false)} disabled={syncing}>
              Cancelar
            </Button>
            <Button
              type="button"
              variant="default"
              className="btn-primario-gestion gap-2"
              disabled={syncing || !competenciaId || lista.length === 0}
              onClick={() => void handleSync()}
            >
              <RefreshCw className={cn("h-4 w-4 shrink-0", syncing && "animate-spin")} />
              Comparar Precios
            </Button>
          </>
        }
      >
        <div className="flex flex-col gap-4">
          {loadingLista ? (
            <p className="text-sm text-muted-foreground">Cargando competidores...</p>
          ) : lista.length === 0 ? (
            <p className="text-sm text-muted-foreground">
              No hay competidores registrados. Usá Gestionar Competidores para agregar uno.
            </p>
          ) : (
            <>
              <div>
                <ModalMicroLabel>Competidor</ModalMicroLabel>
                <Select value={competenciaId || undefined} onValueChange={setCompetenciaId}>
                  <SelectTrigger className="mt-1 w-full">
                    <SelectValue placeholder="SELECCIONAR COMPETIDOR" />
                  </SelectTrigger>
                  <SelectContent position="popper" side="bottom" align="start">
                    {lista.map((c) => (
                      <SelectItem key={c.id} value={c.id}>
                        {c.nombre}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              {seleccionado ? (
                <p className="text-sm text-muted-foreground">
                  {labelUltimaComparacionCompetencia(seleccionado.ultimaComparacionAt)}
                </p>
              ) : null}
              <p className="text-xs text-muted-foreground">
                Solo se actualizarán los precios de la columna del competidor elegido (más rápido que
                comparar todos a la vez).
              </p>
            </>
          )}
        </div>
      </AppModal>
    </Dialog>
  );
}
