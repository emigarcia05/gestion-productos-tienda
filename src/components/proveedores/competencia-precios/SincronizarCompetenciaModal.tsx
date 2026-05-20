"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { RefreshCw } from "lucide-react";
import AppModal from "@/components/shared/AppModal";
import ModalMicroLabel from "@/components/shared/ModalMicroLabel";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
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
import {
  countVinculosConUrlCompetenciaAction,
  listCompetenciasAction,
} from "@/actions/competenciaPrecios";
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
  const [limiteProductos, setLimiteProductos] = useState("");
  const [urlsCargadas, setUrlsCargadas] = useState(0);
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
    if (!competenciaId) {
      setUrlsCargadas(0);
      return;
    }
    void countVinculosConUrlCompetenciaAction(competenciaId).then(setUrlsCargadas);
  }, [competenciaId, open]);

  const consultasPrevistas = useMemo(() => {
    const lim = limiteProductos.trim();
    if (!lim) return urlsCargadas;
    const n = parseInt(lim, 10);
    if (Number.isNaN(n) || n < 1) return urlsCargadas;
    return Math.min(urlsCargadas, n);
  }, [urlsCargadas, limiteProductos]);

  const seleccionado = useMemo(
    () => lista.find((c) => c.id === competenciaId) ?? null,
    [lista, competenciaId]
  );

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
    const limiteRaw = limiteProductos.trim();
    const limiteParsed = limiteRaw ? parseInt(limiteRaw, 10) : undefined;
    if (limiteRaw && (Number.isNaN(limiteParsed) || limiteParsed! < 1 || limiteParsed! > 500)) {
      toast.error("El máximo debe estar entre 1 y 500 (o vacío para todas las URL cargadas).");
      return;
    }

    setSyncing(true);
    try {
      const body: { competenciaId: string; limiteProductos?: number } = { competenciaId };
      if (limiteParsed != null && limiteParsed > 0) body.limiteProductos = limiteParsed;

      const res = await fetch("/api/sync-competencia-precios", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(body),
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
                disabled={!competenciaId || lista.length === 0 || urlsCargadas === 0}
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
            <>
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
              <div>
                <ModalMicroLabel>Máx. Productos (Prueba)</ModalMicroLabel>
                <Input
                  type="number"
                  min={1}
                  max={500}
                  value={limiteProductos}
                  onChange={(e) => setLimiteProductos(e.target.value)}
                  placeholder="10"
                  className="mt-1"
                  disabled={syncing}
                />
                <p className="mt-1 text-xs text-muted-foreground">
                  Opcional: tope para pruebas (ej. 5). Vacío = consultar todas las URL cargadas del
                  competidor.
                </p>
              </div>
              {competenciaId ? (
                <p className="text-sm font-medium text-foreground">
                  {urlsCargadas === 0
                    ? "No hay URL cargadas para este competidor. Asigná enlaces en la grilla antes de comparar."
                    : `Se realizarán ${consultasPrevistas} consulta(s) HTTP (una por URL cargada).`}
                </p>
              ) : null}
              {seleccionado ? (
                <p className="text-sm text-muted-foreground">
                  {labelUltimaComparacionCompetencia(seleccionado.ultimaComparacionAt)}
                </p>
              ) : null}
              {syncing ? (
                <p className="text-sm text-muted-foreground">
                  Si tarda mucho, usá Detener Comparación. También podés reiniciar{" "}
                  <code className="text-xs">npm run dev</code> en la terminal del servidor.
                </p>
              ) : null}
            </>
          )}
        </div>
      </AppModal>
    </Dialog>
  );
}
