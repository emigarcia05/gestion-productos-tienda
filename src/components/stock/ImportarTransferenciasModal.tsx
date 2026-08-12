"use client";

import { useCallback, useEffect, useState, useTransition } from "react";
import { Download } from "lucide-react";
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
} from "@/components/ui/table";
import {
  encolarTransferenciasPendientesAction,
  exportarPendientesTransfDepositosAction,
  listarPendientesExportTransfDepositosAction,
  type PendienteExportTransfDepositosDto,
  type Sucursal,
} from "@/actions/stock";
import { descargarExcelTransfDepositos } from "@/lib/exportTransfDepositosExcelClient";
import { formatDdMmHhMmArgentina } from "@/lib/fechaArgentina";
import {
  TABLE_ROW_ACTION_ICON_CLASS,
  TABLE_ROW_CELL_ICON_ACTIONS_FLEX_CLASS,
  TABLE_ROW_ICON_BUTTON_FILLED_BRAND_CLASS,
} from "@/lib/ui-classes";

export type ItemCantidadTransf = { codTienda: string; cantidad: number };

interface Props {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  origen: Sucursal | null;
  destino: Sucursal | null;
  /** Cantidades cargadas en la grilla al abrir el modal. */
  itemsGrilla: ItemCantidadTransf[];
  /** Limpia inputs de la grilla tras encolar. */
  onEncolado?: () => void;
}

/**
 * Modal **Importar Transferencias**: encola cantidades de la grilla (si hay),
 * lista pendientes por sucursal y descarga Excel (EGRESO/INGRESO).
 */
export default function ImportarTransferenciasModal({
  open,
  onOpenChange,
  origen,
  destino,
  itemsGrilla,
  onEncolado,
}: Props) {
  const [pendientes, setPendientes] = useState<
    PendienteExportTransfDepositosDto[]
  >([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [isPending, startTransition] = useTransition();

  const cargarPendientes = useCallback(async () => {
    const res = await listarPendientesExportTransfDepositosAction();
    if (!res.ok) {
      setError(res.error);
      setPendientes([]);
      return;
    }
    setError(null);
    setPendientes(res.data);
  }, []);

  useEffect(() => {
    if (!open) return;
    let cancelled = false;

    queueMicrotask(() => {
      setLoading(true);
      setError(null);
    });

    (async () => {
      if (origen && destino && itemsGrilla.length > 0) {
        const encolado = await encolarTransferenciasPendientesAction({
          origen,
          destino,
          items: itemsGrilla,
        });
        if (cancelled) return;
        if (!encolado.ok) {
          setLoading(false);
          setError(encolado.error);
          return;
        }
        toast.success(
          `${encolado.data.creados} transferencia${encolado.data.creados !== 1 ? "s" : ""} en cola.`
        );
        onEncolado?.();
      }
      if (cancelled) return;
      await cargarPendientes();
      if (!cancelled) setLoading(false);
    })();

    return () => {
      cancelled = true;
    };
    // Solo al abrir: captura items/origen/destino del momento.
    // eslint-disable-next-line react-hooks/exhaustive-deps -- open gate
  }, [open]);

  function handleDescargar(p: PendienteExportTransfDepositosDto) {
    startTransition(async () => {
      const res = await exportarPendientesTransfDepositosAction({
        sucursal: p.sucursal,
      });
      if (!res.ok) {
        toast.error(res.error);
        return;
      }
      descargarExcelTransfDepositos(res.data.filas, p.label);
      toast.success(`Excel de ${p.label} descargado.`);
      await cargarPendientes();
    });
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <AppModal
        size="lg"
        title="Importar Transferencias"
        bodyClassName="space-y-4"
        actions={
          <Button
            type="button"
            variant="outline"
            onClick={() => onOpenChange(false)}
            disabled={isPending}
          >
            Cerrar
          </Button>
        }
      >
        {loading ? (
          <p className="text-sm text-foreground py-6 text-center">Cargando…</p>
        ) : null}

        {!loading && error ? (
          <p className="text-sm text-destructive py-6 text-center">{error}</p>
        ) : null}

        {!loading && !error && pendientes.length === 0 ? (
          <p className="text-sm text-foreground py-6 text-center">
            No hay registros pendientes de importar.
          </p>
        ) : null}

        {!loading && !error && pendientes.length > 0 ? (
          <Table variant="compact">
            <TableHeader>
              <TableRow className="hover:bg-transparent">
                <TableHead className="w-[35%]">SUCURSAL</TableHead>
                <TableHead className="w-[25%] text-center">
                  REGISTRO PENDIENTE
                </TableHead>
                <TableHead className="w-[25%] text-center">FECHA</TableHead>
                <TableHead className="w-[15%] text-center">ACCIONES</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {pendientes.map((p) => (
                <TableRow key={p.sucursal}>
                  <TableCell className="celda-datos font-medium">
                    {p.label}
                  </TableCell>
                  <TableCell className="celda-datos text-center tabular-nums">
                    {p.cantidadRegistros.toLocaleString("es-AR")}
                  </TableCell>
                  <TableCell className="celda-datos text-center">
                    {formatDdMmHhMmArgentina(new Date(p.fechaIso))}
                  </TableCell>
                  <TableCell className="celda-datos celda-datos--accion-relleno-fila">
                    <div className={TABLE_ROW_CELL_ICON_ACTIONS_FLEX_CLASS}>
                      <Button
                        type="button"
                        variant="ghost"
                        size="icon"
                        className={TABLE_ROW_ICON_BUTTON_FILLED_BRAND_CLASS}
                        aria-label={`Descargar Excel ${p.label}`}
                        title="Descargar Excel"
                        disabled={isPending}
                        onClick={() => handleDescargar(p)}
                      >
                        <Download
                          className={TABLE_ROW_ACTION_ICON_CLASS}
                          aria-hidden
                        />
                      </Button>
                    </div>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        ) : null}
      </AppModal>
    </Dialog>
  );
}
