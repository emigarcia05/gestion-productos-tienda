"use client";

import { useState } from "react";
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
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { cn } from "@/lib/utils";
import { PAGE_SIZE } from "@/lib/pagination";
import type { PedidoHistoriaResumen } from "@/services/pedidosHistoria.service";
import PedidoHistoriaDetalleModal from "@/components/pedidos/PedidoHistoriaDetalleModal";
import GenerarPedidoButton from "@/components/pedidos/GenerarPedidoButton";
import FiltrosHistorialPedidos, {
  type EstadoFiltroPedido,
} from "@/components/pedidos/FiltrosHistorialPedidos";
import { Eye } from "lucide-react";

type PedidoHistoriaResumenClient = Omit<PedidoHistoriaResumen, "generadoAt" | "registradoAt"> & {
  generadoAt: string;
  registradoAt: string | null;
};

interface Props {
  items: PedidoHistoriaResumenClient[];
  total: number;
  totalPaginas: number;
  paginaNum: number;
  proveedores: Array<{ id: string; nombre: string; prefijo: string }>;
  proveedorId: string;
  sucursalCodigo: string;
  estado: PedidoHistoriaResumen["estado"] | "";
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
  proveedores,
  proveedorId,
  sucursalCodigo,
  estado,
}: Props) {
  const [modalOpen, setModalOpen] = useState(false);
  const [pedidoHistoriaId, setPedidoHistoriaId] = useState<string | null>(null);

  const showingEmpty = items.length === 0;

  const title = "Pedido Mercadería";
  const subtitle = "Historial Pedidos";

  const actions = (
    <div className="flex items-center gap-2">
      <GenerarPedidoButton />
    </div>
  );

  async function openDetalle(item: PedidoHistoriaResumenClient) {
    setPedidoHistoriaId(item.id);
    setModalOpen(true);
  }

  return (
    <ClassicFilteredTableLayout title={title} subtitle={subtitle} actions={actions} filters={
      <FiltrosHistorialPedidos
        proveedores={proveedores}
        proveedorId={proveedorId}
        sucursalCodigo={sucursalCodigo}
        estado={(estado as EstadoFiltroPedido) || ""}
        total={total}
      />
    }>
      <div className="flex flex-col h-full min-h-0 gap-2">
        <Card className="min-h-0 flex flex-col gap-0 overflow-hidden rounded-xl border border-border/80 bg-card py-0 shadow-sm">
          <CardContent className="flex-1 min-h-0 flex flex-col p-0 overflow-hidden">
            <div className="flex flex-col flex-1 min-h-0">
              <div className="contenedor-tabla-gestion no-scroll-x flex-1 min-h-0">
                <Table variant="compact" scrollX={false} className="min-w-full">
                  <TableHeader>
                    <TableRow className="hover:bg-transparent">
                      <TableHead className="w-[20%]">FECHA</TableHead>
                      <TableHead className="w-[30%]">PROVEEDOR</TableHead>
                      <TableHead className="w-[20%]">SUCURSAL</TableHead>
                      <TableHead className="w-[15%]">ESTADO</TableHead>
                      <TableHead className="w-[15%]">VER</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {showingEmpty ? (
                      <EmptyTableRow
                        colSpan={5}
                        message="No se encontraron pedidos."
                      />
                    ) : (
                      items.map((it, idx) => {
                        const fecha = parseDate(it.generadoAt);
                        const fechaStr = fecha ? formatFechaNotaPedido(fecha) : "";
                        return (
                          <TableRow
                            key={it.id}
                            className={cn(idx % 2 === 1 && "bg-muted/30")}
                          >
                            <TableCell className="celda-datos tabular-nums">
                              {fechaStr}
                            </TableCell>
                            <TableCell className="celda-datos min-w-0 truncate" title={it.proveedorNombre}>
                              {it.proveedorNombre}
                            </TableCell>
                            <TableCell className="celda-datos min-w-0 truncate" title={it.sucursalNombre}>
                              {it.sucursalNombre}
                            </TableCell>
                            <TableCell className="celda-datos">
                              {it.estado === "RECIBIDO" ? "RECIBIDO" : "PEDIDO"}
                            </TableCell>
                            <TableCell className="celda-datos">
                              <Button
                                type="button"
                                variant="outline"
                                size="icon-xs"
                                onClick={(e) => {
                                  e.stopPropagation();
                                  void openDetalle(it);
                                }}
                                aria-label="Ver detalle"
                                title="Ver"
                              >
                                <Eye className="h-4 w-4" />
                              </Button>
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
                    params={{
                      proveedor: proveedorId,
                      sucursal: sucursalCodigo,
                      estado: estado as string,
                    }}
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

