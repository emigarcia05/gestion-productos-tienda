"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
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
import { Tooltip, TooltipContent, TooltipTrigger } from "@/components/ui/tooltip";
import { cn } from "@/lib/utils";
import { PAGE_SIZE } from "@/lib/pagination";
import type { PedidoHistoriaResumen } from "@/services/pedidosHistoria.service";
import PedidoHistoriaDetalleModal from "@/components/pedidos/PedidoHistoriaDetalleModal";
import PedidoHistoriaLecturaModal from "@/components/pedidos/PedidoHistoriaLecturaModal";
import PedidoHistoriaBorrarConfirmModal from "@/components/pedidos/PedidoHistoriaBorrarConfirmModal";
import FiltrosHistorialPedidos, {
  type EstadoFiltroPedido,
} from "@/components/pedidos/FiltrosHistorialPedidos";
import { Eye, PackageCheck, Trash2 } from "lucide-react";
import { toast } from "sonner";
import { descargarPdfBase64 } from "@/lib/descargarPdfBase64";
import { descargarPdfPedidoHistoriaAction } from "@/actions/pedidosHistoria";
import { formatDdMmHhMmArgentina } from "@/lib/fechaArgentina";

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
  estado: EstadoFiltroPedido;
  q: string;
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
  q,
}: Props) {
  const router = useRouter();
  const [recepcionOpen, setRecepcionOpen] = useState(false);
  const [recepcionId, setRecepcionId] = useState<string | null>(null);
  const [lecturaOpen, setLecturaOpen] = useState(false);
  const [lecturaId, setLecturaId] = useState<string | null>(null);
  const [borrarOpen, setBorrarOpen] = useState(false);
  const [borrarId, setBorrarId] = useState<string | null>(null);
  const [descargandoPdfId, setDescargandoPdfId] = useState<string | null>(null);

  const showingEmpty = items.length === 0;

  const title = "Pedido Mercadería";
  const subtitle = "Historial Pedidos";

  function openRecepcion(id: string) {
    setRecepcionId(id);
    setRecepcionOpen(true);
  }

  function openLectura(id: string) {
    setLecturaId(id);
    setLecturaOpen(true);
  }

  function openBorrar(id: string) {
    setBorrarId(id);
    setBorrarOpen(true);
  }

  function irARecepcionDesdeLectura() {
    const id = lecturaId;
    if (!id) return;
    setLecturaOpen(false);
    setLecturaId(null);
    setRecepcionId(id);
    setRecepcionOpen(true);
  }

  async function descargarPdfDesdeLectura() {
    if (!lecturaId) return;
    setDescargandoPdfId(lecturaId);
    try {
      const res = await descargarPdfPedidoHistoriaAction({
        pedidoHistoriaId: lecturaId,
      });
      if (!res.ok) {
        toast.error(res.error ?? "Error al generar el PDF.");
        return;
      }
      descargarPdfBase64(
        res.data.pdfBase64,
        res.data.filename
      );
      toast.success("PDF descargado.");
    } finally {
      setDescargandoPdfId(null);
    }
  }

  return (
    <ClassicFilteredTableLayout title={title} subtitle={subtitle} filters={
      <FiltrosHistorialPedidos
        proveedores={proveedores}
        proveedorId={proveedorId}
        sucursalCodigo={sucursalCodigo}
        estado={estado}
        q={q}
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
                      <TableHead className="w-[18%]">FECHA</TableHead>
                      <TableHead className="w-[28%]">PROVEEDOR</TableHead>
                      <TableHead className="w-[18%]">SUCURSAL</TableHead>
                      <TableHead className="w-[14%]">ESTADO</TableHead>
                      <TableHead className="w-[22%] tabla-bloque-secundario-head-divider">
                        ACCIONES
                      </TableHead>
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
                        const fechaStr = fecha ? formatDdMmHhMmArgentina(fecha) : "";
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
                              {it.estado === "RECEPCIONADO"
                                ? "RECEPCIONADO"
                                : "SIN RECEPCION"}
                            </TableCell>
                            <TableCell className="celda-datos tabla-bloque-secundario-cell-divider">
                              <div className="flex items-center justify-center gap-2">
                                <Tooltip>
                                  <TooltipTrigger asChild>
                                    <Button
                                      type="button"
                                      variant="outline"
                                      size="icon-xs"
                                      onClick={(e) => {
                                        e.stopPropagation();
                                        openRecepcion(it.id);
                                      }}
                                      aria-label="Recepción De Mercadería"
                                      className="disabled:cursor-not-allowed"
                                    >
                                      <PackageCheck className="h-4 w-4" />
                                    </Button>
                                  </TooltipTrigger>
                                  <TooltipContent side="top">
                                    Recepción De Mercadería
                                  </TooltipContent>
                                </Tooltip>
                                <Tooltip>
                                  <TooltipTrigger asChild>
                                    <Button
                                      type="button"
                                      variant="outline"
                                      size="icon-xs"
                                      onClick={(e) => {
                                        e.stopPropagation();
                                        openLectura(it.id);
                                      }}
                                      aria-label="Ver Detalles"
                                      className="disabled:cursor-not-allowed"
                                    >
                                      <Eye className="h-4 w-4" />
                                    </Button>
                                  </TooltipTrigger>
                                  <TooltipContent side="top">Ver Detalles</TooltipContent>
                                </Tooltip>
                                <Tooltip>
                                  <TooltipTrigger asChild>
                                    <Button
                                      type="button"
                                      variant="outline"
                                      size="icon-xs"
                                      onClick={(e) => {
                                        e.stopPropagation();
                                        openBorrar(it.id);
                                      }}
                                      aria-label="Borrar Pedido"
                                      className={cn(
                                        "disabled:cursor-not-allowed",
                                        "hover:border-destructive/60 hover:bg-destructive/10 hover:text-destructive"
                                      )}
                                    >
                                      <Trash2 className="h-4 w-4" />
                                    </Button>
                                  </TooltipTrigger>
                                  <TooltipContent side="top">Borrar Pedido</TooltipContent>
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
                      q,
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
          open={recepcionOpen}
          onOpenChange={(v) => {
            setRecepcionOpen(v);
            if (!v) {
              setRecepcionId(null);
              router.refresh();
            }
          }}
          pedidoHistoriaId={recepcionId}
        />
        <PedidoHistoriaLecturaModal
          open={lecturaOpen}
          onOpenChange={(v) => {
            setLecturaOpen(v);
            if (!v) setLecturaId(null);
          }}
          pedidoHistoriaId={lecturaId}
          onIrARecepcion={irARecepcionDesdeLectura}
          onDescargarPdf={descargarPdfDesdeLectura}
          descargandoPdf={descargandoPdfId !== null && descargandoPdfId === lecturaId}
        />
        <PedidoHistoriaBorrarConfirmModal
          open={borrarOpen}
          onOpenChange={(v) => {
            setBorrarOpen(v);
            if (!v) setBorrarId(null);
          }}
          pedidoHistoriaId={borrarId}
        />
      </div>
    </ClassicFilteredTableLayout>
  );
}
