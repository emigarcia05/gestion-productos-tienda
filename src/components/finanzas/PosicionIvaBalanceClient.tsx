"use client";

import { useCallback, useState } from "react";
import { Loader2 } from "lucide-react";
import { Dialog } from "@/components/ui/dialog";
import AppModal from "@/components/shared/AppModal";
import { Button } from "@/components/ui/button";
import ClassicFilteredTableLayout from "@/components/shared/ClassicFilteredTableLayout";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
  EmptyTableRow,
} from "@/components/ui/table";
import { cn } from "@/lib/utils";
import { fmtPrecio } from "@/lib/format";
import { formatIsoYmdDdMmYyyyArgentina } from "@/lib/fechaArgentina";
import { listarDetalleIvaCreditoMesAction } from "@/actions/finBalPosicionIva";
import type { DetalleLineaIvaCreditoBalance } from "@/services/finBalPosicionIva.service";
import { toast } from "sonner";

const MESES_CALENDARIO: { valor: number; etiqueta: string }[] = [
  { valor: 1, etiqueta: "ENERO" },
  { valor: 2, etiqueta: "FEBRERO" },
  { valor: 3, etiqueta: "MARZO" },
  { valor: 4, etiqueta: "ABRIL" },
  { valor: 5, etiqueta: "MAYO" },
  { valor: 6, etiqueta: "JUNIO" },
  { valor: 7, etiqueta: "JULIO" },
  { valor: 8, etiqueta: "AGOSTO" },
  { valor: 9, etiqueta: "SEPTIEMBRE" },
  { valor: 10, etiqueta: "OCTUBRE" },
  { valor: 11, etiqueta: "NOVIEMBRE" },
  { valor: 12, etiqueta: "DICIEMBRE" },
];

const TH_NUM = "text-right whitespace-nowrap";
const TD_NUM = "celda-datos text-right tabular-nums";

interface Props {
  anio: number;
  ivaCreditoPorMes: number[];
}

function CeldaIvaPendiente() {
  return <span className="text-muted-foreground">—</span>;
}

function celdaMontoIvaCredito(pesos: number) {
  return <>${fmtPrecio(pesos)}</>;
}

export default function PosicionIvaBalanceClient({ anio, ivaCreditoPorMes }: Props) {
  const [modalOpen, setModalOpen] = useState(false);
  const [mesDetalle, setMesDetalle] = useState<number | null>(null);
  const [cargandoDetalle, setCargandoDetalle] = useState(false);
  const [filasDetalle, setFilasDetalle] = useState<DetalleLineaIvaCreditoBalance[]>([]);

  const etiquetaMesDetalle =
    mesDetalle != null ? MESES_CALENDARIO.find((x) => x.valor === mesDetalle)?.etiqueta ?? "" : "";

  const abrirDetalleMes = useCallback(
    async (mes: number) => {
      setMesDetalle(mes);
      setModalOpen(true);
      setCargandoDetalle(true);
      setFilasDetalle([]);
      try {
        const r = await listarDetalleIvaCreditoMesAction({ mes, anio });
        if (!r.ok) {
          toast.error(r.error ?? "No se pudo cargar el detalle.");
          setFilasDetalle([]);
          return;
        }
        setFilasDetalle(r.data);
      } finally {
        setCargandoDetalle(false);
      }
    },
    [anio]
  );

  function cerrarModal(open: boolean) {
    setModalOpen(open);
    if (!open) {
      setMesDetalle(null);
      setFilasDetalle([]);
    }
  }

  return (
    <div className="area-page-shell">
      <ClassicFilteredTableLayout title="Balance" subtitle="Posición de IVA" contentWidth="full">
        <div className="flex flex-1 min-h-0 flex-col pb-4">
          <div className="contenedor-tabla-gestion flex min-h-0 flex-1 flex-col overflow-hidden rounded-md border border-border bg-card">
            <div className="flex min-h-0 min-w-0 flex-1 flex-col overflow-auto">
              <div data-slot="table-container" className="relative w-full min-w-0 max-w-full">
                <Table
                  data-slot="table"
                  className="w-full caption-bottom text-sm tabla-gestion-compacta table-fixed"
                >
                  <colgroup>
                    <col style={{ width: "28%" }} />
                    <col style={{ width: "24%" }} />
                    <col style={{ width: "24%" }} />
                    <col style={{ width: "24%" }} />
                  </colgroup>
                  <TableHeader>
                    <TableRow className="hover:bg-transparent">
                      <TableHead className="min-w-0">MES</TableHead>
                      <TableHead className={cn(TH_NUM, "min-w-0")}>IVA DÉBITO</TableHead>
                      <TableHead className={cn(TH_NUM, "min-w-0")}>IVA CRÉDITO</TableHead>
                      <TableHead className={cn(TH_NUM, "min-w-0")}>IVA SALDO</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {MESES_CALENDARIO.map((m) => (
                      <TableRow key={m.valor}>
                        <TableCell className="celda-datos min-w-0 whitespace-nowrap font-medium">
                          {m.etiqueta} {anio}
                        </TableCell>
                        <TableCell className={cn(TD_NUM, "min-w-0")}>
                          <CeldaIvaPendiente />
                        </TableCell>
                        <TableCell
                          className={cn(
                            TD_NUM,
                            "min-w-0 celda-destacado cursor-pointer select-none",
                            "hover:bg-muted/50"
                          )}
                          title="Doble clic para ver detalle"
                          onDoubleClick={() => void abrirDetalleMes(m.valor)}
                          role="button"
                          tabIndex={0}
                          onKeyDown={(e) => {
                            if (e.key === "Enter" || e.key === " ") {
                              e.preventDefault();
                              void abrirDetalleMes(m.valor);
                            }
                          }}
                        >
                          {celdaMontoIvaCredito(ivaCreditoPorMes[m.valor - 1] ?? 0)}
                        </TableCell>
                        <TableCell className={cn(TD_NUM, "min-w-0")}>
                          <CeldaIvaPendiente />
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </div>
            </div>
          </div>
        </div>
      </ClassicFilteredTableLayout>

      <Dialog open={modalOpen} onOpenChange={cerrarModal}>
        <AppModal
          title={`Detalle IVA Crédito - ${etiquetaMesDetalle} ${anio}`}
          size="xl"
          className="max-w-4xl"
          padding="sm"
          scrollBody
          actions={
            <div className="flex w-full justify-end">
              <Button type="button" variant="outline" onClick={() => cerrarModal(false)}>
                Cerrar
              </Button>
            </div>
          }
        >
          <div className="min-h-[12rem]">
            {cargandoDetalle ? (
              <div className="flex items-center justify-center gap-2 py-16 text-muted-foreground">
                <Loader2 className="h-5 w-5 shrink-0 animate-spin" aria-hidden />
                Cargando…
              </div>
            ) : (
              <div className="rounded-md border border-border overflow-hidden">
                <Table className="text-sm tabla-gestion-compacta">
                  <TableHeader>
                    <TableRow className="hover:bg-transparent">
                      <TableHead className="min-w-0 whitespace-nowrap">FECHA</TableHead>
                      <TableHead className="min-w-0">GASTO</TableHead>
                      <TableHead className="min-w-0">SUCURSAL</TableHead>
                      <TableHead className={cn(TH_NUM, "min-w-0")}>MONTO</TableHead>
                      <TableHead className={cn(TH_NUM, "min-w-0")}>IVA CRÉDITO</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {filasDetalle.length === 0 ? (
                      <EmptyTableRow colSpan={5} message="No hay imputaciones con IVA crédito en este mes." />
                    ) : (
                      filasDetalle.map((f) => (
                        <TableRow key={f.id}>
                          <TableCell className="celda-datos whitespace-nowrap tabular-nums">
                            {formatIsoYmdDdMmYyyyArgentina(f.fechaDevengoIso)}
                          </TableCell>
                          <TableCell className="celda-datos min-w-0">{f.gastoNombre}</TableCell>
                          <TableCell className="celda-datos min-w-0">{f.sucursalNombre}</TableCell>
                          <TableCell className={cn(TD_NUM, "celda-destacado")}>${fmtPrecio(f.monto)}</TableCell>
                          <TableCell className={TD_NUM}>${fmtPrecio(f.ivaCredito)}</TableCell>
                        </TableRow>
                      ))
                    )}
                  </TableBody>
                </Table>
              </div>
            )}
          </div>
        </AppModal>
      </Dialog>
    </div>
  );
}
