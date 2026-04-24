"use client";

import { Dialog } from "@/components/ui/dialog";
import AppModal from "@/components/shared/AppModal";
import { Button } from "@/components/ui/button";
import { fmtPrecio } from "@/lib/format";
import type { BalanceMensualFilaDetalleGasto } from "@/lib/balanceMensualDetalle";

function fmtMonto(n: number) {
  if (n === 0) return "—";
  return `$${fmtPrecio(n)}`;
}

interface Props {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  titulo: string;
  subtitulo: string;
  filas: BalanceMensualFilaDetalleGasto[];
  /** Texto aclaratorio (p. ej. reparto de centros de costo). */
  notaInformativa?: string | null;
}

export default function BalanceMensualDetalleGastosRubroModal({
  open,
  onOpenChange,
  titulo,
  subtitulo,
  filas,
  notaInformativa,
}: Props) {
  const total = filas.reduce((a, r) => a + r.monto, 0);

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <AppModal
        title={titulo}
        size="xl"
        className="sm:max-w-4xl"
        bodyClassName="flex flex-col min-h-0 max-h-[min(32rem,60vh)]"
        scrollBody={false}
        actions={
          <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>
            Cerrar
          </Button>
        }
      >
        <div className="flex min-h-0 flex-1 flex-col gap-3 text-sm">
          <p className="shrink-0 text-xs text-muted-foreground">{subtitulo}</p>
          {notaInformativa ? (
            <p className="shrink-0 rounded-md border border-border bg-muted/40 px-3 py-2 text-xs text-muted-foreground">
              {notaInformativa}
            </p>
          ) : null}
          {filas.length === 0 ? (
            <p className="text-muted-foreground">No hay líneas para este rubro.</p>
          ) : (
            <>
              <div className="min-h-0 flex-1 overflow-auto rounded-md border border-border">
                <table className="w-full min-w-[28rem] border-collapse text-sm">
                  <thead>
                    <tr className="border-b border-border bg-muted/50 text-left text-xs font-semibold uppercase tracking-wide text-muted-foreground">
                      <th className="px-3 py-2">Gasto</th>
                      <th className="px-3 py-2">Proveedor</th>
                      <th className="px-3 py-2">Sucursal</th>
                      <th className="px-3 py-2">Tipo gasto</th>
                      <th className="px-3 py-2 text-right">Monto</th>
                    </tr>
                  </thead>
                  <tbody>
                    {filas.map((r, i) => (
                      <tr
                        key={`${r.gastoNombre}-${r.sucursalNombre}-${r.proveedorNombre}-${i}`}
                        className="border-b border-border/80 last:border-b-0"
                      >
                        <td className="px-3 py-2 align-top">{r.gastoNombre}</td>
                        <td className="px-3 py-2 align-top text-muted-foreground">{r.proveedorNombre}</td>
                        <td className="px-3 py-2 align-top text-muted-foreground">{r.sucursalNombre}</td>
                        <td className="px-3 py-2 align-top text-xs text-muted-foreground">{r.tipoGastoNombre}</td>
                        <td className="px-3 py-2 text-right tabular-nums align-top">{fmtMonto(r.monto)}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
              <div className="flex shrink-0 justify-between border-t border-border pt-2 text-xs text-muted-foreground">
                <span>Total líneas</span>
                <span className="tabular-nums font-semibold text-foreground">{fmtMonto(total)}</span>
              </div>
            </>
          )}
        </div>
      </AppModal>
    </Dialog>
  );
}
