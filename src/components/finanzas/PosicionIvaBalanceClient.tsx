"use client";

import { useCallback, useState } from "react";
import { Loader2, Pencil } from "lucide-react";
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
import {
  listarDetalleIvaCreditoComprasMercaderiaMesAction,
  listarDetalleIvaCreditoGastosMesAction,
} from "@/actions/finBalPosicionIva";
import type {
  DetalleLineaIvaCreditoBalance,
  DetalleLineaIvaCreditoCompraMercaderia,
} from "@/services/finBalPosicionIva.service";
import TotalVentasConIvaModal from "@/components/finanzas/TotalVentasConIvaModal";
import { toast } from "sonner";
import {
  TABLE_ROW_ACTION_ICON_CLASS,
  TABLE_ROW_ICON_BUTTON_FILLED_BRAND_CLASS,
} from "@/lib/ui-classes";

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

/** Botón ícono edición en tabla balance (misma familia que Balance mensual). */
const CLASE_BOTON_EDITAR_IVA_DEBITO = cn(
  TABLE_ROW_ICON_BUTTON_FILLED_BRAND_CLASS,
  "!h-7 !w-7 min-h-0 !p-1 shrink-0",
);

type VistaDetalleIva = "menu" | "gastos" | "compras";

interface Props {
  anio: number;
  esEditor: boolean;
  /** Bruto con IVA persistido por mes (`fin_bal_iva_deb`), índice 0 = enero. */
  montosBrutosVentasConIvaPorMes: number[];
  ivaDebitoPorMes: number[];
  ivaCreditoPorMes: number[];
}

function celdaMontoPesos(pesos: number) {
  return <>${fmtPrecio(pesos)}</>;
}

export default function PosicionIvaBalanceClient({
  anio,
  esEditor,
  montosBrutosVentasConIvaPorMes,
  ivaDebitoPorMes,
  ivaCreditoPorMes,
}: Props) {
  const [mesModalVentasIva, setMesModalVentasIva] = useState<number | null>(null);
  const [modalOpen, setModalOpen] = useState(false);
  const [mesDetalle, setMesDetalle] = useState<number | null>(null);
  const [vista, setVista] = useState<VistaDetalleIva>("menu");
  const [cargandoDetalle, setCargandoDetalle] = useState(false);
  const [filasGasto, setFilasGasto] = useState<DetalleLineaIvaCreditoBalance[]>([]);
  const [filasCompra, setFilasCompra] = useState<DetalleLineaIvaCreditoCompraMercaderia[]>([]);

  const etiquetaMesDetalle =
    mesDetalle != null ? MESES_CALENDARIO.find((x) => x.valor === mesDetalle)?.etiqueta ?? "" : "";

  const tituloModal =
    mesDetalle == null
      ? "Detalle IVA Crédito"
      : vista === "menu"
        ? `Detalle IVA Crédito - ${etiquetaMesDetalle} ${anio}`
        : vista === "gastos"
          ? `Detalle IVA Crédito - Gastos - ${etiquetaMesDetalle} ${anio}`
          : `Detalle IVA Crédito - Compras Mercadería - ${etiquetaMesDetalle} ${anio}`;

  const abrirMenuMes = useCallback((mes: number) => {
    setMesDetalle(mes);
    setVista("menu");
    setFilasGasto([]);
    setFilasCompra([]);
    setCargandoDetalle(false);
    setModalOpen(true);
  }, []);

  const volverMenu = useCallback(() => {
    setVista("menu");
    setFilasGasto([]);
    setFilasCompra([]);
    setCargandoDetalle(false);
  }, []);

  const abrirDetalleGastos = useCallback(async () => {
    if (mesDetalle == null) return;
    setVista("gastos");
    setCargandoDetalle(true);
    setFilasGasto([]);
    try {
      const r = await listarDetalleIvaCreditoGastosMesAction({ mes: mesDetalle, anio });
      if (!r.ok) {
        toast.error(r.error ?? "No se pudo cargar el detalle.");
        setFilasGasto([]);
        return;
      }
      setFilasGasto(r.data);
    } finally {
      setCargandoDetalle(false);
    }
  }, [anio, mesDetalle]);

  const abrirDetalleCompras = useCallback(async () => {
    if (mesDetalle == null) return;
    setVista("compras");
    setCargandoDetalle(true);
    setFilasCompra([]);
    try {
      const r = await listarDetalleIvaCreditoComprasMercaderiaMesAction({ mes: mesDetalle, anio });
      if (!r.ok) {
        toast.error(r.error ?? "No se pudo cargar el detalle.");
        setFilasCompra([]);
        return;
      }
      setFilasCompra(r.data);
    } finally {
      setCargandoDetalle(false);
    }
  }, [anio, mesDetalle]);

  function cerrarModal(open: boolean) {
    setModalOpen(open);
    if (!open) {
      setMesDetalle(null);
      setVista("menu");
      setFilasGasto([]);
      setFilasCompra([]);
      setCargandoDetalle(false);
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
                      <TableHead className="min-w-0 text-left whitespace-nowrap">IVA DÉBITO</TableHead>
                      <TableHead className={cn(TH_NUM, "min-w-0")}>IVA CRÉDITO</TableHead>
                      <TableHead className={cn(TH_NUM, "min-w-0")}>IVA SALDO</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {MESES_CALENDARIO.map((m) => {
                      const ix = m.valor - 1;
                      const debito = ivaDebitoPorMes[ix] ?? 0;
                      const credito = ivaCreditoPorMes[ix] ?? 0;
                      const saldo = debito - credito;
                      return (
                      <TableRow key={m.valor}>
                        <TableCell className="celda-datos min-w-0 whitespace-nowrap font-medium">
                          {m.etiqueta} {anio}
                        </TableCell>
                        <TableCell className="celda-datos min-w-0 align-middle">
                          <div className="flex w-full min-w-0 flex-wrap items-center justify-between gap-x-2 gap-y-1">
                            {esEditor ? (
                              <Button
                                type="button"
                                variant="ghost"
                                size="icon"
                                className={CLASE_BOTON_EDITAR_IVA_DEBITO}
                                title="TOTAL VENTAS CON IVA"
                                aria-label="Editar total ventas con IVA"
                                onClick={() => setMesModalVentasIva(m.valor)}
                              >
                                <Pencil className={TABLE_ROW_ACTION_ICON_CLASS} aria-hidden />
                              </Button>
                            ) : null}
                            <span
                              className={cn(
                                "tabular-nums whitespace-nowrap text-right",
                                esEditor ? "sm:ml-auto" : "ml-auto w-full flex-1",
                              )}
                            >
                              {celdaMontoPesos(debito)}
                            </span>
                          </div>
                        </TableCell>
                        <TableCell
                          className={cn(
                            TD_NUM,
                            "min-w-0 celda-destacado cursor-pointer select-none",
                            "hover:bg-muted/50"
                          )}
                          title="Clic para ver detalle"
                          onClick={() => abrirMenuMes(m.valor)}
                          role="button"
                          tabIndex={0}
                          onKeyDown={(e) => {
                            if (e.key === "Enter" || e.key === " ") {
                              e.preventDefault();
                              abrirMenuMes(m.valor);
                            }
                          }}
                        >
                          {celdaMontoPesos(credito)}
                        </TableCell>
                        <TableCell className={cn(TD_NUM, "min-w-0")}>{celdaMontoPesos(saldo)}</TableCell>
                      </TableRow>
                    );
                    })}
                  </TableBody>
                </Table>
              </div>
            </div>
          </div>
        </div>
      </ClassicFilteredTableLayout>

      <Dialog open={modalOpen} onOpenChange={cerrarModal}>
        <AppModal
          title={tituloModal}
          size="xl"
          className="max-w-4xl"
          padding="sm"
          scrollBody
          actions={
            <div className="flex w-full flex-wrap justify-end gap-2">
              {vista !== "menu" ? (
                <Button type="button" variant="outline" onClick={volverMenu}>
                  Volver
                </Button>
              ) : null}
              <Button type="button" variant="outline" onClick={() => cerrarModal(false)}>
                Cerrar
              </Button>
            </div>
          }
        >
          <div className="min-h-[12rem]">
            {vista === "menu" ? (
              <div className="flex flex-col gap-4 py-2">
                <p className="text-sm text-muted-foreground">¿Qué detalle desea ver?</p>
                <div className="flex flex-col gap-2 sm:flex-row">
                  <Button type="button" className="flex-1" onClick={() => void abrirDetalleGastos()}>
                    Gasto
                  </Button>
                  <Button type="button" className="flex-1" onClick={() => void abrirDetalleCompras()}>
                    Compra Mercadería
                  </Button>
                </div>
              </div>
            ) : cargandoDetalle ? (
              <div className="flex items-center justify-center gap-2 py-16 text-muted-foreground">
                <Loader2 className="h-5 w-5 shrink-0 animate-spin" aria-hidden />
                Cargando…
              </div>
            ) : vista === "gastos" ? (
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
                    {filasGasto.length === 0 ? (
                      <EmptyTableRow
                        colSpan={5}
                        message="No hay imputaciones con IVA crédito en este mes."
                      />
                    ) : (
                      filasGasto.map((f) => (
                        <TableRow key={f.id}>
                          <TableCell className="celda-datos whitespace-nowrap tabular-nums">
                            {formatIsoYmdDdMmYyyyArgentina(f.fechaDevengoIso)}
                          </TableCell>
                          <TableCell className="celda-datos min-w-0">{f.gastoNombre}</TableCell>
                          <TableCell className="celda-datos min-w-0">{f.sucursalNombre}</TableCell>
                          <TableCell className={cn(TD_NUM, "celda-destacado")}>
                            ${fmtPrecio(f.monto)}
                          </TableCell>
                          <TableCell className={TD_NUM}>${fmtPrecio(f.ivaCredito)}</TableCell>
                        </TableRow>
                      ))
                    )}
                  </TableBody>
                </Table>
              </div>
            ) : (
              <div className="rounded-md border border-border overflow-hidden">
                <Table className="text-sm tabla-gestion-compacta">
                  <TableHeader>
                    <TableRow className="hover:bg-transparent">
                      <TableHead className="min-w-0 whitespace-nowrap">FECHA</TableHead>
                      <TableHead className="min-w-0">PROVEEDOR</TableHead>
                      <TableHead className={cn(TH_NUM, "min-w-0")}>MONTO</TableHead>
                      <TableHead className={cn(TH_NUM, "min-w-0")}>IVA CRÉDITO</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {filasCompra.length === 0 ? (
                      <EmptyTableRow
                        colSpan={4}
                        message="No hay facturas de compra de mercadería en este mes."
                      />
                    ) : (
                      filasCompra.map((f) => (
                        <TableRow key={f.id}>
                          <TableCell className="celda-datos whitespace-nowrap tabular-nums">
                            {formatIsoYmdDdMmYyyyArgentina(f.fechaIso)}
                          </TableCell>
                          <TableCell className="celda-datos min-w-0">{f.proveedorNombre}</TableCell>
                          <TableCell className={cn(TD_NUM, "celda-destacado")}>
                            ${fmtPrecio(f.monto)}
                          </TableCell>
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

      <TotalVentasConIvaModal
        open={mesModalVentasIva != null}
        onOpenChange={(open) => {
          if (!open) setMesModalVentasIva(null);
        }}
        mes={mesModalVentasIva ?? 1}
        anio={anio}
        montoBrutoActual={
          mesModalVentasIva != null ? (montosBrutosVentasConIvaPorMes[mesModalVentasIva - 1] ?? 0) : 0
        }
      />
    </div>
  );
}
