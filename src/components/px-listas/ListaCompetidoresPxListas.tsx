"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { Loader2, RefreshCw, Search } from "lucide-react";
import { INPUT_FILTER_CLASS } from "@/components/FilterBar";
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
import { toast } from "sonner";
import { useCompetenciaSyncStatusPoll } from "@/hooks/useCompetenciaSyncStatusPoll";
import { matchByMultiTerm } from "@/lib/busqueda";
import {
  getDiasSinActividadCompetencia,
  labelDiasSinActividadCompetencia,
} from "@/lib/competenciaDiasSinActividad";
import type { CompetenciaParaCliente } from "@/services/competencia.service";
import { cn } from "@/lib/utils";

const COL_WIDTHS = [52, 22, 26] as const;

interface Props {
  competencias: CompetenciaParaCliente[];
  puedeActualizar: boolean;
  onActualizado: () => void;
  className?: string;
}

export default function ListaCompetidoresPxListas({
  competencias,
  puedeActualizar,
  onActualizado,
  className,
}: Props) {
  const [busqueda, setBusqueda] = useState("");
  const [syncingId, setSyncingId] = useState<string | null>(null);
  const [pollSync, setPollSync] = useState(false);
  const syncStatus = useCompetenciaSyncStatusPoll(pollSync || syncingId !== null);

  useEffect(() => {
    fetch("/api/sync-competencia-precios/status")
      .then((res) => (res.ok ? res.json() : null))
      .then((data: { running?: boolean } | null) => {
        if (data?.running) setPollSync(true);
      })
      .catch(() => {});
  }, []);

  useEffect(() => {
    if (syncStatus.running) setPollSync(true);
    if (!syncStatus.running && syncStatus.done && pollSync) {
      setPollSync(false);
    }
  }, [syncStatus.running, syncStatus.done, pollSync]);

  const listaFiltrada = useMemo(() => {
    const q = busqueda.trim();
    if (!q) return competencias;
    return competencias.filter((c) => matchByMultiTerm([c.nombre, c.web], q));
  }, [competencias, busqueda]);

  const syncGlobalOcupado = syncStatus.running;

  const actualizarCompetidor = useCallback(
    async (c: CompetenciaParaCliente) => {
      if (!puedeActualizar || syncGlobalOcupado) return;
      setSyncingId(c.id);
      setPollSync(true);
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
          toast.error(json.error ?? "No se pudo actualizar precios.");
          return;
        }
        const erroresTxt =
          (json.errores ?? 0) > 0 ? `, ${json.errores} con error` : "";
        toast.success(
          `${json.competenciaNombre ?? c.nombre}: ${json.encontrados ?? 0} con precio, ${json.vacios ?? 0} sin precio${erroresTxt}.`
        );
        onActualizado();
      } catch {
        toast.error("Error de red al actualizar precios.");
      } finally {
        setSyncingId(null);
      }
    },
    [puedeActualizar, syncGlobalOcupado, onActualizado]
  );

  return (
    <aside
      className={cn(
        "flex min-h-0 w-80 shrink-0 flex-col gap-2 rounded-lg border border-border bg-card p-3 shadow-sm",
        className
      )}
      aria-label="Competidores"
    >
      <div className="relative shrink-0">
        <Search
          className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-primary"
          aria-hidden
        />
        <Input
          value={busqueda}
          onChange={(e) => setBusqueda(e.target.value)}
          placeholder="Buscar competidor..."
          className={cn("w-full pl-9", INPUT_FILTER_CLASS)}
          aria-label="Filtrar competidores"
        />
      </div>

      <div className="contenedor-tabla-gestion min-h-0 flex-1">
        <Table variant="compact" scrollX={false} className="w-full">
          <colgroup>
            {COL_WIDTHS.map((pct, i) => (
              <col key={i} style={{ width: `${pct}%` }} />
            ))}
          </colgroup>
          <TableHeader>
            <TableRow className="hover:bg-transparent">
              <TableHead>COMPETIDOR</TableHead>
              <TableHead className="text-center whitespace-nowrap">DÍAS SIN ACT.</TableHead>
              <TableHead className="text-center">ACCIONES</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {competencias.length === 0 ? (
              <TableRow>
                <TableCell colSpan={3} className="text-center text-sm text-muted-foreground py-4">
                  No hay competidores registrados.
                </TableCell>
              </TableRow>
            ) : listaFiltrada.length === 0 ? (
              <TableRow>
                <TableCell colSpan={3} className="text-center text-sm text-muted-foreground py-4">
                  Ningún competidor coincide con la búsqueda.
                </TableCell>
              </TableRow>
            ) : (
              listaFiltrada.map((c) => {
                const dias = getDiasSinActividadCompetencia(c.ultimaComparacionAt);
                const enCurso = syncingId === c.id;
                const deshabilitado =
                  !puedeActualizar || syncGlobalOcupado || enCurso;
                return (
                  <TableRow key={c.id}>
                    <TableCell className="celda-datos max-w-0">
                      <span className="block truncate font-medium" title={c.nombre}>
                        {c.nombre}
                      </span>
                    </TableCell>
                    <TableCell className="celda-datos text-center tabular-nums">
                      {labelDiasSinActividadCompetencia(dias)}
                    </TableCell>
                    <TableCell className="celda-datos p-1">
                      <div className="flex justify-center">
                        {puedeActualizar ? (
                          <Button
                            type="button"
                            variant="default"
                            size="sm"
                            className="btn-primario-gestion h-8 gap-1.5 px-2.5 text-xs"
                            disabled={deshabilitado}
                            aria-label={`Actualizar precios de ${c.nombre}`}
                            title="Actualizar"
                            onClick={() => void actualizarCompetidor(c)}
                          >
                            {enCurso ? (
                              <Loader2 className="h-3.5 w-3.5 shrink-0 animate-spin" aria-hidden />
                            ) : (
                              <RefreshCw className="h-3.5 w-3.5 shrink-0" aria-hidden />
                            )}
                            Actualizar
                          </Button>
                        ) : (
                          <span className="text-xs text-muted-foreground">—</span>
                        )}
                      </div>
                    </TableCell>
                  </TableRow>
                );
              })
            )}
          </TableBody>
        </Table>
      </div>
    </aside>
  );
}
