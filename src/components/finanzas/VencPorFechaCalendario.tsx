import Link from "next/link";
import { ChevronLeft, ChevronRight } from "lucide-react";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import type { CeldaCalendario } from "@/lib/calendarioMesFinanzas";

const DIAS_SEMANA = ["LUN", "MAR", "MIÉ", "JUE", "VIE", "SÁB", "DOM"] as const;

export interface VencPorFechaItem {
  nombre: string;
  saldo: string;
}

function fmtMonto(s: string): string {
  const n = Number(s);
  if (!Number.isFinite(n)) return "";
  return `$${n.toLocaleString("es-AR", {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  })}`;
}

export interface VencPorFechaCalendarioProps {
  tituloMes: string;
  mesYm: string;
  mesAnteriorYm: string;
  mesSiguienteYm: string;
  celdas: CeldaCalendario[];
  porDia: Record<string, VencPorFechaItem[]>;
}

export default function VencPorFechaCalendario({
  tituloMes,
  mesYm,
  mesAnteriorYm,
  mesSiguienteYm,
  celdas,
  porDia,
}: VencPorFechaCalendarioProps) {
  return (
    <div className="flex flex-1 min-h-0 flex-col gap-3 px-4 pb-4 pt-1 sm:px-6 lg:px-8">
      <div className="flex shrink-0 flex-wrap items-center justify-between gap-3">
        <div>
          <h2 className="text-base font-semibold text-foreground sm:text-lg">{tituloMes}</h2>
          <p className="text-xs text-muted-foreground tabular-nums">{mesYm}</p>
        </div>
        <div className="flex items-center gap-1">
          <Button type="button" variant="outline" size="icon" className="h-9 w-9 shrink-0" asChild>
            <Link href={`/finanzas/venc-por-fecha?mes=${mesAnteriorYm}`} aria-label="Mes anterior">
              <ChevronLeft className="h-4 w-4" aria-hidden />
            </Link>
          </Button>
          <Button type="button" variant="outline" size="icon" className="h-9 w-9 shrink-0" asChild>
            <Link href={`/finanzas/venc-por-fecha?mes=${mesSiguienteYm}`} aria-label="Mes siguiente">
              <ChevronRight className="h-4 w-4" aria-hidden />
            </Link>
          </Button>
        </div>
      </div>

      <div className="grid min-h-0 flex-1 grid-cols-7 gap-1.5 sm:gap-2 content-start">
        {DIAS_SEMANA.map((d) => (
          <div
            key={d}
            className="pb-1 text-center text-[10px] font-semibold uppercase tracking-wide text-muted-foreground sm:text-xs"
          >
            {d}
          </div>
        ))}
        {celdas.map((celda, i) => (
          <div key={i} className="min-h-0 w-full min-w-0">
            {celda.isoYmd != null && celda.dia != null ? (
              <div
                className={cn(
                  "flex w-full min-h-[6.5rem] flex-col overflow-hidden rounded-md border border-[#0072BB] bg-card aspect-[4/5]"
                )}
              >
                <div className="flex min-h-[2rem] shrink-0 items-center justify-center border-b border-border bg-muted/40 px-1 py-1.5 text-sm font-semibold tabular-nums">
                  {celda.dia}
                </div>
                <div className="flex min-h-0 flex-1 flex-col gap-1 overflow-y-auto p-1.5">
                  {(() => {
                    const itemsDia = porDia[celda.isoYmd] ?? [];
                    const totalDia = itemsDia.reduce((acc, item) => acc + Number(item.saldo || 0), 0);
                    if (!Number.isFinite(totalDia) || totalDia <= 0) return null;
                    return (
                      <div className="rounded border border-destructive/50 bg-destructive/75 px-1 py-0.5 text-center text-[10px] leading-tight text-primary-foreground shadow-sm sm:text-[11px]">
                        <div className="tabular-nums font-bold text-primary-foreground">{fmtMonto(String(totalDia))}</div>
                      </div>
                    );
                  })()}
                </div>
              </div>
            ) : (
              <div className="aspect-[4/5] min-h-[6.5rem] w-full rounded-md bg-muted/15" aria-hidden />
            )}
          </div>
        ))}
      </div>
    </div>
  );
}
