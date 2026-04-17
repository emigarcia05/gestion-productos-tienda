"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { Check } from "lucide-react";
import { toast } from "sonner";
import { actualizarControladoComprobanteAction } from "@/actions/controlComprobantes";
import {
  EmptyTableRow,
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { cn } from "@/lib/utils";

interface ControlComprobanteRow {
  id: string;
  proveedorNombre: string;
  idSucursalEmpresa: string;
  comprobante: string;
  total: string;
  montoAplicado: string;
  vencimientoSaldo: string;
  controlado: boolean;
}

function fmtMonto(s: string): string {
  const n = Number(s);
  if (!Number.isFinite(n)) return "";
  return `$${n.toLocaleString("es-AR", {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  })}`;
}

export default function TablaControlComprobantes({
  filas,
  esEditor,
}: {
  filas: ControlComprobanteRow[];
  esEditor: boolean;
}) {
  const router = useRouter();
  const [pendingId, setPendingId] = useState<string | null>(null);
  const [isPending, startTransition] = useTransition();

  function onToggleControlado(fila: ControlComprobanteRow) {
    if (!esEditor) return;
    setPendingId(fila.id);
    startTransition(async () => {
      const res = await actualizarControladoComprobanteAction({
        id: fila.id,
        controlado: !fila.controlado,
      });
      setPendingId(null);
      if (!res.ok) {
        toast.error(res.error);
        return;
      }
      toast.success("Estado actualizado.");
      router.refresh();
    });
  }

  return (
    <div className="flex flex-1 min-h-0 flex-col gap-2 px-4 pb-4 sm:px-6 lg:px-8">
      <div className="contenedor-tabla-gestion flex min-h-0 flex-1 flex-col overflow-hidden rounded-md border border-border bg-card">
        <div className="flex-1 min-h-0 min-w-0 overflow-x-auto overflow-y-auto">
          <Table variant="compact" scrollX={false}>
            <TableHeader>
              <TableRow className="hover:bg-transparent">
                <TableHead className="w-[32%] min-w-[12rem]">PROVEEDOR</TableHead>
                <TableHead className="w-[10%] min-w-[8rem]">ID SUCURSAL EMPRESA</TableHead>
                <TableHead className="w-[12%] min-w-[8rem]">COMPROBANTE</TableHead>
                <TableHead className="w-[12%] min-w-[8rem]">TOTAL</TableHead>
                <TableHead className="w-[12%] min-w-[8rem]">MONTO APLICADO</TableHead>
                <TableHead className="w-[12%] min-w-[8rem]">VENCIMIENTO</TableHead>
                <TableHead className="w-[10%] min-w-[6rem]">CONTROLADO</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {filas.length === 0 ? (
                <EmptyTableRow colSpan={7} message="Sin comprobantes para mostrar." />
              ) : (
                filas.map((fila) => {
                  const disabled = !esEditor || (isPending && pendingId === fila.id);
                  const vencimiento = Number(fila.vencimientoSaldo);
                  return (
                    <TableRow key={fila.id}>
                      <TableCell className="celda-datos text-left font-medium" title={fila.proveedorNombre}>
                        {fila.proveedorNombre}
                      </TableCell>
                      <TableCell className="celda-datos celda-mono">{fila.idSucursalEmpresa}</TableCell>
                      <TableCell className="celda-datos celda-mono">{fila.comprobante}</TableCell>
                      <TableCell className="celda-datos celda-numero">{fmtMonto(fila.total)}</TableCell>
                      <TableCell className="celda-datos celda-numero">{fmtMonto(fila.montoAplicado)}</TableCell>
                      <TableCell
                        className={cn(
                          "celda-datos celda-numero",
                          vencimiento > 0 && "font-semibold text-destructive"
                        )}
                      >
                        {vencimiento > 0 ? fmtMonto(fila.vencimientoSaldo) : ""}
                      </TableCell>
                      <TableCell className="celda-datos text-center">
                        <div className="flex items-center justify-center w-full">
                          <button
                            type="button"
                            onClick={() => onToggleControlado(fila)}
                            className="tabla-check-toggle transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-sidebar-ring"
                            aria-label="Marcar comprobante como controlado"
                            aria-pressed={fila.controlado}
                            disabled={disabled}
                          >
                            {fila.controlado ? <Check aria-hidden="true" /> : null}
                          </button>
                        </div>
                      </TableCell>
                    </TableRow>
                  );
                })
              )}
            </TableBody>
          </Table>
        </div>
      </div>
    </div>
  );
}
