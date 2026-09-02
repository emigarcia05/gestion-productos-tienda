"use client";

import { useMemo, useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { CalendarClock, CalendarDays, Check, ChevronDown } from "lucide-react";
import { toast } from "sonner";
import {
  actualizarControladoComprobanteAction,
  actualizarPlazoPagoComprobanteAction,
} from "@/actions/controlComprobantes";
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
import { Label } from "@/components/ui/label";
import {
  PLAZOS_PAGO_COMPROBANTE_PERMITIDOS,
} from "@/lib/validations/controlComprobantes";
import {
  TABLE_ROW_ACTION_ICON_CLASS,
  TABLE_ROW_CELL_ICON_ACTIONS_FLEX_CLASS,
  TABLE_ROW_ICON_BUTTON_FILLED_BRAND_CLASS,
} from "@/lib/ui-classes";
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
  plazoPagoDias: number | null;
  plazoEfectivoDias: number;
  plazoProveedorDefault: number;
  fechaVenc: string;
}

function fmtFechaComp(isoDate: string): string {
  if (!isoDate) return "";
  const date = new Date(`${isoDate.slice(0, 10)}T00:00:00`);
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

function plazoSelectValue(plazoPagoDias: number | null): string {
  return plazoPagoDias == null ? "default" : String(plazoPagoDias);
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
  const [filaPlazoPago, setFilaPlazoPago] = useState<ControlComprobanteRow | null>(null);
  const [plazoSeleccionado, setPlazoSeleccionado] = useState("default");

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

  const plazoPreviewDias = useMemo(() => {
    if (!filaPlazoPago) return null;
    if (plazoSeleccionado === "default") return filaPlazoPago.plazoProveedorDefault;
    const n = Number(plazoSeleccionado);
    return Number.isFinite(n) ? n : filaPlazoPago.plazoEfectivoDias;
  }, [filaPlazoPago, plazoSeleccionado]);

  const fechaVencPreview = useMemo(() => {
    if (!filaPlazoPago || plazoPreviewDias == null) return "";
    const iso = filaPlazoPago.fechaComp.slice(0, 10);
    const [ys, ms, ds] = iso.split("-");
    const y = Number(ys);
    const m = Number(ms);
    const d = Number(ds);
    if (!Number.isFinite(y) || !Number.isFinite(m) || !Number.isFinite(d)) return "";
    const t = new Date(Date.UTC(y, m - 1, d));
    t.setUTCDate(t.getUTCDate() + Math.max(1, plazoPreviewDias));
    return t.toISOString().slice(0, 10);
  }, [filaPlazoPago, plazoPreviewDias]);

  function abrirModalPlazo(fila: ControlComprobanteRow) {
    if (!esEditor) return;
    setFilaPlazoPago(fila);
    setPlazoSeleccionado(plazoSelectValue(fila.plazoPagoDias));
  }

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

  function onGuardarPlazoPago() {
    if (!filaPlazoPago || !esEditor) return;
    startTransition(async () => {
      const res = await actualizarPlazoPagoComprobanteAction({
        id: filaPlazoPago.id,
        plazoPagoDias: plazoSeleccionado,
      });
      if (!res.ok) {
        toast.error(res.error);
        return;
      }
      toast.success("Plazo de pago actualizado.");
      setFilaPlazoPago(null);
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
                <TableHead className="w-[10%] min-w-[7rem]">FECHA COMP.</TableHead>
                <TableHead className="w-[22%] min-w-[12rem]">PROVEEDOR</TableHead>
                <TableHead className="w-[10%] min-w-[8rem]">SUCURSAL</TableHead>
                <TableHead className="w-[12%] min-w-[8rem]">COMPROBANTE</TableHead>
                <TableHead className="w-[10%] min-w-[8rem]">TOTAL</TableHead>
                <TableHead className="w-[10%] min-w-[8rem]">MONTO APLICADO</TableHead>
                <TableHead className="w-[10%] min-w-[7rem]">PLAZO</TableHead>
                <TableHead className="w-[10%] min-w-[7rem]">FECHA VENC.</TableHead>
                <TableHead className="w-[10%] min-w-[8rem]">VENCIMIENTO</TableHead>
                {esEditor ? (
                  <TableHead className="w-[12%] min-w-[9rem] text-center">ACCIONES</TableHead>
                ) : null}
              </TableRow>
            </TableHeader>
            <TableBody>
              {filasFiltradas.length === 0 ? (
                <EmptyTableRow
                  colSpan={esEditor ? 10 : 9}
                  message="Sin comprobantes para mostrar."
                />
              ) : (
                filasFiltradas.map((fila) => {
                  const vencimiento = Number(fila.vencimientoSaldo);
                  const plazoCustom = fila.plazoPagoDias != null;
                  return (
                    <TableRow key={fila.id}>
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
                          plazoCustom && "font-semibold text-primary"
                        )}
                        title={
                          plazoCustom
                            ? `Personalizado (${fila.plazoEfectivoDias} días)`
                            : `Proveedor (${fila.plazoProveedorDefault} días)`
                        }
                      >
                        {fila.plazoEfectivoDias}
                      </TableCell>
                      <TableCell className="celda-datos celda-mono">
                        {fmtFechaComp(fila.fechaVenc)}
                      </TableCell>
                      <TableCell
                        className={cn(
                          "celda-datos celda-numero",
                          vencimiento > 0 && "font-semibold text-destructive"
                        )}
                      >
                        {vencimiento > 0 ? fmtMonto(fila.vencimientoSaldo) : ""}
                      </TableCell>
                      {esEditor ? (
                        <TableCell className="celda-datos p-0">
                          <div className={TABLE_ROW_CELL_ICON_ACTIONS_FLEX_CLASS}>
                            <Button
                              type="button"
                              variant="ghost"
                              size="icon"
                              className={cn(
                                TABLE_ROW_ICON_BUTTON_FILLED_BRAND_CLASS,
                                fila.controlado && "!bg-primary"
                              )}
                              aria-label={
                                fila.controlado
                                  ? "Comprobante controlado"
                                  : "Marcar como controlado"
                              }
                              title="Controlado"
                              disabled={isPending}
                              onClick={() => setFilaPendienteControlado(fila)}
                            >
                              <Check className={TABLE_ROW_ACTION_ICON_CLASS} aria-hidden />
                            </Button>
                            <Button
                              type="button"
                              variant="ghost"
                              size="icon"
                              className={cn(
                                TABLE_ROW_ICON_BUTTON_FILLED_BRAND_CLASS,
                                plazoCustom && "!bg-accent2"
                              )}
                              aria-label="Plazo de pago"
                              title="Plazo De Pago"
                              disabled={isPending}
                              onClick={() => abrirModalPlazo(fila)}
                            >
                              <CalendarClock className={TABLE_ROW_ACTION_ICON_CLASS} aria-hidden />
                            </Button>
                          </div>
                        </TableCell>
                      ) : null}
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
              ? "¿Desea marcar este comprobante como \"No Controlado\"?"
              : "¿Desea marcar este comprobante como \"Controlado\"?"}
          </div>
        </AppModal>
      </Dialog>
      <Dialog
        open={filaPlazoPago !== null}
        onOpenChange={(open) => !open && setFilaPlazoPago(null)}
      >
        <AppModal
          title="Plazo De Pago"
          size="sm"
          actions={
            <>
              <Button
                type="button"
                variant="outline"
                onClick={() => setFilaPlazoPago(null)}
                disabled={isPending}
              >
                Cancelar
              </Button>
              <Button
                type="button"
                onClick={onGuardarPlazoPago}
                disabled={!filaPlazoPago || isPending}
              >
                Guardar
              </Button>
            </>
          }
        >
          {filaPlazoPago ? (
            <div className="space-y-4 text-sm text-foreground">
              <p>
                <span className="text-muted-foreground">Comprobante:</span>{" "}
                {filaPlazoPago.comprobante}
              </p>
              <p>
                <span className="text-muted-foreground">Proveedor:</span>{" "}
                {filaPlazoPago.proveedorNombre}
              </p>
              <div className="space-y-1.5">
                <Label htmlFor="plazoPagoComprobante">PLAZO DE PAGO (DÍAS)</Label>
                <Select value={plazoSeleccionado} onValueChange={setPlazoSeleccionado}>
                  <SelectTrigger id="plazoPagoComprobante" className="w-full">
                    <SelectValue placeholder="Seleccionar plazo" />
                  </SelectTrigger>
                  <SelectContent position="popper" side="bottom" align="start">
                    <SelectItem value="default">
                      Proveedor ({filaPlazoPago.plazoProveedorDefault} días)
                    </SelectItem>
                    {PLAZOS_PAGO_COMPROBANTE_PERMITIDOS.map((dias) => (
                      <SelectItem key={dias} value={String(dias)}>
                        {dias} días
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <p>
                <span className="text-muted-foreground">Fecha vencimiento:</span>{" "}
                {fechaVencPreview ? fmtFechaComp(fechaVencPreview) : ""}
              </p>
            </div>
          ) : null}
        </AppModal>
      </Dialog>
    </div>
  );
}
