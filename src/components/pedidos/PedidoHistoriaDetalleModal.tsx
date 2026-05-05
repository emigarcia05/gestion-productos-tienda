"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { Dialog } from "@/components/ui/dialog";
import AppModal from "@/components/shared/AppModal";
import FiltroBusquedaInput from "@/components/shared/FiltroBusquedaInput";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
  EmptyTableRow,
} from "@/components/ui/table";
import { Check, Pencil, Plus, Trash2 } from "lucide-react";
import { toast } from "sonner";
import type { PedidoHistoriaEstado } from "@/services/pedidosHistoria.service";
import type { PedidoHistoriaDetalle } from "@/services/pedidosHistoria.service";
import type { ProductoTiendaRowBusqueda } from "@/services/productosTienda.service";
import {
  getPedidoHistoriaDetalleAction,
  guardarRecepcionPedidoHistoriaAction,
  marcarPedidoHistoriaRegistradoAction,
} from "@/actions/pedidosHistoria";
import { exportarExcelRecepcionPedidoAction } from "@/actions/exportRecepcionPedidoExcel";
import AgregarProductosModal from "@/components/pedidos/AgregarProductosModal";
import ExportarRecepcionInstructorModal from "@/components/pedidos/ExportarRecepcionInstructorModal";
import MontoArInput from "@/components/shared/MontoArInput";
import ModalMicroLabel from "@/components/shared/ModalMicroLabel";
import { cn } from "@/lib/utils";
import {
  TABLE_ROW_ACTION_ICON_CLASS,
  TABLE_ROW_ICON_BUTTON_CLASS,
  TABLE_ROW_ICON_BUTTON_DESTRUCTIVE_HOVER_CLASS,
} from "@/lib/ui-classes";
import { descargarExcelBase64 } from "@/lib/descargarExcelBase64";
import {
  dateToIsoYmdArgentina,
  formatDdMmHhMmArgentina,
} from "@/lib/fechaArgentina";

const INSTRUCTOR_DELAY_MS = 1500;

function parseIntSafe(value: string): number {
  const n = Math.max(0, Math.floor(Number(value) || 0));
  return Number.isFinite(n) ? n : 0;
}

function toDate(value: string | Date | null | undefined): Date | null {
  if (!value) return null;
  if (value instanceof Date) return Number.isNaN(value.getTime()) ? null : value;
  const d = new Date(value);
  return Number.isNaN(d.getTime()) ? null : d;
}

function buildChecklistConfirmadoInicial(
  items: PedidoHistoriaDetalle["items"],
  estado: PedidoHistoriaEstado
): Record<string, boolean> {
  // En pedidos ya recepcionados, partimos con todos los ítems marcados como revisados
  // para que el flujo de corrección solo requiera tocar lo que cambió.
  if (estado === "RECEPCIONADO") {
    return Object.fromEntries(items.map((item) => [item.id, true]));
  }
  return {};
}

const inputBorderClassName = "border-[#0072bb] focus-visible:ring-[#0072bb]";

/**
 * Cabecera resumen: proveedor + metadatos | fecha factura (`sm`: dos columnas ~85% / ~15%).
 */
const GRID_CAPAS_SUP_PEDIDO_HISTORIA =
  "grid min-w-0 w-full grid-cols-1 gap-2 grid-cols-[85fr_15fr] gap-0";

/** Misma proporción que columnas de la tabla de ítems (check | desc | cant.p. | cant.r. | acciones). */
const GRID_PEDIDO_HISTORIA_TABLA_COLS =
  "grid w-full grid-cols-[5fr_50fr_10fr_20fr_15fr]";

/** Contenedor de grilla: sin borde ni fondo (transparente). */
const MODAL_SECTION_CARD_CLASS = "min-w-0 bg-transparent";

const MODAL_RESUMEN_PANEL_CLASS = "min-w-0 bg-transparent";

/** Total normalizado (`totalPedido`) distinto de vacío y mayor que 0. */
function totalPedidoMontoPositivo(norm: string): boolean {
  if (norm === "") return false;
  const n = Number(norm);
  return Number.isFinite(n) && n > 0;
}

interface Props {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  pedidoHistoriaId: string | null;
}

export default function PedidoHistoriaDetalleModal({
  open,
  onOpenChange,
  pedidoHistoriaId,
}: Props) {
  const [detalle, setDetalle] = useState<PedidoHistoriaDetalle | null>(null);
  const [loading, setLoading] = useState(false);
  const [guardando, setGuardando] = useState<string | null>(null);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  const [editingItemId, setEditingItemId] = useState<string | null>(null);
  const [editingValue, setEditingValue] = useState<string>("");

  /** Valor normalizado para lógica futura: "" | "123" | "123.45" (punto decimal). */
  const [totalPedido, setTotalPedido] = useState<string>("");
  const [agregarProductosOpen, setAgregarProductosOpen] = useState(false);
  const [busquedaAgregarProducto, setBusquedaAgregarProducto] = useState("");
  /** Valor ISO `YYYY-MM-DD` — UI: campo FECHA FACTURA. */
  const [fechaRecepcion, setFechaRecepcion] = useState<string>("");
  /** Check list por ítem: solo se marca vía botón OK (confirma cant. recibida) o cesto (0 + verificar). */
  const [checkListConfirmedByItem, setCheckListConfirmedByItem] = useState<Record<string, boolean>>(
    {}
  );
  /** Modo de corrección en pedidos RECEPCIONADO (edición local de UI). */
  const [modoCorreccionRecepcionado, setModoCorreccionRecepcionado] = useState(false);
  const [showExportInstructor, setShowExportInstructor] = useState(false);

  const fechaInputRef = useRef<HTMLInputElement>(null);
  const busquedaAgregarRef = useRef<HTMLInputElement>(null);
  const cantRecEditingInputRef = useRef<HTMLInputElement>(null);

  const estado: PedidoHistoriaEstado | null = detalle ? detalle.estado : null;
  const bloqueadoPorEstado = estado === "RECEPCIONADO";
  const locked = bloqueadoPorEstado && !modoCorreccionRecepcionado;
  const busy = guardando != null || loading;

  const generadoAtStr = useMemo(() => {
    const d = toDate(detalle?.generadoAt ?? null);
    return d ? formatDdMmHhMmArgentina(d) : "";
  }, [detalle?.generadoAt]);

  async function cargarDetalle(
    id: string,
    options?: { preserveChecklist?: boolean }
  ): Promise<PedidoHistoriaDetalle | null> {
    const res = await getPedidoHistoriaDetalleAction({ pedidoHistoriaId: id });
    if (!res.ok) {
      setDetalle(null);
      setErrorMsg(res.error ?? "Error al cargar detalle.");
      return null;
    }
    const detalleNormalizado = res.data;
    setDetalle(detalleNormalizado);
    const checklistInicial = buildChecklistConfirmadoInicial(
      detalleNormalizado.items,
      detalleNormalizado.estado
    );
    setCheckListConfirmedByItem((prev) => {
      if (!options?.preserveChecklist) return checklistInicial;
      const merged = { ...checklistInicial };
      for (const item of detalleNormalizado.items) {
        if (prev[item.id] === true) merged[item.id] = true;
      }
      return merged;
    });
    if (res.data.total != null && Number.isFinite(res.data.total) && res.data.total > 0) {
      const totalNorm = String(res.data.total);
      setTotalPedido(totalNorm);
    }
    // Para permitir "Descargar Recepcion" en modo RECEPCIONADO, alimentamos el campo con una fecha razonable.
    // Hoy no existe persistencia de "FECHA FACTURA" en DB; usamos `generadoAt` del snapshot.
    if (res.data.estado === "RECEPCIONADO") {
      const d = toDate(res.data.generadoAt);
      if (d) setFechaRecepcion(dateToIsoYmdArgentina(d));
    }
    setErrorMsg(null);
    return detalleNormalizado;
  }

  useEffect(() => {
    if (!open || !pedidoHistoriaId) return;

    queueMicrotask(() => {
      setDetalle(null);
      setErrorMsg(null);
      setLoading(true);
      setEditingItemId(null);
      setEditingValue("");
      setTotalPedido("");
      setAgregarProductosOpen(false);
      setBusquedaAgregarProducto("");
      setFechaRecepcion("");
      setCheckListConfirmedByItem({});
      setModoCorreccionRecepcionado(false);
      setShowExportInstructor(false);
    });

    void (async () => {
      try {
        await cargarDetalle(pedidoHistoriaId);
      } catch (e) {
        const msg = e instanceof Error ? e.message : "Error al cargar detalle.";
        setErrorMsg(msg);
      } finally {
        setLoading(false);
      }
    })();
  }, [open, pedidoHistoriaId]);

  useEffect(() => {
    if (!open || locked || loading) return;
    queueMicrotask(() => {
      fechaInputRef.current?.focus();
    });
  }, [open, pedidoHistoriaId, locked, loading]);

  useEffect(() => {
    if (!editingItemId) return;
    queueMicrotask(() => {
      cantRecEditingInputRef.current?.focus();
    });
  }, [editingItemId]);

  function actualizarItemCantRecibidaLocal(
    pedidoHistoriaItemId: string,
    cantRecibida: number,
    options?: { confirmChecklistAfter?: boolean }
  ): boolean {
    if (locked) return false;
    if (guardando) return false;
    if (fechaRecepcion.trim() === "") return false;

    setDetalle((prev) => {
      if (!prev) return prev;
      return {
        ...prev,
        items: prev.items.map((it) =>
          it.id === pedidoHistoriaItemId ? { ...it, cantRecibida } : it
        ),
      };
    });
    setEditingItemId(null);
    setEditingValue("");
    if (options?.confirmChecklistAfter) {
      setCheckListConfirmedByItem((prev) => ({
        ...prev,
        [pedidoHistoriaItemId]: true,
      }));
      setBusquedaAgregarProducto("");
    } else {
      setCheckListConfirmedByItem((prev) => {
        const next = { ...prev };
        delete next[pedidoHistoriaItemId];
        return next;
      });
    }
    return true;
  }

  function onClickOk(item: PedidoHistoriaDetalle["items"][number]) {
    return () => {
      if (locked || busy) return;
      if (fechaRecepcion.trim() === "") return;
      const cant = Math.max(0, item.cantPedida);
      actualizarItemCantRecibidaLocal(item.id, cant, {
        confirmChecklistAfter: true,
      });
    };
  }

  function onClickCesto(item: PedidoHistoriaDetalle["items"][number]) {
    return () => {
      if (locked || busy) return;
      if (fechaRecepcion.trim() === "") return;
      actualizarItemCantRecibidaLocal(item.id, 0, {
        confirmChecklistAfter: true,
      });
    };
  }

  function onClickEditar(item: PedidoHistoriaDetalle["items"][number]) {
    return () => {
      if (locked) return;
      if (busy) return;
      if (fechaRecepcion.trim() === "") return;
      const cantInicial = Math.max(0, item.cantPedida);
      const ok = actualizarItemCantRecibidaLocal(item.id, cantInicial);
      if (!ok) return;
      setEditingItemId(item.id);
      setEditingValue(String(cantInicial));
    };
  }

  async function agregarNuevaFila(
    producto: ProductoTiendaRowBusqueda,
    cantRecibida: number
  ) {
    if (locked) return;
    if (fechaRecepcion.trim() === "") return;
    if (!detalle) return;
    const cant = Math.max(0, Math.floor(Number(cantRecibida) || 0));
    if (cant <= 0) {
      toast.error("Ingresá una Cant. Recibida mayor a 0.");
      return;
    }
    const codNormalizado = producto.codTienda.trim();
    const yaExiste = detalle.items.some((it) => it.codTienda === codNormalizado);
    if (yaExiste) {
      toast.error("El producto ya existe en el pedido.");
      return;
    }

    const tempId = `tmp-${crypto.randomUUID()}`;
    setDetalle((prev) => {
      if (!prev) return prev;
      return {
        ...prev,
        items: [
          ...prev.items,
          {
            id: tempId,
            codTienda: codNormalizado,
            descripcionTienda: producto.descripcionTienda,
            cantPedida: cant,
            cantRecibida: cant,
          },
        ],
      };
    });
    setCheckListConfirmedByItem((prev) => ({ ...prev, [tempId]: true }));
    setAgregarProductosOpen(false);
    toast.success("Ítem agregado.");
    queueMicrotask(() => {
      setEditingItemId(null);
      setEditingValue("");
      busquedaAgregarRef.current?.focus();
    });
  }

  function ajustarEditingValue(delta: number) {
    if (locked || busy) return;
    if (fechaRecepcion.trim() === "") return;
    const current = parseIntSafe(editingValue);
    const next = Math.max(0, current + delta);
    setEditingValue(next === 0 ? "" : String(next));
  }

  function onClickConfirmarEdicion(item: PedidoHistoriaDetalle["items"][number]) {
    return () => {
      if (locked || busy) return;
      if (fechaRecepcion.trim() === "") return;
      if (editingItemId !== item.id) return;
      const cant = parseIntSafe(editingValue);
      actualizarItemCantRecibidaLocal(item.id, cant, {
        confirmChecklistAfter: true,
      });
    };
  }

  const itemsOrdenados = useMemo(() => detalle?.items ?? [], [detalle?.items]);

  const itemsFiltrados = useMemo(() => {
    const q = busquedaAgregarProducto.trim().toLocaleLowerCase("es");
    if (!q) return itemsOrdenados;
    return itemsOrdenados.filter((it) =>
      it.descripcionTienda.toLocaleLowerCase("es").includes(q)
    );
  }, [itemsOrdenados, busquedaAgregarProducto]);

  const fechaFacturaOk = fechaRecepcion.trim() !== "";
  const checklistCompleto =
    itemsOrdenados.length > 0 &&
    itemsOrdenados.every((it) => checkListConfirmedByItem[it.id] === true);
  const tablaYAltaHabilitados = !locked && !loading && fechaFacturaOk;
  const totalPedidoInputHabilitado = tablaYAltaHabilitados && checklistCompleto;
  const puedeRegistrarEnDux =
    Boolean(pedidoHistoriaId) &&
    !locked &&
    !busy &&
    fechaFacturaOk &&
    checklistCompleto &&
    totalPedidoMontoPositivo(totalPedido);

  async function persistirRecepcionActual(): Promise<boolean> {
    if (!pedidoHistoriaId || !detalle) return false;
    const res = await guardarRecepcionPedidoHistoriaAction({
      pedidoHistoriaId,
      items: detalle.items.map((item) => ({
        id: item.id.startsWith("tmp-") ? undefined : item.id,
        codTienda: item.codTienda,
        cantPedida: item.cantPedida,
        cantRecibida: item.cantRecibida,
      })),
    });
    if (!res.ok) {
      toast.error(res.error ?? "Error al guardar la recepción.");
      return false;
    }
    return true;
  }

  async function descargarRecepcionExcel(): Promise<boolean> {
    if (!pedidoHistoriaId) return false;
    const isoFecha =
      fechaRecepcion.trim() !== ""
        ? fechaRecepcion
        : (() => {
            const d = toDate(detalle?.generadoAt ?? null);
            return d ? dateToIsoYmdArgentina(d) : "";
          })();
    if (!isoFecha) {
      toast.error("No hay fecha para descargar la recepcion.");
      return false;
    }

    setGuardando("export");
    try {
      const excelRes = await exportarExcelRecepcionPedidoAction({
        pedidoHistoriaId,
        fechaFacturaIso: isoFecha,
        totalPedidoIngreso: totalPedidoMontoPositivo(totalPedido)
          ? Number(totalPedido)
          : undefined,
      });
      if (!excelRes.ok) {
        toast.error(excelRes.error ?? "Error al generar el Excel.");
        return false;
      }
      descargarExcelBase64(excelRes.data.excelBase64, excelRes.data.filename);
      setTimeout(() => setShowExportInstructor(true), INSTRUCTOR_DELAY_MS);
      return true;
    } finally {
      setGuardando(null);
    }
  }

  const bloquearNavegacionModalPorEdicionCantidad =
    editingItemId != null && !locked && fechaFacturaOk && !loading;

  function handleModalOpenChange(next: boolean) {
    if (!next && bloquearNavegacionModalPorEdicionCantidad) {
      toast.info(
        "Confirmá la cantidad con el ícono de verificación antes de continuar."
      );
      return;
    }
    onOpenChange(next);
  }

  return (
    <>
      <Dialog open={open} onOpenChange={handleModalOpenChange}>
        <AppModal
          title="Recepción Pedido"
          scrollBody={false}
          size="xl"
          className="max-w-[66rem] h-[95vh] max-h-[95vh]"
          bodyShellClassName="p-0"
          padding="sm"
          headerClassName="pt-3 pb-3"
          footerClassName="py-3"
          bodyClassName="py-2 py-2.5"
          actions={
            <>
              <Button
                type="button"
                variant="outline"
                disabled={bloquearNavegacionModalPorEdicionCantidad}
                onClick={() => handleModalOpenChange(false)}
              >
                Cerrar
              </Button>
              {!locked ? (
                <Button
                  type="button"
                  className="disabled:cursor-not-allowed"
                  onClick={async () => {
                    if (!pedidoHistoriaId) return;
                    if (!puedeRegistrarEnDux) return;
                    if (locked) return;
                    if (guardando) return;

                    setGuardando("sync");
                    try {
                      const guardadoOk = await persistirRecepcionActual();
                      if (!guardadoOk) return;
                      // Secuencia requerida: primero generamos y descargamos el Excel (97-2003),
                      // y luego registramos el pedido como "recibido" en DUX.
                      const excelRes = await exportarExcelRecepcionPedidoAction({
                        pedidoHistoriaId,
                        fechaFacturaIso: fechaRecepcion,
                        totalPedidoIngreso: Number(totalPedido),
                      });
                      if (!excelRes.ok) {
                        toast.error(excelRes.error ?? "Error al generar el Excel.");
                        return;
                      }
                      descargarExcelBase64(
                        excelRes.data.excelBase64,
                        excelRes.data.filename
                      );
                      setTimeout(
                        () => setShowExportInstructor(true),
                        INSTRUCTOR_DELAY_MS
                      );

                      const res = await marcarPedidoHistoriaRegistradoAction({
                        pedidoHistoriaId,
                        totalPedido: Number(totalPedido),
                      });
                      if (!res.ok) {
                        toast.error(res.error ?? "Error al registrar en DUX.");
                        return;
                      }
                      toast.success("Pedido registrado en DUX.");
                      handleModalOpenChange(false);
                    } finally {
                      setGuardando(null);
                    }
                  }}
                  disabled={
                    !puedeRegistrarEnDux || bloquearNavegacionModalPorEdicionCantidad
                  }
                >
                  Registrar En Dux
                </Button>
              ) : (
                <>
                  {!modoCorreccionRecepcionado ? (
                    <Button
                      type="button"
                      className="disabled:cursor-not-allowed"
                      disabled={
                        guardando != null ||
                        loading ||
                        bloquearNavegacionModalPorEdicionCantidad
                      }
                      onClick={() => {
                        setModoCorreccionRecepcionado(true);
                      }}
                    >
                      Corregir Recepcion
                    </Button>
                  ) : (
                    <Button
                      type="button"
                      className="disabled:cursor-not-allowed"
                      disabled={
                        guardando != null ||
                        loading ||
                        bloquearNavegacionModalPorEdicionCantidad
                      }
                      onClick={async () => {
                        const guardadoOk = await persistirRecepcionActual();
                        if (!guardadoOk) return;
                        const ok = await descargarRecepcionExcel();
                        if (!ok) return;
                        setModoCorreccionRecepcionado(false);
                        toast.success(
                          "Correccion de recepcion guardada y descarga actualizada."
                        );
                      }}
                    >
                      Guardar Correccion
                    </Button>
                  )}
                  <Button
                    type="button"
                    className="disabled:cursor-not-allowed"
                    disabled={
                      guardando != null ||
                      loading ||
                      !pedidoHistoriaId ||
                      bloquearNavegacionModalPorEdicionCantidad
                    }
                    onClick={async () => {
                      await descargarRecepcionExcel();
                    }}
                  >
                    Descargar Recepcion
                  </Button>
                </>
              )}
            </>
          }
        >
        <div className="flex min-h-0 flex-1 flex-col gap-0">
          <section
            aria-labelledby="pedido-historia-resumen-title"
            className="shrink-0"
            inert={bloquearNavegacionModalPorEdicionCantidad ? true : undefined}
          >
            <h2 id="pedido-historia-resumen-title" className="sr-only">
              Resumen del pedido
            </h2>
            <div
              className={cn(
                MODAL_RESUMEN_PANEL_CLASS,
                "pt-0 pb-1.5"
              )}
            >
              <div className={cn(GRID_CAPAS_SUP_PEDIDO_HISTORIA, "w-full items-center")}>
                <div
                  className={cn(
                    "flex min-h-0 min-w-0 flex-col justify-center gap-0.5 py-0 text-center text-left"
                  )}
                >
                  <p className="text-sm font-semibold leading-snug text-foreground">
                    {detalle ? detalle.proveedorNombre : "—"}
                  </p>
                  <p className="text-xs leading-snug text-muted-foreground">
                    <span className="tabular-nums">
                      {detalle ? detalle.sucursalNombre : "—"}
                      {" - "}
                      {generadoAtStr || "—"}
                    </span>
                  </p>
                </div>
                <label
                  className={cn(
                    "flex min-h-0 min-w-0 w-full flex-col justify-center gap-0.5 py-0 text-left",
                    locked || loading ? "cursor-default" : "cursor-pointer"
                  )}
                >
                  <ModalMicroLabel>FECHA FACTURA</ModalMicroLabel>
                  <Input
                    ref={fechaInputRef}
                    type="date"
                    value={fechaRecepcion}
                    onChange={(e) => setFechaRecepcion(e.target.value)}
                    disabled={locked || loading}
                    aria-label="FECHA FACTURA"
                    className={cn(
                      "h-9 w-full min-w-0 tabular-nums text-left",
                      inputBorderClassName,
                      locked || loading ? "cursor-not-allowed" : "cursor-pointer"
                    )}
                  />
                </label>
              </div>
            </div>
          </section>

          <div className="grid min-h-0 w-full flex-1 grid-cols-1 grid-rows-[auto_minmax(0,1fr)] gap-x-3 gap-y-0 overflow-hidden">
            <section
              aria-labelledby="pedido-historia-agregar-recepcion-titulo"
              className={cn(
                MODAL_SECTION_CARD_CLASS,
                "flex shrink-0 flex-col gap-0 pt-0 pb-1.5 pt-0 pb-2",
                !tablaYAltaHabilitados &&
                  !locked &&
                  "pointer-events-none cursor-not-allowed opacity-50"
              )}
              inert={
                (!tablaYAltaHabilitados && !locked) ||
                bloquearNavegacionModalPorEdicionCantidad
                  ? true
                  : undefined
              }
            >
              <span
                id="pedido-historia-agregar-recepcion-titulo"
                className="sr-only"
              >
                AGREGAR PRODUCTO A LA RECEPCIÓN
              </span>
              <div className="flex w-full min-w-0 flex-col gap-3 pt-1 pb-0 flex-row items-center justify-between gap-x-10">
                <div className="flex min-w-0 w-full max-w-full items-center gap-2 w-auto max-w-[36rem]">
                  <div className="min-w-0 flex-1">
                    <FiltroBusquedaInput
                      id="pedido-historia-agregar-producto-filtro"
                      placeholder="BUSCAR POR DESCRIPCIÓN..."
                      value={busquedaAgregarProducto}
                      onChange={setBusquedaAgregarProducto}
                      isDebouncing={false}
                      inputRef={busquedaAgregarRef}
                      className="h-10 min-h-10"
                    />
                  </div>
                </div>
                <Button
                  type="button"
                  variant="default"
                  onClick={() => setAgregarProductosOpen(true)}
                  disabled={locked || loading || !fechaFacturaOk || guardando != null}
                  className={cn(
                    "h-10 min-h-10 w-full min-w-0 shrink-0 cursor-pointer justify-center gap-2 rounded-md px-3 py-1 text-sm font-normal text-primary-foreground [&_svg]:text-primary-foreground",
                    "w-auto shrink-0",
                    "disabled:cursor-not-allowed"
                  )}
                >
                  <Plus className="h-4 w-4" />
                  Agregar Producto
                </Button>
              </div>
            </section>

            <section
              aria-label="Ítems del pedido"
              className="flex min-h-0 flex-1 flex-col gap-2 overflow-hidden"
            >
              <div
                className={cn(
                  MODAL_SECTION_CARD_CLASS,
                  "flex min-h-0 flex-1 flex-col overflow-hidden"
                )}
              >
                <div
                  className="contenedor-tabla-gestion no-scroll-x flex min-h-0 flex-1 flex-col overflow-hidden"
                  style={{ height: "auto" }}
                >
                  <div className="relative min-h-0 min-w-0 flex-1 overflow-x-hidden overflow-y-auto no-scrollbar">
                    <div
                      className={cn(
                        !tablaYAltaHabilitados &&
                          !locked &&
                          "pointer-events-none cursor-not-allowed opacity-50"
                      )}
                    >
                    <Table variant="compact" className="tabla-recepcion-pedido" scrollX={false}>
                <TableHeader inert={editingItemId ? true : undefined}>
                  <TableRow>
                    <TableHead className="w-[5%] text-center">
                      <span className="sr-only">LISTA DE VERIFICACIÓN</span>
                      <Check
                        className="mx-auto my-0 block h-4 w-4 shrink-0 leading-none text-primary-foreground"
                        aria-hidden
                      />
                    </TableHead>
                    <TableHead className="w-[50%]">DESCRIPCIÓN</TableHead>
                    <TableHead className="w-[10%]">CANT. PED.</TableHead>
                    <TableHead className="w-[20%]">CANT. REC.</TableHead>
                    <TableHead className="w-[15%] tabla-bloque-secundario-head-divider">
                      ACCIONES
                    </TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {loading ? (
                    <EmptyTableRow colSpan={5} message="CARGANDO…" />
                  ) : errorMsg ? (
                    <EmptyTableRow colSpan={5} message={errorMsg} />
                  ) : itemsFiltrados.length === 0 ? (
                    <EmptyTableRow
                      colSpan={5}
                      message={
                        busquedaAgregarProducto.trim()
                          ? "SIN ÍTEMS PARA LA DESCRIPCIÓN BUSCADA."
                          : "SIN ÍTEMS."
                      }
                    />
                  ) : (
                    itemsFiltrados.map((item) => {
                      const isEditing = editingItemId === item.id;
                      const cantRecNum = item.cantRecibida ?? 0;
                      const cantRecibidaVisible =
                        item.cantRecibida != null ? String(item.cantRecibida) : "";
                      // Si por cualquier motivo el backend registra `cantPedida` en 0 pero el usuario
                      // ya cargó `cantRecibida` al agregar el producto, mostramos `cantRecibida` para
                      // que ambas columnas queden consistentes.
                      const cantPedidaVisible =
                        item.cantPedida > 0
                          ? item.cantPedida.toLocaleString("es-AR")
                          : cantRecNum > 0
                            ? cantRecNum.toLocaleString("es-AR")
                            : "";

                      const checkListConfirmed = checkListConfirmedByItem[item.id] === true;
                      /** En **PENDIENTE**, la columna solo muestra valor tras confirmar checklist (OK / cesto / check edición). */
                      const cantRecibidaCeldaLectura =
                        estado === "PENDIENTE" && !checkListConfirmed
                          ? ""
                          : cantRecibidaVisible;

                      return (
                        <TableRow
                          key={item.id}
                          inert={
                            editingItemId != null && !isEditing ? true : undefined
                          }
                          className={cn(
                            "transition-colors duration-100",
                            checkListConfirmed
                              ? "recepcion-fila-verificada cursor-not-allowed"
                              : "recepcion-fila-pendiente"
                          )}
                        >
                          <TableCell
                            className={cn("celda-datos w-[5%] text-center align-middle")}
                          >
                            {checkListConfirmed ? (
                              <span
                                className="mx-auto flex h-7 w-7 items-center justify-center rounded-full bg-primary/20"
                                aria-label="Ítem verificado"
                              >
                                <Check className="h-3.5 w-3.5 shrink-0 text-primary" aria-hidden />
                              </span>
                            ) : locked ? (
                              <span className="text-muted-foreground">—</span>
                            ) : (
                              <span
                                aria-label="Lista de verificación"
                                title="Verificá con OK, Editar o Cesto en la columna ACCIONES."
                                className="inline-block h-7 w-full"
                              />
                            )}
                          </TableCell>
                          <TableCell
                            className={cn(
                              "celda-datos min-w-0 truncate w-[50%]",
                              checkListConfirmed && "font-medium text-foreground"
                            )}
                            title={
                              item.codTienda
                                ? `${item.codTienda} — ${item.descripcionTienda}`
                                : item.descripcionTienda
                            }
                          >
                            {item.descripcionTienda}
                          </TableCell>
                          <TableCell
                            className={cn(
                              "celda-datos tabular-nums w-[10%]",
                              checkListConfirmed && "text-foreground"
                            )}
                          >
                            {cantPedidaVisible}
                          </TableCell>
                          <TableCell
                            className={cn(
                              "celda-datos tabular-nums w-[20%]",
                              checkListConfirmed && !isEditing && "text-foreground"
                            )}
                          >
                            {locked ? (
                              cantRecibidaVisible
                            ) : isEditing ? (
                              <div className="flex w-full items-center justify-center gap-1">
                                <Button
                                  type="button"
                                  variant="outline"
                                  size="icon-xs"
                                  onMouseDown={(e) => e.preventDefault()}
                                  onClick={() => ajustarEditingValue(-1)}
                                  disabled={locked || busy || !fechaFacturaOk}
                                  className={TABLE_ROW_ICON_BUTTON_CLASS}
                                  aria-label="Disminuir"
                                  title="Disminuir"
                                >
                                  <span className="text-sm leading-none">-</span>
                                </Button>
                                <Input
                                  ref={cantRecEditingInputRef}
                                  type="number"
                                  min={0}
                                  step={1}
                                  inputMode="numeric"
                                  value={editingValue}
                                  onChange={(e) => setEditingValue(e.target.value.replace(/\D/g, "").slice(0, 6))}
                                  data-edit-input={item.id}
                                  onBlur={() => {
                                    if (
                                      editingValue.trim() === "" &&
                                      item.cantRecibida == null
                                    ) {
                                      setEditingItemId(null);
                                      setEditingValue("");
                                      return;
                                    }
                                    const v = parseIntSafe(editingValue);
                                    if (
                                      item.cantRecibida != null &&
                                      v === item.cantRecibida
                                    ) {
                                      setEditingItemId(null);
                                      setEditingValue("");
                                      return;
                                    }
                                    toast.info(
                                      "Confirmá la cantidad con el ícono de verificación."
                                    );
                                    queueMicrotask(() => {
                                      cantRecEditingInputRef.current?.focus();
                                    });
                                  }}
                                  onKeyDown={(e) => {
                                    if (e.key === "Enter") (e.target as HTMLInputElement).blur();
                                  }}
                                  disabled={locked || busy || !fechaFacturaOk}
                                  className={cn(
                                    "h-8 w-[3.5rem] min-w-[3.5rem] text-center",
                                    inputBorderClassName
                                  )}
                                />
                                <Button
                                  type="button"
                                  variant="outline"
                                  size="icon-xs"
                                  onMouseDown={(e) => e.preventDefault()}
                                  onClick={() => ajustarEditingValue(1)}
                                  disabled={locked || busy || !fechaFacturaOk}
                                  className={TABLE_ROW_ICON_BUTTON_CLASS}
                                  aria-label="Aumentar"
                                  title="Aumentar"
                                >
                                  <span className="text-sm leading-none">+</span>
                                </Button>
                                <Button
                                  type="button"
                                  variant="default"
                                  size="icon-xs"
                                  onMouseDown={(e) => e.preventDefault()}
                                  onClick={onClickConfirmarEdicion(item)}
                                  disabled={locked || busy || !fechaFacturaOk}
                                  className={cn(
                                    TABLE_ROW_ICON_BUTTON_CLASS,
                                    "text-primary-foreground [&_svg]:text-primary-foreground"
                                  )}
                                  aria-label="Confirmar Edición"
                                  title="Confirmar Edición"
                                >
                                  <Check className={TABLE_ROW_ACTION_ICON_CLASS} />
                                </Button>
                              </div>
                            ) : (
                              cantRecibidaCeldaLectura
                            )}
                          </TableCell>
                          <TableCell className="celda-datos w-[15%] tabla-bloque-secundario-cell-divider">
                            <div
                              className={cn(
                                "flex items-center justify-center gap-1",
                                checkListConfirmed && "cursor-auto"
                              )}
                            >
                              <Button
                                type="button"
                                variant="outline"
                                size="icon-xs"
                                onClick={onClickOk(item)}
                                disabled={
                                  locked || busy || checkListConfirmed || !fechaFacturaOk
                                }
                                className={TABLE_ROW_ICON_BUTTON_CLASS}
                                aria-label="OK"
                                title="OK"
                                data-ok-button={item.id}
                              >
                                <Check className={TABLE_ROW_ACTION_ICON_CLASS} />
                              </Button>
                              <Button
                                type="button"
                                variant="outline"
                                size="icon-xs"
                                onClick={onClickEditar(item)}
                                disabled={locked || busy || !fechaFacturaOk}
                                className={TABLE_ROW_ICON_BUTTON_CLASS}
                                aria-label="Editar"
                                title="Editar"
                              >
                                <Pencil className={TABLE_ROW_ACTION_ICON_CLASS} />
                              </Button>
                              <Button
                                type="button"
                                variant="outline"
                                size="icon-xs"
                                onClick={onClickCesto(item)}
                                disabled={locked || busy || !fechaFacturaOk}
                                className={cn(
                                  TABLE_ROW_ICON_BUTTON_CLASS,
                                  TABLE_ROW_ICON_BUTTON_DESTRUCTIVE_HOVER_CLASS
                                )}
                                aria-label="Cesto De Basura"
                                title="Cesto De Basura"
                              >
                                <Trash2 className={TABLE_ROW_ACTION_ICON_CLASS} />
                              </Button>
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
                  <section
                    aria-label="Totales del pedido"
                    className={cn(
                      GRID_PEDIDO_HISTORIA_TABLA_COLS,
                      "min-w-0 shrink-0 border-t border-border bg-background py-2 items-center",
                      !totalPedidoInputHabilitado &&
                        !locked &&
                        "pointer-events-none cursor-not-allowed opacity-50"
                    )}
                    inert={
                      (!totalPedidoInputHabilitado && !locked) ||
                      bloquearNavegacionModalPorEdicionCantidad
                        ? true
                        : undefined
                    }
                  >
                    <div className="celda-datos col-start-4 flex items-center justify-end border-b-0 text-right">
                      <span className="text-sm font-semibold tabular-nums text-foreground whitespace-nowrap">
                        TOTAL PEDIDO
                      </span>
                    </div>
                    <div className="celda-datos celda-datos--flush-left celda-datos--flush-right col-start-5 flex min-w-0 items-center justify-start gap-0 border-b-0">
                      <MontoArInput
                        variant="totalPedido"
                        disabled={locked || loading || !totalPedidoInputHabilitado}
                        valueNormalized={totalPedido}
                        onValueNormalizedChange={setTotalPedido}
                        className={cn(
                          "w-full",
                          inputBorderClassName
                        )}
                        aria-label="Total Pedido"
                      />
                    </div>
                  </section>
              </div>
              </div>
            </section>
          </div>
        </div>
        </AppModal>
      </Dialog>

      <AgregarProductosModal
        open={agregarProductosOpen}
        onOpenChange={setAgregarProductosOpen}
        initialBusqueda={busquedaAgregarProducto}
        onAgregar={async (row, cantRecibida) => {
          await agregarNuevaFila(row, cantRecibida);
        }}
      />
      <ExportarRecepcionInstructorModal
        open={showExportInstructor}
        onOpenChange={setShowExportInstructor}
      />
    </>
  );
}

