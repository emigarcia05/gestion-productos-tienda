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
import {
  listarProveedoresMercaderiaParaChequeTesoreriaAction,
  marcarEntregaProveedorFinTesoreriaChequeAction,
  type ProveedorMercaderiaChequeTesoreriaOpcion,
} from "@/actions/finTesoreriaCheques";
import type { FinTesoreriaChequeItem } from "@/services/finTesoreriaCheques.service";
import { fmtPrecio } from "@/lib/format";
import { cn } from "@/lib/utils";

const CELL_MIN = "min-w-0";

interface Props {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  cheque: FinTesoreriaChequeItem | null;
  onGuardado?: () => void;
}

export default function PagoProveedorChequeTesoreriaModal({
  open,
  onOpenChange,
  cheque,
  onGuardado,
}: Props) {
  const [proveedores, setProveedores] = useState<ProveedorMercaderiaChequeTesoreriaOpcion[]>([]);
  const [loading, setLoading] = useState(false);
  const [pendingProveedorId, setPendingProveedorId] = useState<string | null>(null);

  const cargar = useCallback(async () => {
    setLoading(true);
    try {
      const res = await listarProveedoresMercaderiaParaChequeTesoreriaAction();
      if (!res.ok) {
        toast.error(res.error ?? "No se pudieron cargar los proveedores.");
        setProveedores([]);
        return;
      }
      setProveedores(res.data);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    if (!open) return;
    void cargar();
  }, [open, cargar]);

  useEffect(() => {
    if (!open) setPendingProveedorId(null);
  }, [open]);

  async function seleccionarProveedor(proveedorId: string) {
    if (!cheque || pendingProveedorId) return;
    setPendingProveedorId(proveedorId);
    try {
      const res = await marcarEntregaProveedorFinTesoreriaChequeAction({
        chequeId: cheque.id,
        entregaProveedorId: proveedorId,
      });
      if (!res.ok) {
        toast.error(res.error ?? "No se pudo registrar el pago a proveedor.");
        return;
      }
      toast.success("Proveedor de mercadería registrado.");
      onOpenChange(false);
      onGuardado?.();
    } finally {
      setPendingProveedorId(null);
    }
  }

  const colSpan = 2;

  return (
    <Dialog
      open={open}
      onOpenChange={(next) => {
        if (!next && pendingProveedorId) return;
        onOpenChange(next);
      }}
    >
      <AppModal
        title="Pago Proveedor"
        size="lg"
        padding="sm"
        scrollBody={false}
        bodyClassName="min-h-0 overflow-hidden flex flex-col"
        actions={
          <div className="flex w-full justify-end gap-2">
            <Button
              type="button"
              variant="outline"
              disabled={!!pendingProveedorId}
              onClick={() => onOpenChange(false)}
            >
              Cancelar
            </Button>
          </div>
        }
      >
        <div className="flex min-h-0 flex-1 flex-col gap-3">
          {cheque ? (
            <p className="text-sm text-muted-foreground">
              Cheque <span className="font-semibold text-foreground">${fmtPrecio(cheque.monto)}</span>{" "}
              — <span className="text-foreground">{cheque.emisor}</span>. Elegí un proveedor de mercadería.
            </p>
          ) : null}
          <div className="max-h-[min(24rem,50vh)] min-h-[10rem] flex-1 overflow-auto rounded-md border border-border">
            <Table variant="compact" scrollX={false} className="table-fixed w-full">
              <colgroup>
                <col className="w-[70%]" />
                <col className="w-[30%]" />
              </colgroup>
              <TableHeader>
                <TableRow className="hover:bg-transparent">
                  <TableHead className={CELL_MIN}>PROVEEDOR</TableHead>
                  <TableHead className="text-center">ACCIÓN</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {loading ? (
                  <TableRow>
                    <TableCell colSpan={colSpan} className="celda-datos text-center text-muted-foreground">
                      Cargando proveedores…
                    </TableCell>
                  </TableRow>
                ) : proveedores.length === 0 ? (
                  <EmptyTableRow colSpan={colSpan} message="No hay proveedores de mercadería." />
                ) : (
                  proveedores.map((p) => {
                    const busy = pendingProveedorId === p.id;
                    return (
                      <TableRow key={p.id}>
                        <TableCell className={cn("celda-datos", CELL_MIN)} title={p.nombre}>
                          <span className="celda-destacado block truncate">{p.nombre}</span>
                        </TableCell>
                        <TableCell className="celda-datos p-1 text-center">
                          <Button
                            type="button"
                            size="sm"
                            className="h-8"
                            disabled={!cheque || !!pendingProveedorId}
                            aria-busy={busy}
                            onClick={() => void seleccionarProveedor(p.id)}
                          >
                            {busy ? "GUARDANDO…" : "SELECCIONAR"}
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
