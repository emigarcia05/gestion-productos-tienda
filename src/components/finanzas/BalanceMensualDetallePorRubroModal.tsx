"use client";

import { Dialog } from "@/components/ui/dialog";
import AppModal from "@/components/shared/AppModal";
import { Button } from "@/components/ui/button";
import { fmtPrecio } from "@/lib/format";
import type { BalanceMensualRubroAgrupado } from "@/lib/balanceMensualDetalle";

function fmtMonto(n: number) {
  if (n === 0) return "—";
  return `$${fmtPrecio(n)}`;
}

interface Props {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  titulo: string;
  subtitulo: string;
  rubros: BalanceMensualRubroAgrupado[];
  onElegirRubro: (rubro: BalanceMensualRubroAgrupado) => void;
}

export default function BalanceMensualDetallePorRubroModal({
  open,
  onOpenChange,
  titulo,
  subtitulo,
  rubros,
  onElegirRubro,
}: Props) {
  const total = rubros.reduce((a, r) => a + r.monto, 0);

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <AppModal
        title={titulo}
        size="xl"
        className="sm:max-w-3xl"
        bodyClassName="flex flex-col min-h-0 max-h-[min(28rem,55vh)]"
        scrollBody={false}
        actions={
          <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>
            Cerrar
          </Button>
        }
      >
        <div className="flex min-h-0 flex-1 flex-col gap-3 text-sm">
          <p className="shrink-0 text-xs text-muted-foreground">{subtitulo}</p>
          {rubros.length === 0 ? (
            <p className="text-muted-foreground">No hay imputaciones para este concepto en el periodo.</p>
          ) : (
            <>
              <div className="min-h-0 flex-1 overflow-auto rounded-md border border-border">
                <table className="w-full min-w-[20rem] border-collapse text-sm">
                  <thead>
                    <tr className="border-b border-border bg-muted/50 text-left text-xs font-semibold uppercase tracking-wide text-muted-foreground">
                      <th className="px-3 py-2">Rubro</th>
                      <th className="px-3 py-2 text-right">Monto</th>
                    </tr>
                  </thead>
                  <tbody>
                    {rubros.map((r) => (
                      <tr key={r.clave} className="border-b border-border/80 last:border-b-0">
                        <td className="px-3 py-2 align-middle">
                          <button
                            type="button"
                            className="w-full text-left font-medium text-primary underline-offset-2 hover:underline focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
                            onClick={() => onElegirRubro(r)}
                          >
                            {r.etiqueta}
                          </button>
                        </td>
                        <td className="px-3 py-2 text-right tabular-nums">{fmtMonto(r.monto)}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
              <div className="flex shrink-0 justify-between border-t border-border pt-2 text-xs text-muted-foreground">
                <span>Total rubros</span>
                <span className="tabular-nums font-semibold text-foreground">{fmtMonto(total)}</span>
              </div>
            </>
          )}
        </div>
      </AppModal>
    </Dialog>
  );
}
