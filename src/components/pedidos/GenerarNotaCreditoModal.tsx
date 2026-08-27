"use client";

import { useEffect, useState } from "react";
import { Dialog } from "@/components/ui/dialog";
import AppModal from "@/components/shared/AppModal";
import { Button } from "@/components/ui/button";
import { Tooltip, TooltipContent, TooltipTrigger } from "@/components/ui/tooltip";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
  EmptyTableRow,
} from "@/components/ui/table";
import { Check, Eye } from "lucide-react";
import { cn } from "@/lib/utils";
import {
  TABLE_ROW_ACTION_ICON_CLASS,
  TABLE_ROW_CELL_ICON_ACTIONS_FLEX_CLASS,
  TABLE_ROW_ICON_BUTTON_FILLED_BRAND_CLASS,
} from "@/lib/ui-classes";
import { formatIsoYmdDdMmYyyyArgentina } from "@/lib/fechaArgentina";
import { montoArSignedCentsToDisplayWithCurrency } from "@/lib/montoArMask";
import { listarPedidosHistoriaRecepcionadosParaNotaCreditoAction } from "@/actions/pedidosHistoria";
import type { PedidoHistoriaRecepcionadoNc } from "@/services/pedidosHistoria.service";

const COL_WIDTHS_PCT = [22, 38, 20, 20] as const;

function formatTotalPedido(total: number | null): string {
  if (total == null || !Number.isFinite(total)) return "";
  return montoArSignedCentsToDisplayWithCurrency(Math.round(total * 100));
}

export default function GenerarNotaCreditoModal({
  open,
  onOpenChange,
  onVerPedido,
  onElegirPedido,
  pedidoElegidoId,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onVerPedido: (pedidoHistoriaId: string) => void;
  onElegirPedido: (pedidoHistoriaId: string) => void;
  pedidoElegidoId: string | null;
}) {
  const [items, setItems] = useState<PedidoHistoriaRecepcionadoNc[]>([]);
  const [loading, setLoading] = useState(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  useEffect(() => {
    if (!open) return;
    let cancelled = false;
    queueMicrotask(() => {
      setLoading(true);
      setErrorMsg(null);
    });
    void (async () => {
      const res = await listarPedidosHistoriaRecepcionadosParaNotaCreditoAction();
      if (cancelled) return;
      if (!res.ok) {
        setItems([]);
        setErrorMsg(res.error ?? "Error al listar pedidos recepcionados.");
        setLoading(false);
        return;
      }
      setItems(res.data);
      setLoading(false);
    })();
    return () => {
      cancelled = true;
    };
  }, [open]);

  const showingEmpty = !loading && items.length === 0;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <AppModal
        title="GENERAR NOTA CRÉDITO"
        size="xl"
        scrollBody={false}
        className="h-[70vh]"
        bodyClassName="flex min-h-0 flex-1 flex-col overflow-hidden p-4"
        actions={
          <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>
            Cerrar
          </Button>
        }
      >
        <div className="flex min-h-0 flex-1 flex-col">
          <div className={cn("shrink-0 flex flex-col gap-2 pb-3")}>
            <p className={cn("text-sm text-foreground")}>
              Esta herramienta es un asistente para crear la NC en DUX. Seguir las
              indicaciones y te asistirá para que sepas qué dato colocar en cada casillero.
            </p>
            <p className={cn("text-sm font-semibold text-foreground")}>
              Elegí el pedido del cual querés generar la Nota de Crédito
            </p>
          </div>
          {errorMsg ? (
            <p className={cn("px-1 pb-2 text-sm text-destructive")}>{errorMsg}</p>
          ) : null}
          <div className="contenedor-tabla-gestion no-scroll-x min-h-0 flex-1">
            <Table
              variant="compact"
              scrollX={false}
              className="tabla-gestion-compacta w-full table-fixed"
            >
              <colgroup>
                {COL_WIDTHS_PCT.map((pct, i) => (
                  <col key={i} style={{ width: `${pct}%` }} />
                ))}
              </colgroup>
              <TableHeader>
                <TableRow className="hover:bg-transparent">
                  <TableHead>FECHA RECEPCIÓN</TableHead>
                  <TableHead>PROVEEDOR</TableHead>
                  <TableHead>TOTAL</TableHead>
                  <TableHead className="tabla-bloque-secundario-head-divider">
                    ACCIONES
                  </TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {loading ? (
                  <EmptyTableRow colSpan={4} message="Cargando..." />
                ) : showingEmpty ? (
                  <EmptyTableRow colSpan={4} message="No hay pedidos recepcionados." />
                ) : (
                  items.map((it) => {
                    const fechaStr = it.fechaRecepcionIso
                      ? formatIsoYmdDdMmYyyyArgentina(it.fechaRecepcionIso)
                      : "";
                    const elegido = pedidoElegidoId === it.id;
                    return (
                      <TableRow key={it.id}>
                        <TableCell className="celda-datos tabular-nums">{fechaStr}</TableCell>
                        <TableCell
                          className="celda-datos min-w-0 truncate"
                          title={it.proveedorNombre}
                        >
                          {it.proveedorNombre}
                        </TableCell>
                        <TableCell className="celda-datos tabular-nums">
                          {formatTotalPedido(it.total)}
                        </TableCell>
                        <TableCell className="celda-datos celda-datos--accion-relleno-fila tabla-bloque-secundario-cell-divider">
                          <div className={cn(TABLE_ROW_CELL_ICON_ACTIONS_FLEX_CLASS, "gap-2")}>
                            <Tooltip>
                              <TooltipTrigger asChild>
                                <Button
                                  type="button"
                                  variant="ghost"
                                  size="icon"
                                  onClick={() => onVerPedido(it.id)}
                                  aria-label="Ver Pedido"
                                  className={TABLE_ROW_ICON_BUTTON_FILLED_BRAND_CLASS}
                                >
                                  <Eye className={TABLE_ROW_ACTION_ICON_CLASS} aria-hidden />
                                </Button>
                              </TooltipTrigger>
                              <TooltipContent side="top">Ver Pedido</TooltipContent>
                            </Tooltip>
                            <Tooltip>
                              <TooltipTrigger asChild>
                                <Button
                                  type="button"
                                  variant="ghost"
                                  size="icon"
                                  onClick={() => onElegirPedido(it.id)}
                                  aria-label="Elegir Pedido"
                                  aria-pressed={elegido}
                                  className={TABLE_ROW_ICON_BUTTON_FILLED_BRAND_CLASS}
                                >
                                  <Check className={TABLE_ROW_ACTION_ICON_CLASS} aria-hidden />
                                </Button>
                              </TooltipTrigger>
                              <TooltipContent side="top">Elegir Pedido</TooltipContent>
                            </Tooltip>
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
      </AppModal>
    </Dialog>
  );
}
