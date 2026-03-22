"use client";

import { useEffect, useMemo, useState } from "react";
import { Dialog } from "@/components/ui/dialog";
import AppModal from "@/components/shared/AppModal";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
  EmptyTableRow,
} from "@/components/ui/table";
import { getPedidoHistoriaDetalleAction } from "@/actions/pedidosHistoria";
import type { PedidoHistoriaDetalle } from "@/services/pedidosHistoria.service";

function formatDdMmHHmm(d: Date): string {
  const pad2 = (n: number) => String(n).padStart(2, "0");
  const dd = pad2(d.getDate());
  const mm = pad2(d.getMonth() + 1);
  const hh = pad2(d.getHours());
  const min = pad2(d.getMinutes());
  return `${dd}/${mm} ${hh}:${min}`;
}

function toDate(value: string | Date | null | undefined): Date | null {
  if (!value) return null;
  if (value instanceof Date) return Number.isNaN(value.getTime()) ? null : value;
  const d = new Date(value);
  return Number.isNaN(d.getTime()) ? null : d;
}

interface Props {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  pedidoHistoriaId: string | null;
}

export default function PedidoHistoriaLecturaModal({
  open,
  onOpenChange,
  pedidoHistoriaId,
}: Props) {
  const [detalle, setDetalle] = useState<PedidoHistoriaDetalle | null>(null);
  const [loading, setLoading] = useState(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  useEffect(() => {
    if (!open || !pedidoHistoriaId) return;

    let cancelled = false;
    setLoading(true);
    setErrorMsg(null);
    setDetalle(null);

    void (async () => {
      const res = await getPedidoHistoriaDetalleAction({ pedidoHistoriaId });
      if (cancelled) return;
      setLoading(false);
      if (!res.ok) {
        setDetalle(null);
        setErrorMsg(res.error ?? "Error al cargar el detalle.");
        return;
      }
      setDetalle(res.data);
      setErrorMsg(null);
    })();

    return () => {
      cancelled = true;
    };
  }, [open, pedidoHistoriaId]);

  useEffect(() => {
    if (!open) {
      setDetalle(null);
      setErrorMsg(null);
      setLoading(false);
    }
  }, [open]);

  const esRecibido = detalle?.estado === "RECIBIDO";

  const fechaSubcabecera = useMemo(() => {
    if (!detalle) return "";
    const ref =
      esRecibido && detalle.registradoAt != null
        ? detalle.registradoAt
        : detalle.generadoAt;
    const d = toDate(ref);
    return d ? formatDdMmHHmm(d) : "";
  }, [detalle, esRecibido]);

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <AppModal
        title="Ver Pedido"
        size="xl"
        scrollBody={false}
        padding="default"
        actions={
          <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>
            Cerrar
          </Button>
        }
      >
        {errorMsg ? (
          <p className="text-sm text-destructive">{errorMsg}</p>
        ) : detalle ? (
          <div className="flex min-h-0 flex-1 flex-col overflow-hidden">
            <div className="flex min-w-0 shrink-0 flex-col gap-1 pb-2">
              <div className="flex min-w-0 items-center gap-2">
                <Badge
                  className="w-fit shrink-0"
                  variant={esRecibido ? "secondary" : "default"}
                >
                  {esRecibido ? "Recepcionado" : "Pedido"}
                </Badge>
                <p className="min-w-0 flex-1 text-base font-semibold leading-snug break-words text-foreground">
                  {detalle.proveedorNombre || "—"}
                </p>
              </div>
              <p className="flex min-w-0 flex-wrap items-baseline gap-x-2 gap-y-0.5 text-sm font-medium text-foreground">
                <span className="min-w-0 break-words">
                  {detalle.sucursalNombre || "—"}
                </span>
                <span className="shrink-0 text-muted-foreground" aria-hidden>
                  —
                </span>
                <span className="text-sm font-normal tabular-nums text-muted-foreground">
                  {fechaSubcabecera}
                </span>
              </p>
            </div>

            <div className="contenedor-tabla-gestion no-scroll-x no-scrollbar relative min-h-0 min-w-0 flex-1">
              <Table variant="compact" scrollX={false} className="min-w-full">
                <TableHeader>
                  <TableRow className="hover:bg-transparent">
                    <TableHead className="w-[62%] text-left">DESCRIPCIÓN</TableHead>
                    <TableHead className="w-[19%]">CANT. PEDIDA</TableHead>
                    {esRecibido ? (
                      <TableHead className="w-[19%]">CANT. RECIBIDA</TableHead>
                    ) : null}
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {detalle.items.length === 0 ? (
                    <EmptyTableRow
                      colSpan={esRecibido ? 3 : 2}
                      message="Sin ítems."
                    />
                  ) : (
                    detalle.items.map((it) => (
                      <TableRow key={it.id}>
                        <TableCell
                          className="celda-datos min-w-0 whitespace-normal text-left align-top"
                          title={
                            it.codTienda
                              ? `${it.codTienda} — ${it.descripcionTienda}`
                              : it.descripcionTienda
                          }
                        >
                          {it.descripcionTienda || "—"}
                        </TableCell>
                        <TableCell className="celda-datos tabular-nums">
                          {it.cantPedida.toLocaleString("es-AR")}
                        </TableCell>
                        {esRecibido ? (
                          <TableCell className="celda-datos tabular-nums">
                            {it.cantRecibida.toLocaleString("es-AR")}
                          </TableCell>
                        ) : null}
                      </TableRow>
                    ))
                  )}
                </TableBody>
              </Table>
            </div>
          </div>
        ) : loading ? (
          <p className="text-sm text-muted-foreground">Cargando…</p>
        ) : null}
      </AppModal>
    </Dialog>
  );
}
