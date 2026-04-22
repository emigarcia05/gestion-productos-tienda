"use client";

import { useEffect, useMemo, useState } from "react";
import { ChevronLeft, ChevronRight } from "lucide-react";
import AppModal from "@/components/shared/AppModal";
import { Button } from "@/components/ui/button";
import { Dialog } from "@/components/ui/dialog";
import { cn } from "@/lib/utils";

const DIAS_SEMANA = ["L", "M", "X", "J", "V", "S", "D"] as const;

function isoYmdDesdeDate(d: Date): string {
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, "0");
  const day = String(d.getDate()).padStart(2, "0");
  return `${y}-${m}-${day}`;
}

function parseIsoYmd(iso: string): Date | null {
  if (!iso || iso.length < 10) return null;
  const [yy, mm, dd] = iso.slice(0, 10).split("-").map(Number);
  if (!Number.isFinite(yy) || !Number.isFinite(mm) || !Number.isFinite(dd)) return null;
  const d = new Date(yy, mm - 1, dd);
  if (d.getFullYear() !== yy || d.getMonth() !== mm - 1 || d.getDate() !== dd) return null;
  return d;
}

function inicioSemanaLunes(d: Date): number {
  const js = d.getDay();
  return js === 0 ? 6 : js - 1;
}

export interface FiltroRangoFechasCalendarioModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  /** Valores aplicados al abrir (YYYY-MM-DD). */
  fechaDesde: string;
  fechaHasta: string;
  /** Se llama al completar el segundo click en el calendario (rango normalizado). */
  onAplicarRango: (desde: string, hasta: string) => void;
  onLimpiar: () => void;
}

/**
 * Modal con calendario mensual: primer click en día = fecha desde, segundo = fecha hasta.
 * Si el segundo día es anterior al primero, se intercambian. Al completar se aplica y cierra.
 */
export default function FiltroRangoFechasCalendarioModal({
  open,
  onOpenChange,
  fechaDesde,
  fechaHasta,
  onAplicarRango,
  onLimpiar,
}: FiltroRangoFechasCalendarioModalProps) {
  const [mesCursor, setMesCursor] = useState(() => {
    const base = parseIsoYmd(fechaDesde) ?? new Date();
    return new Date(base.getFullYear(), base.getMonth(), 1);
  });
  const [draftDesde, setDraftDesde] = useState("");
  const [draftHasta, setDraftHasta] = useState("");

  useEffect(() => {
    if (!open) return;
    setDraftDesde(fechaDesde);
    setDraftHasta(fechaHasta);
    const base = parseIsoYmd(fechaDesde) ?? parseIsoYmd(fechaHasta) ?? new Date();
    setMesCursor(new Date(base.getFullYear(), base.getMonth(), 1));
  }, [open, fechaDesde, fechaHasta]);

  const celdasMes = useMemo(() => {
    const y = mesCursor.getFullYear();
    const m = mesCursor.getMonth();
    const primer = new Date(y, m, 1);
    const diasEnMes = new Date(y, m + 1, 0).getDate();
    const offset = inicioSemanaLunes(primer);
    const celdas: Array<{ dia: number | null; iso: string }> = [];
    for (let i = 0; i < offset; i += 1) {
      celdas.push({ dia: null, iso: "" });
    }
    for (let dia = 1; dia <= diasEnMes; dia += 1) {
      const d = new Date(y, m, dia);
      celdas.push({ dia, iso: isoYmdDesdeDate(d) });
    }
    while (celdas.length % 7 !== 0) {
      celdas.push({ dia: null, iso: "" });
    }
    return celdas;
  }, [mesCursor]);

  function tituloMes(): string {
    return mesCursor.toLocaleDateString("es-AR", { month: "long", year: "numeric" });
  }

  function onClickDia(iso: string) {
    if (!iso) return;
    if (!draftDesde || (draftDesde && draftHasta)) {
      setDraftDesde(iso);
      setDraftHasta("");
      return;
    }
    let desde = draftDesde;
    let hasta = iso;
    if (hasta < desde) {
      const t = desde;
      desde = hasta;
      hasta = t;
    }
    setDraftDesde(desde);
    setDraftHasta(hasta);
    onAplicarRango(desde, hasta);
    onOpenChange(false);
  }

  function esDiaEnRango(iso: string): boolean {
    if (!draftDesde || !iso) return false;
    if (!draftHasta) return iso === draftDesde;
    return iso >= draftDesde && iso <= draftHasta;
  }

  function esExtremo(iso: string): boolean {
    return iso === draftDesde || iso === draftHasta;
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <AppModal
        title="Rango De Fechas"
        size="md"
        actions={
          <>
            <Button
              type="button"
              variant="outline"
              onClick={() => {
                onLimpiar();
                onOpenChange(false);
              }}
            >
              Limpiar
            </Button>
            <Button type="button" onClick={() => onOpenChange(false)}>
              Cerrar
            </Button>
          </>
        }
      >
        <div className="flex flex-col gap-3">
          <p className="text-xs text-muted-foreground uppercase tracking-wide">
            PRIMER CLICK EN EL CALENDARIO: FECHA DESDE. SEGUNDO CLICK: FECHA HASTA. AL ELEGIR LA
            SEGUNDA FECHA SE APLICA EL FILTRO.
          </p>
          <div className="flex items-center justify-between gap-2">
            <Button
              type="button"
              variant="outline"
              size="icon"
              className="h-9 w-9 shrink-0"
              aria-label="Mes anterior"
              onClick={() =>
                setMesCursor((prev) => new Date(prev.getFullYear(), prev.getMonth() - 1, 1))
              }
            >
              <ChevronLeft className="h-4 w-4" aria-hidden />
            </Button>
            <span className="min-w-0 flex-1 text-center text-sm font-semibold capitalize text-foreground">
              {tituloMes()}
            </span>
            <Button
              type="button"
              variant="outline"
              size="icon"
              className="h-9 w-9 shrink-0"
              aria-label="Mes siguiente"
              onClick={() =>
                setMesCursor((prev) => new Date(prev.getFullYear(), prev.getMonth() + 1, 1))
              }
            >
              <ChevronRight className="h-4 w-4" aria-hidden />
            </Button>
          </div>
          <div
            className="grid grid-cols-7 gap-1 text-center text-xs"
            role="grid"
            aria-label="Calendario de rango de fechas"
          >
            {DIAS_SEMANA.map((d) => (
              <div
                key={d}
                className="py-1 font-medium text-muted-foreground"
                role="columnheader"
              >
                {d}
              </div>
            ))}
            {celdasMes.map((celda, idx) => {
              if (celda.dia === null) {
                return <div key={`empty-${idx}`} className="h-9" />;
              }
              const enRango = esDiaEnRango(celda.iso);
              const extremo = esExtremo(celda.iso);
              return (
                <button
                  key={celda.iso}
                  type="button"
                  role="gridcell"
                  className={cn(
                    "h-9 rounded-md text-sm tabular-nums transition-colors",
                    enRango && "bg-primary/15 text-foreground",
                    extremo && "bg-primary font-semibold text-primary-foreground",
                    !enRango && "hover:bg-muted"
                  )}
                  onClick={() => onClickDia(celda.iso)}
                >
                  {celda.dia}
                </button>
              );
            })}
          </div>
          {(draftDesde || draftHasta) && (
            <p className="text-xs text-muted-foreground tabular-nums uppercase">
              {draftDesde ? `DESDE: ${draftDesde}` : ""}
              {draftDesde && draftHasta ? " · " : ""}
              {draftHasta ? `HASTA: ${draftHasta}` : draftDesde ? " · ELEGÍ FECHA HASTA" : ""}
            </p>
          )}
        </div>
      </AppModal>
    </Dialog>
  );
}
