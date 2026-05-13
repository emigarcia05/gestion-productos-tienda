"use client";

import { useCallback, useEffect, useState } from "react";
import { toast } from "sonner";
import { Dialog } from "@/components/ui/dialog";
import AppModal from "@/components/shared/AppModal";
import { Button } from "@/components/ui/button";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
  EmptyTableRow,
} from "@/components/ui/table";
import { listarCajasTesoreriaTipoDigitalAction } from "@/actions/cajasTesoreria";
import { transferirFinTesoreriaChequeAction } from "@/actions/finTesoreriaCheques";
import type { FinTesoreriaChequeItem } from "@/services/finTesoreriaCheques.service";
import type { CajaTesoreriaItem } from "@/services/cajasTesoreria.service";
import { fmtPrecio } from "@/lib/format";
import { cn } from "@/lib/utils";

const TH_NUM = "text-right whitespace-nowrap";
const TD_NUM = "celda-datos text-right tabular-nums";
const CELL_MIN = "min-w-0";

interface Props {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  cheque: FinTesoreriaChequeItem | null;
  onAcreditado?: () => void;
}

export default function AcreditarChequeTesoreriaModal({
  open,
  onOpenChange,
  cheque,
  onAcreditado,
}: Props) {
  const [cajas, setCajas] = useState<CajaTesoreriaItem[]>([]);
  const [loading, setLoading] = useState(false);
  const [pendingDestinoId, setPendingDestinoId] = useState<string | null>(null);

  const cargarDatos = useCallback(async () => {
    setLoading(true);
    try {
      const resCajas = await listarCajasTesoreriaTipoDigitalAction();
      if (!resCajas.ok) {
        toast.error(resCajas.error ?? "No se pudieron cargar las cajas.");
        setCajas([]);
      } else {
        setCajas(resCajas.data);
      }
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    if (!open) return;
    void cargarDatos();
  }, [open, cargarDatos]);

  async function ejecutarTransferencia(cajaDestinoId: string) {
    if (!cheque || pendingDestinoId) return;
    setPendingDestinoId(cajaDestinoId);
    try {
      const res = await transferirFinTesoreriaChequeAction({
        chequeId: cheque.id,
        cajaDestinoId,
        entregaProveedorId: cheque.entregaProveedorId ?? null,
      });
      if (!res.ok) {
        toast.error(res.error ?? "No se pudo acreditar el cheque.");
        return;
      }
      toast.success("Cheque acreditado correctamente.");
      onOpenChange(false);
      onAcreditado?.();
    } finally {
      setPendingDestinoId(null);
    }
  }

  const colSpan = 4;

  return (
    <Dialog
      open={open}
      onOpenChange={(next) => {
        if (!next && pendingDestinoId) return;
        onOpenChange(next);
      }}
    >
      <AppModal
        title="Acreditar Cheque"
        size="lg"
        padding="sm"
        scrollBody={false}
        bodyClassName="min-h-0 overflow-hidden flex flex-col"
        actions={
          <div className="flex w-full justify-end gap-2">
            <Button
              type="button"
              variant="outline"
              disabled={!!pendingDestinoId}
              onClick={() => onOpenChange(false)}
            >
              Cancelar
            </Button>
          </div>
        }
      >
        <div className="flex flex-col gap-3">
          <div className="max-h-[min(22rem,45vh)] overflow-auto rounded-md border border-border">
            <Table variant="compact" scrollX={false} className="table-fixed w-full">
              <colgroup>
                <col className="w-[28%]" />
                <col className="w-[28%]" />
                <col className="w-[22%]" />
                <col className="w-[22%]" />
              </colgroup>
              <TableHeader>
                <TableRow className="hover:bg-transparent">
                  <TableHead className={CELL_MIN}>CAJA</TableHead>
                  <TableHead className={CELL_MIN}>TITULAR</TableHead>
                  <TableHead className={cn(TH_NUM, CELL_MIN)}>SALDO</TableHead>
                  <TableHead className="text-center">ACCIÓN</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {loading ? (
                  <TableRow>
                    <TableCell colSpan={colSpan} className="celda-datos text-center text-muted-foreground">
                      Cargando cajas…
                    </TableCell>
                  </TableRow>
                ) : cajas.length === 0 ? (
                  <EmptyTableRow
                    colSpan={colSpan}
                    message="No hay cajas tipo DIGITAL. Creá una desde Tesorería con tipo DIGITAL."
                  />
                ) : (
                  cajas.map((c) => {
                    const busy = pendingDestinoId === c.id;
                    return (
                      <TableRow key={c.id}>
                        <TableCell className={cn("celda-datos", CELL_MIN)} title={c.nombreCaja}>
                          <span className="celda-destacado block truncate">{c.nombreCaja}</span>
                        </TableCell>
                        <TableCell className={cn("celda-datos", CELL_MIN)} title={c.titular}>
                          <span className="block truncate">{c.titular}</span>
                        </TableCell>
                        <TableCell className={cn(TD_NUM, CELL_MIN)}>${fmtPrecio(c.montoDisponible)}</TableCell>
                        <TableCell className="celda-datos p-1 text-center">
                          <Button
                            type="button"
                            size="sm"
                            className="h-8"
                            disabled={!cheque || !!pendingDestinoId}
                            aria-busy={busy}
                            onClick={() => void ejecutarTransferencia(c.id)}
                          >
                            {busy ? "ACREDITANDO…" : "ACREDITAR"}
                          </Button>
                        </TableCell>
                      </TableRow>
                    );
                  })
                )}
              </TableBody>
            </Table>
          </div>
        </div>
      </AppModal>
    </Dialog>
  );
}
