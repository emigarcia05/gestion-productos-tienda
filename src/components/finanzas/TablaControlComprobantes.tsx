"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { CalendarDays, Check, ChevronDown } from "lucide-react";
import { toast } from "sonner";
import { actualizarControladoComprobanteAction } from "@/actions/controlComprobantes";
import AppModal from "@/components/shared/AppModal";
import FiltroRangoFechasCalendarioModal from "@/components/shared/FiltroRangoFechasCalendarioModal";
import FilterBar, {
  FILTER_DATE_RANGE_TRIGGER_CLASS,
  FILTER_INLINE_ACTION_SLOT_CLASS,
  FILTER_SELECT_WRAPPER_CLASS,
  FiltroIndividualContainer,
  FilaFiltrosDesplegables,
  FilterRowDateRange,
  FilterRowSelection,
  LimpiarFiltrosButton,
} from "@/components/FilterBar";
import {
  EmptyTableRow,
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Button } from "@/components/ui/button";
import { Dialog } from "@/components/ui/dialog";
import { cn } from "@/lib/utils";

interface ControlComprobanteRow {
  id: string;
  fechaComp: string;
  proveedorNombre: string;
  sucursalNombre: string;
  comprobante: string;
  total: string;
  montoAplicado: string;
  vencimientoSaldo: string;
  controlado: boolean;
}

function fmtFechaComp(isoDate: string): string {
  if (!isoDate) return "";
  const date = new Date(`${isoDate}T00:00:00`);
  if (Number.isNaN(date.getTime())) return isoDate;
  return date.toLocaleDateString("es-AR");
}

function fmtMonto(s: string): string {
  const n = Number(s);
  if (!Number.isFinite(n)) return "";
  return `$${n.toLocaleString("es-AR", {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  })}`;
}

export default function TablaControlComprobantes({
  filas,
  esEditor,
}: {
  filas: ControlComprobanteRow[];
  esEditor: boolean;
}) {
  const router = useRouter();
  const [isPending, startTransition] = useTransition();
  const [filtroProveedor, setFiltroProveedor] = useState("");
  const [filtroSucursal, setFiltroSucursal] = useState("");
  const [filtroPagado, setFiltroPagado] = useState("");
  const [filtroVencido, setFiltroVencido] = useState("");
  const [filtroControlado, setFiltroControlado] = useState("");
  const [filtroFechaDesde, setFiltroFechaDesde] = useState("");
  const [filtroFechaHasta, setFiltroFechaHasta] = useState("");
  const [openRangoFechas, setOpenRangoFechas] = useState(false);
  const [filaPendienteControlado, setFilaPendienteControlado] =
    useState<ControlComprobanteRow | null>(null);

  const proveedores = [...new Set(filas.map((f) => f.proveedorNombre))]
    .filter((v) => v.trim().length > 0)
    .sort((a, b) => a.localeCompare(b, "es"));
  const sucursales = [...new Set(filas.map((f) => f.sucursalNombre))]
    .filter((v) => v.trim().length > 0)
    .sort((a, b) => a.localeCompare(b, "es"));

  const filasFiltradas = filas.filter((fila) => {
    if (filtroProveedor && fila.proveedorNombre !== filtroProveedor) return false;
    if (filtroSucursal && fila.sucursalNombre !== filtroSucursal) return false;
    if (filtroPagado === "pendiente" && !(Number(fila.total) > Number(fila.montoAplicado))) return false;
    if (filtroVencido === "vencido" && !(Number(fila.vencimientoSaldo) > 0)) return false;
    if (filtroControlado === "no" && fila.controlado) return false;
    if (filtroFechaDesde && fila.fechaComp < filtroFechaDesde) return false;
    if (filtroFechaHasta && fila.fechaComp > filtroFechaHasta) return false;
    return true;
  });

  const rangoFechasLabel = (() => {
    if (filtroFechaDesde && filtroFechaHasta) {
      return `${fmtFechaComp(filtroFechaDesde)} — ${fmtFechaComp(filtroFechaHasta)}`;
    }
    if (filtroFechaDesde) return `Desde ${fmtFechaComp(filtroFechaDesde)}`;
    if (filtroFechaHasta) return `Hasta ${fmtFechaComp(filtroFechaHasta)}`;
    return "RANGO DE FECHAS";
  })();

  function onConfirmarControlado(fila: ControlComprobanteRow) {
    if (!esEditor) return;
    startTransition(async () => {
      const nuevoEstado = !fila.controlado;
      const res = await actualizarControladoComprobanteAction({
        id: fila.id,
        controlado: nuevoEstado,
      });
      if (!res.ok) {
        toast.error(res.error);
        return;
      }
      toast.success(
        nuevoEstado
          ? "Comprobante marcado como controlado."
          : "Comprobante marcado como no controlado."
      );
      setFilaPendienteControlado(null);
      router.refresh();
    });
  }

  return (
    <div className="flex flex-1 min-h-0 flex-col gap-2 px-8 pb-4">
      <FilterBar className="filtros-contenedor-tienda bg-card">
        <FilterRowSelection>
          <FilaFiltrosDesplegables>
            <FiltroIndividualContainer
              className={FILTER_SELECT_WRAPPER_CLASS}
              activo={Boolean(filtroProveedor)}
              onLimpiar={() => setFiltroProveedor("")}
            >
              <Select
                value={filtroProveedor ?? ""}
                onValueChange={(v) => setFiltroProveedor(v)}
              >
                <SelectTrigger className="input-filtro-unificado">
                  <SelectValue placeholder="PROVEEDOR" />
                </SelectTrigger>
                <SelectContent position="popper" side="bottom" align="start" className="select-content-filtro">
                  {proveedores.map((proveedor) => (
                    <SelectItem key={proveedor} value={proveedor}>
                      {proveedor}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </FiltroIndividualContainer>
            <FiltroIndividualContainer
              className={FILTER_SELECT_WRAPPER_CLASS}
              activo={Boolean(filtroSucursal)}
              onLimpiar={() => setFiltroSucursal("")}
            >
              <Select
                value={filtroSucursal ?? ""}
                onValueChange={(v) => setFiltroSucursal(v)}
              >
                <SelectTrigger className="input-filtro-unificado">
                  <SelectValue placeholder="SUCURSAL" />
                </SelectTrigger>
                <SelectContent position="popper" side="bottom" align="start" className="select-content-filtro">
                  {sucursales.map((sucursal) => (
                    <SelectItem key={sucursal} value={sucursal}>
                      {sucursal}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </FiltroIndividualContainer>
            <FiltroIndividualContainer
              className={FILTER_SELECT_WRAPPER_CLASS}
              activo={Boolean(filtroPagado)}
              onLimpiar={() => setFiltroPagado("")}
            >
              <Select
                value={filtroPagado ?? ""}
                onValueChange={(v) => setFiltroPagado(v)}
              >
                <SelectTrigger className="input-filtro-unificado">
                  <SelectValue placeholder="PAGADO" />
                </SelectTrigger>
                <SelectContent position="popper" side="bottom" align="start" className="select-content-filtro">
                  <SelectItem value="pendiente">PENDIENTE</SelectItem>
                </SelectContent>
              </Select>
            </FiltroIndividualContainer>
            <FiltroIndividualContainer
              className={FILTER_SELECT_WRAPPER_CLASS}
              activo={Boolean(filtroVencido)}
              onLimpiar={() => setFiltroVencido("")}
            >
              <Select
                value={filtroVencido ?? ""}
                onValueChange={(v) => setFiltroVencido(v)}
              >
                <SelectTrigger className="input-filtro-unificado">
                  <SelectValue placeholder="VENCIDO" />
                </SelectTrigger>
                <SelectContent position="popper" side="bottom" align="start" className="select-content-filtro">
                  <SelectItem value="vencido">VENCIDO</SelectItem>
                </SelectContent>
              </Select>
            </FiltroIndividualContainer>
            <div className={cn(FILTER_INLINE_ACTION_SLOT_CLASS, "gap-2")}>
              <FiltroIndividualContainer className={cn(FILTER_SELECT_WRAPPER_CLASS, "w-full")} activo={Boolean(filtroControlado)} onLimpiar={() => setFiltroControlado("")}>
                <Select
                  value={filtroControlado ?? ""}
                  onValueChange={(v) => setFiltroControlado(v)}
                >
                  <SelectTrigger className="input-filtro-unificado">
                    <SelectValue placeholder="CONTROLADO" />
                  </SelectTrigger>
                  <SelectContent
                    position="popper"
                    side="bottom"
                    align="start"
                    className="select-content-filtro"
                  >
                    <SelectItem value="no">NO</SelectItem>
                  </SelectContent>
                </Select>
              </FiltroIndividualContainer>
              <LimpiarFiltrosButton
                onClick={() => {
                  setFiltroProveedor("");
                  setFiltroSucursal("");
                  setFiltroPagado("");
                  setFiltroVencido("");
                  setFiltroControlado("");
                  setFiltroFechaDesde("");
                  setFiltroFechaHasta("");
                }}
              />
            </div>
          </FilaFiltrosDesplegables>
        </FilterRowSelection>
        <FilterRowDateRange>
          <FiltroIndividualContainer
            className="w-full min-w-0"
            activo={Boolean(filtroFechaDesde || filtroFechaHasta)}
            onLimpiar={() => {
              setFiltroFechaDesde("");
              setFiltroFechaHasta("");
            }}
          >
            <div className="flex w-full items-center gap-2">
              <Button
                type="button"
                variant="outline"
                className={cn(FILTER_DATE_RANGE_TRIGGER_CLASS, "h-10")}
                onClick={() => setOpenRangoFechas(true)}
              >
                <span className="inline-flex items-center gap-2 truncate">
                  <CalendarDays className="h-4 w-4 shrink-0" aria-hidden />
                  <span className="truncate">{rangoFechasLabel}</span>
                </span>
                <ChevronDown className="h-4 w-4 shrink-0" aria-hidden />
              </Button>
            </div>
          </FiltroIndividualContainer>
        </FilterRowDateRange>
      </FilterBar>
      <div className="contenedor-tabla-gestion flex min-h-0 flex-1 flex-col overflow-hidden rounded-md border border-border bg-card">
        <div className="flex-1 min-h-0 min-w-0 overflow-x-auto overflow-y-auto">
          <Table variant="compact" scrollX={false}>
            <TableHeader>
              <TableRow className="hover:bg-transparent">
                <TableHead className="w-[8%] min-w-[6rem]">CONTROLADO</TableHead>
                <TableHead className="w-[10%] min-w-[7rem]">FECHA COMP.</TableHead>
                <TableHead className="w-[26%] min-w-[12rem]">PROVEEDOR</TableHead>
                <TableHead className="w-[12%] min-w-[8rem]">SUCURSAL</TableHead>
                <TableHead className="w-[12%] min-w-[8rem]">COMPROBANTE</TableHead>
                <TableHead className="w-[10%] min-w-[8rem]">TOTAL</TableHead>
                <TableHead className="w-[10%] min-w-[8rem]">MONTO APLICADO</TableHead>
                <TableHead className="w-[12%] min-w-[8rem]">VENCIMIENTO</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {filasFiltradas.length === 0 ? (
                <EmptyTableRow colSpan={8} message="Sin comprobantes para mostrar." />
              ) : (
                filasFiltradas.map((fila) => {
                  const vencimiento = Number(fila.vencimientoSaldo);
                  return (
                    <TableRow
                      key={fila.id}
                      className={cn(esEditor && "cursor-pointer")}
                      onDoubleClick={() => {
                        if (!esEditor) return;
                        setFilaPendienteControlado(fila);
                      }}
                    >
                      <TableCell className="celda-datos text-center">
                        <div className="flex items-center justify-center w-full">
                          <span
                            className={cn(
                              "tabla-check-toggle",
                              fila.controlado &&
                                "border-primary !bg-primary !text-primary-foreground"
                            )}
                            aria-label={fila.controlado ? "Comprobante controlado" : "Comprobante no controlado"}
                            role="img"
                          >
                            {fila.controlado ? <Check aria-hidden="true" /> : null}
                          </span>
                        </div>
                      </TableCell>
                      <TableCell className="celda-datos celda-mono">{fmtFechaComp(fila.fechaComp)}</TableCell>
                      <TableCell className="celda-datos text-left font-medium" title={fila.proveedorNombre}>
                        {fila.proveedorNombre}
                      </TableCell>
                      <TableCell className="celda-datos text-left">{fila.sucursalNombre}</TableCell>
                      <TableCell className="celda-datos celda-mono">{fila.comprobante}</TableCell>
                      <TableCell className="celda-datos celda-numero">{fmtMonto(fila.total)}</TableCell>
                      <TableCell className="celda-datos celda-numero">{fmtMonto(fila.montoAplicado)}</TableCell>
                      <TableCell
                        className={cn(
                          "celda-datos celda-numero",
                          vencimiento > 0 && "font-semibold text-destructive"
                        )}
                      >
                        {vencimiento > 0 ? fmtMonto(fila.vencimientoSaldo) : ""}
                      </TableCell>
                    </TableRow>
                  );
                })
              )}
            </TableBody>
          </Table>
        </div>
      </div>
      <FiltroRangoFechasCalendarioModal
        open={openRangoFechas}
        onOpenChange={setOpenRangoFechas}
        fechaDesde={filtroFechaDesde}
        fechaHasta={filtroFechaHasta}
        onAplicarRango={(desde, hasta) => {
          setFiltroFechaDesde(desde);
          setFiltroFechaHasta(hasta);
        }}
        onLimpiar={() => {
          setFiltroFechaDesde("");
          setFiltroFechaHasta("");
        }}
      />
      <Dialog
        open={filaPendienteControlado !== null}
        onOpenChange={(open) => !open && setFilaPendienteControlado(null)}
      >
        <AppModal
          title="Confirmar Controlado"
          size="sm"
          actions={
            <>
              <Button
                type="button"
                variant="outline"
                onClick={() => setFilaPendienteControlado(null)}
                disabled={isPending}
              >
                Cancelar
              </Button>
              <Button
                type="button"
                onClick={() =>
                  filaPendienteControlado && onConfirmarControlado(filaPendienteControlado)
                }
                disabled={!filaPendienteControlado || isPending}
              >
                {filaPendienteControlado?.controlado
                  ? "Marcar Como No Controlado"
                  : "Marcar Como Controlado"}
              </Button>
            </>
          }
        >
          <div className="text-sm text-foreground">
            {filaPendienteControlado?.controlado
              ? "Desea marcar este comprobante como \"No Controlado\"?"
              : "Desea marcar este comprobante como \"Controlado\"?"}
          </div>
        </AppModal>
      </Dialog>
    </div>
  );
}
