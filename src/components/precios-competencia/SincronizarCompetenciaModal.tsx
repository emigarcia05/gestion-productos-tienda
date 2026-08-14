"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { RefreshCw, Search } from "lucide-react";
import AppModal from "@/components/shared/AppModal";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Dialog } from "@/components/ui/dialog";
import { toast } from "sonner";
import { useCompetenciaSyncStatusPoll } from "@/hooks/useCompetenciaSyncStatusPoll";
import { listCompetenciasAction } from "@/actions/competenciaPrecios";
import type { CompetenciaParaCliente } from "@/services/competencia.service";
import { matchByMultiTerm } from "@/lib/busqueda";
import { textoDiasSinActividadCompetencia } from "@/lib/competenciaUltimaComparacion";
import {
  TABLE_ROW_ACTION_ICON_CLASS,
  TABLE_ROW_ICON_BUTTON_FILLED_BRAND_CLASS,
} from "@/lib/ui-classes";
import { cn } from "@/lib/utils";

const COL_WIDTHS = [52, 28, 20] as const;

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
  const [busqueda, setBusqueda] = useState("");
  const [syncing, setSyncing] = useState(false);
  const [syncingCompetenciaId, setSyncingCompetenciaId] = useState<string | null>(null);
  const { processed, total } = useCompetenciaSyncStatusPoll(syncing);

  const cargar = useCallback(async () => {
    setLoadingLista(true);
    try {
      const rows = await listCompetenciasAction();
      setLista(rows);
    } finally {
      setLoadingLista(false);
    }
  }, []);

  useEffect(() => {
    if (open) {
      setBusqueda("");
      void cargar();
    }
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

  const listaFiltrada = useMemo(() => {
    const q = busqueda.trim();
    if (!q) return lista;
    return lista.filter((c) =>
      matchByMultiTerm([c.nombre, c.prefijoProveedor ?? "", c.web], q)
    );
  }, [lista, busqueda]);

  const handleCancelarSync = async () => {
    try {
      await fetch("/api/sync-competencia-precios/cancel", { method: "POST" });
      toast.message("Cancelación solicitada. Se detiene tras el producto en curso.");
    } catch {
      toast.error("No se pudo solicitar la cancelación.");
    }
  };

  const handleActualizar = async (c: CompetenciaParaCliente) => {
    setSyncingCompetenciaId(c.id);
    setSyncing(true);
    try {
      const res = await fetch("/api/sync-competencia-precios", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ competenciaId: c.id }),
      });
      const json = (await res.json()) as {
        ok?: boolean;
        cancelled?: boolean;
        error?: string;
        encontrados?: number;
        vacios?: number;
        errores?: number;
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
      const erroresTxt =
        (json.errores ?? 0) > 0 ? `, ${json.errores} con error` : "";
      toast.success(
        `${json.competenciaNombre ?? c.nombre}: ${json.encontrados ?? 0} con precio, ${json.vacios ?? 0} sin precio${erroresTxt}.`
      );
      await cargar();
      onCompletado();
    } catch {
      toast.error("Error de red al comparar precios.");
    } finally {
      setSyncing(false);
      setSyncingCompetenciaId(null);
    }
  };

  return (
    <Dialog open={open} onOpenChange={(v) => !syncing && onOpenChange(v)}>
      <AppModal
        size="lg"
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
            <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>
              Cerrar
            </Button>
          )
        }
      >
        <div className="flex flex-col gap-4">
          {syncing ? (
            <div
              className={cn(
                "rounded-lg border border-primary/40 bg-primary/10 px-4 py-3",
                "text-center text-sm font-semibold tracking-wide text-foreground"
              )}
              role="status"
              aria-live="polite"
            >
              {processed} de {total}
            </div>
          ) : null}

          <div className="relative">
            <Search
              className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-primary"
              aria-hidden
            />
            <Input
              value={busqueda}
              onChange={(e) => setBusqueda(e.target.value)}
              placeholder="BUSCAR COMPETIDOR..."
              disabled={syncing || loadingLista}
              className="w-full pl-9"
              aria-label="Filtrar competidores"
            />
          </div>

          {loadingLista ? (
            <p className="text-sm text-muted-foreground">Cargando competidores...</p>
          ) : lista.length === 0 ? (
            <p className="text-sm text-muted-foreground">
              No hay competidores registrados. Usá Gestionar Competidores para agregar uno.
            </p>
          ) : listaFiltrada.length === 0 ? (
            <p className="text-sm text-muted-foreground">
              Ningún competidor coincide con la búsqueda.
            </p>
          ) : (
            <div className="max-h-[50vh] overflow-y-auto rounded-md border border-border">
              <Table variant="compact" scrollX={false} className="w-full">
                <colgroup>
                  {COL_WIDTHS.map((pct, i) => (
                    <col key={i} style={{ width: `${pct}%` }} />
                  ))}
                </colgroup>
                <TableHeader>
                  <TableRow className="hover:bg-transparent">
                    <TableHead>COMPETIDOR</TableHead>
                    <TableHead className="text-center">DÍAS SIN ACT.</TableHead>
                    <TableHead className="text-center">
                      <span className="sr-only">Actualizar</span>
                    </TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {listaFiltrada.map((c) => {
                    const esFilaActiva = syncingCompetenciaId === c.id;
                    return (
                      <TableRow key={c.id}>
                        <TableCell className="celda-datos max-w-0">
                          <span className="block truncate font-medium" title={c.nombre}>
                            {c.nombre}
                          </span>
                        </TableCell>
                        <TableCell className="celda-datos text-center tabular-nums">
                          {textoDiasSinActividadCompetencia(c.ultimaComparacionAt)}
                        </TableCell>
                        <TableCell className="celda-datos p-1">
                          <div className="flex justify-center">
                            <Button
                              type="button"
                              variant="ghost"
                              size="icon"
                              disabled={syncing}
                              className={TABLE_ROW_ICON_BUTTON_FILLED_BRAND_CLASS}
                              aria-label={`Actualizar precios de ${c.nombre}`}
                              title="Actualizar"
                              onClick={() => void handleActualizar(c)}
                            >
                              <RefreshCw
                                className={cn(
                                  TABLE_ROW_ACTION_ICON_CLASS,
                                  esFilaActiva && syncing && "animate-spin"
                                )}
                                aria-hidden
                              />
                            </Button>
                          </div>
                        </TableCell>
                      </TableRow>
                    );
                  })}
                </TableBody>
              </Table>
            </div>
          )}
        </div>
      </AppModal>
    </Dialog>
  );
}
