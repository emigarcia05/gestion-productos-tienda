"use client";

import { useMemo, useState } from "react";
import ClassicFilteredTableLayout from "@/components/shared/ClassicFilteredTableLayout";
import PaginacionTabla from "@/components/shared/PaginacionTabla";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
  EmptyTableRow,
} from "@/components/ui/table";
import { Card, CardContent } from "@/components/ui/card";
import { cn } from "@/lib/utils";
import { PAGE_SIZE } from "@/lib/pagination";
import type {
  PedidoHistoriaResumen,
} from "@/services/pedidosHistoria.service";
import PedidoHistoriaDetalleModal from "@/components/pedidos/PedidoHistoriaDetalleModal";

type PedidoHistoriaResumenClient = Omit<PedidoHistoriaResumen, "generadoAt" | "registradoAt"> & {
  generadoAt: string;
  registradoAt: string | null;
};

interface Props {
  items: PedidoHistoriaResumenClient[];
  total: number;
  totalPaginas: number;
  paginaNum: number;
}

function formatFechaNotaPedido(d: Date): string {
  const pad2 = (n: number) => String(n).padStart(2, "0");
  const dd = pad2(d.getDate());
  const mm = pad2(d.getMonth() + 1);
  const hh = pad2(d.getHours());
  const min = pad2(d.getMinutes());
  return `${dd}/${mm} ${hh}:${min}`;
}

function parseDate(value: string | null | undefined): Date | null {
  if (!value) return null;
  const d = new Date(value);
  return Number.isNaN(d.getTime()) ? null : d;
}

export default function HistorialPedidosPageClient({
  items,
  total,
  totalPaginas,
  paginaNum,
}: Props) {
  const [modalOpen, setModalOpen] = useState(false);
  const [pedidoHistoriaId, setPedidoHistoriaId] = useState<string | null>(null);

  const showingEmpty = items.length === 0;

  const title = "Pedido Mercadería";
  const subtitle = "Historial Pedidos";

  const actions = useMemo(() => {
    return undefined;
  }, []);

  async function openDetalle(item: PedidoHistoriaResumenClient) {
    setPedidoHistoriaId(item.id);
    setModalOpen(true);
  }

  return (
    <ClassicFilteredTableLayout title={title} subtitle={subtitle} actions={actions}>
      <div className="flex flex-col h-full min-h-0 gap-0.5">
        <Card className="min-h-0 flex flex-col rounded-xl border-border bg-card overflow-hidden gap-0 py-0 shadow-[0_4px_12px_rgba(0,0,0,0.05)]">
          <CardContent className="flex-1 min-h-0 flex flex-col p-0 overflow-hidden">
            <div className="flex flex-col flex-1 min-h-0">
              <div className="contenedor-tabla-gestion no-scroll-x flex-1 min-h-0">
                <Table variant="compact" scrollX={false} className="min-w-full">
                  <TableHeader>
                    <TableRow className="hover:bg-transparent">
                      <TableHead className="w-[70%]">FECHA - PROVEEDOR - SUCURSAL</TableHead>
                      <TableHead className="w-[15%]">ESTADO</TableHead>
                      <TableHead className="w-[15%]">VER</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {showingEmpty ? (
                      <EmptyTableRow
                        colSpan={3}
                        message="No se encontraron pedidos."
                      />
                    ) : (
                      items.map((it, idx) => {
                        const fecha = parseDate(it.generadoAt);
                        const fechaStr = fecha ? formatFechaNotaPedido(fecha) : "";
                        const rowLabel = `${fechaStr} - ${it.proveedorNombre} - ${it.sucursalNombre}`;
                        return (
                          <TableRow
                            key={it.id}
                            className={cn("cursor-pointer", idx % 2 === 1 && "bg-muted/30")}
                            onClick={() => void openDetalle(it)}
                          >
                            <TableCell className="celda-datos text-left min-w-0 break-words">
                              {rowLabel}
                            </TableCell>
                            <TableCell className="celda-datos">
                              {it.estado === "REGISTRADO" ? "Registrado" : "Pedido"}
                            </TableCell>
                            <TableCell className="celda-datos">
                              Ver
                            </TableCell>
                          </TableRow>
                        );
                      })
                    )}
                  </TableBody>
                </Table>
              </div>

              {!showingEmpty && totalPaginas > 1 && (
                <div className="flex items-center justify-between gap-2 py-1.5 px-1 border-t bg-gris rounded-b-lg shrink-0">
                  <span className="text-sm text-muted-foreground tabular-nums">
                    {total === 0
                      ? "Mostrando 0 de 0"
                      : `Mostrando ${items.length.toLocaleString("es-AR")} de ${total.toLocaleString("es-AR")}`}
                  </span>
                  <PaginacionTabla
                    basePath="/pedidos/historial"
                    params={{}}
                    paginaActual={paginaNum}
                    totalPaginas={totalPaginas}
                    total={total}
                    pageSize={PAGE_SIZE}
                  />
                </div>
              )}
            </div>
          </CardContent>
        </Card>
        <PedidoHistoriaDetalleModal
          open={modalOpen}
          onOpenChange={(v) => {
            setModalOpen(v);
            if (!v) setPedidoHistoriaId(null);
          }}
          pedidoHistoriaId={pedidoHistoriaId}
        />
      </div>
    </ClassicFilteredTableLayout>
  );
}

