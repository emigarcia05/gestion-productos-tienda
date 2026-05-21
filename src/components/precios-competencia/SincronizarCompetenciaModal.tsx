"use client";

import { useCallback, useEffect, useState } from "react";
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
import { listCompetenciasAction } from "@/actions/competenciaPrecios";
import type { CompetenciaParaCliente } from "@/services/competencia.service";

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

  useEffect(() => {
    if (!open) return;
    fetch("/api/sync-competencia-precios/status")
      .then((res) => (res.ok ? res.json() : null))
      .then((data: { running?: boolean } | null) => {
        if (data?.running) setSyncing(true);
      })
      .catch(() => {});
  }, [open]);

  const handleCancelarSync = async () => {
    try {
      await fetch("/api/sync-competencia-precios/cancel", { method: "POST" });
      toast.message("Cancelación solicitada. Se detiene tras el producto en curso.");
    } catch {
      toast.error("No se pudo solicitar la cancelación.");
    }
  };

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
        cancelled?: boolean;
        error?: string;
        encontrados?: number;
        vacios?: number;
        competenciaNombre?: string;
      };
      if (json.cancelled) {
        toast.message(json.error ?? "Comparación cancelada.");
        return;
      }
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
    <Dialog open={open} onOpenChange={(v) => !syncing && onOpenChange(v)}>
      <AppModal
        size="md"
        title="Comparar Precios Competencia"
        actions={
          syncing ? (
            <>
              <Button type="button" variant="outline" onClick={() => void handleCancelarSync()}>
                Detener Comparación
              </Button>
              <Button type="button" variant="default" disabled className="gap-2">
                <RefreshCw className="h-4 w-4 shrink-0 animate-spin" />
                Comparando...
              </Button>
            </>
          ) : (
            <>
              <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>
                Cancelar
              </Button>
              <Button
                type="button"
                variant="default"
                className="btn-primario-gestion gap-2"
                disabled={!competenciaId || lista.length === 0}
                onClick={() => void handleSync()}
              >
                <RefreshCw className="h-4 w-4 shrink-0" />
                Comparar Precios
              </Button>
            </>
          )
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
            <div>
              <ModalMicroLabel>Competidor</ModalMicroLabel>
              <Select
                value={competenciaId || undefined}
                onValueChange={setCompetenciaId}
                disabled={syncing}
              >
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
          )}
        </div>
      </AppModal>
    </Dialog>
  );
}
