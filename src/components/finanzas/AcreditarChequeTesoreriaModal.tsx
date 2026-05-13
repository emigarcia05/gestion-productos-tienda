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
import { Loader2 } from "lucide-react";
import { cn } from "@/lib/utils";

const CELL_MIN = "min-w-0";

const COL_SPAN = 2;

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
          <p className="text-sm text-muted-foreground">
            Elegí la caja destino con doble clic en la fila.
          </p>
          <div className="max-h-[min(22rem,45vh)] overflow-auto rounded-md border border-border">
            <Table variant="compact" scrollX={false} className="table-fixed w-full">
              <colgroup>
                <col className="w-[50%]" />
                <col className="w-[50%]" />
              </colgroup>
              <TableHeader>
                <TableRow className="hover:bg-transparent">
                  <TableHead className={CELL_MIN}>CAJA</TableHead>
                  <TableHead className={CELL_MIN}>TITULAR</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {loading ? (
                  <TableRow>
                    <TableCell
                      colSpan={COL_SPAN}
                      className="celda-datos text-center text-muted-foreground"
                    >
                      Cargando cajas…
                    </TableCell>
                  </TableRow>
                ) : cajas.length === 0 ? (
                  <EmptyTableRow
                    colSpan={COL_SPAN}
                    message="No hay cajas tipo DIGITAL. Creá una desde Tesorería con tipo DIGITAL."
                  />
                ) : (
                  cajas.map((c) => {
                    const busy = pendingDestinoId === c.id;
                    const puedeDblClick = Boolean(cheque) && !pendingDestinoId;
                    return (
                      <TableRow
                        key={c.id}
                        className={cn(puedeDblClick && "cursor-pointer")}
                        onDoubleClick={() => {
                          if (!puedeDblClick) return;
                          void ejecutarTransferencia(c.id);
                        }}
                        title={
                          busy
                            ? "Acreditando cheque en esta caja."
                            : puedeDblClick
                              ? "Doble clic para acreditar el cheque en esta caja."
                              : pendingDestinoId
                                ? "Esperá a que termine la acreditación."
                                : undefined
                        }
                      >
                        <TableCell className={cn("celda-datos", CELL_MIN)} title={c.nombreCaja}>
                          <div className="flex min-w-0 items-center gap-2">
                            {busy ? (
                              <Loader2
                                className="h-4 w-4 shrink-0 animate-spin text-muted-foreground"
                                aria-hidden
                              />
                            ) : null}
                            <span className="celda-destacado min-w-0 flex-1 truncate">{c.nombreCaja}</span>
                          </div>
                        </TableCell>
                        <TableCell className={cn("celda-datos", CELL_MIN)} title={c.titular}>
                          <span className="block truncate">{c.titular}</span>
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
