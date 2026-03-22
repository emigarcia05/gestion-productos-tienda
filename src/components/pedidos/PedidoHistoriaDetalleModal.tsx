"use client";

import { useEffect, useMemo, useState } from "react";
import { Dialog } from "@/components/ui/dialog";
import AppModal from "@/components/shared/AppModal";
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
import { Check, Pencil, Trash2 } from "lucide-react";
import { toast } from "sonner";
import type { PedidoHistoriaEstado } from "@/services/pedidosHistoria.service";
import type { PedidoHistoriaDetalle } from "@/services/pedidosHistoria.service";
import type { ProductoTiendaRowBusqueda } from "@/services/productosTienda.service";
import {
  actualizarPedidoHistoriaItemCantRecibidaAction,
  agregarPedidoHistoriaItemAction,
  getPedidoHistoriaDetalleAction,
  marcarPedidoHistoriaRegistradoAction,
} from "@/actions/pedidosHistoria";
import AgregarProductosModal from "@/components/pedidos/AgregarProductosModal";
import { cn } from "@/lib/utils";

function parseIntSafe(value: string): number {
  const n = Math.max(0, Math.floor(Number(value) || 0));
  return Number.isFinite(n) ? n : 0;
}

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

const inputBorderClassName = "border-[#0072bb] focus-visible:ring-[#0072bb]";

/**
 * Cabecera resumen: proveedor + metadatos | fecha factura (`sm`: dos columnas ~85% / ~15%).
 */
const GRID_CAPAS_SUP_PEDIDO_HISTORIA =
  "grid min-w-0 w-full grid-cols-1 gap-2 sm:grid-cols-[85fr_15fr] sm:gap-0";

/** Columna proveedor (resumen modal): padding derecho al token de tabla; sin padding izquierdo. */
const CELDA_RESUMEN_PROVEEDOR_PADDING_X =
  "pr-[var(--tabla-body-cell-padding-x)] pl-0";

/** Fila “Agregar producto”: tres columnas independientes de la tabla (70% | 15% | 15%). */
const GRID_FILA_AGREGAR_PEDIDO_HISTORIA =
  "grid min-w-0 w-full grid-cols-1 gap-x-0 gap-y-3 sm:grid-cols-[70fr_15fr_15fr] sm:gap-x-2 sm:gap-y-0 sm:items-center";

/** Misma proporción que columnas de la tabla de ítems (check | desc | cant.p. | cant.r. | acciones). */
const GRID_PEDIDO_HISTORIA_TABLA_COLS =
  "grid w-full grid-cols-[5fr_55fr_10fr_15fr_15fr]";

/** Etiquetas de campo / sección: compactas, mayúsculas, alineadas a la guía de filtros/tablas. */
const MODAL_MICRO_LABEL_CLASS =
  "text-[0.65rem] font-semibold uppercase tracking-[0.06em] text-muted-foreground";

/** Contenedor de grilla: sin borde ni fondo (transparente). */
const MODAL_SECTION_CARD_CLASS = "min-w-0 bg-transparent";

const MODAL_RESUMEN_PANEL_CLASS = "min-w-0 bg-transparent";

/** Monto en AR: miles con punto, decimales con coma (ej. $1.234,56). Vacío → sin texto. */
function normalizedMontoToDisplayAr(norm: string): string {
  if (norm === "") return "";
  const n = Number(norm);
  if (!Number.isFinite(n) || n < 0) return "";
  const [ent, frac] = n.toFixed(2).split(".");
  const entFmt = Number(ent).toLocaleString("es-AR", {
    useGrouping: true,
    maximumFractionDigits: 0,
  });
  return `$${entFmt},${frac}`;
}

/** Parsea texto con $, miles (.), decimales (,) a string normalizado "" | "123" | "123.45". */
function parseMontoArInputToNormalized(display: string): string {
  const s = display.replace(/\$/g, "").replace(/\s/g, "").trim();
  if (s === "" || s === "$") return "";
  const lastComma = s.lastIndexOf(",");
  let integerRaw: string;
  let fracRaw: string;
  if (lastComma !== -1) {
    integerRaw = s.slice(0, lastComma).replace(/\./g, "").replace(/\D/g, "");
    fracRaw = s.slice(lastComma + 1).replace(/\D/g, "").slice(0, 2);
  } else {
    integerRaw = s.replace(/\./g, "").replace(/\D/g, "");
    fracRaw = "";
  }
  if (integerRaw === "" && fracRaw === "") return "";
  if (fracRaw === "") return integerRaw;
  return `${integerRaw === "" ? "0" : integerRaw}.${fracRaw}`;
}

/**
 * Con foco: siempre incluye $; miles con "." en vivo; decimales tras una coma (máx. 2).
 */
function formatLiveTotalPedidoInput(raw: string): string {
  const s = raw.replace(/\$/g, "").replace(/\s/g, "");
  if (s === "") return "$";

  const lastComma = s.lastIndexOf(",");
  const hasComma = lastComma !== -1;
  const trailingComma = hasComma && lastComma === s.length - 1;

  let intDigits: string;
  let fracDigits: string;
  if (hasComma) {
    intDigits = s.slice(0, lastComma).replace(/\D/g, "");
    fracDigits = s.slice(lastComma + 1).replace(/\D/g, "").slice(0, 2);
  } else {
    intDigits = s.replace(/\D/g, "");
    fracDigits = "";
  }

  if (intDigits === "" && fracDigits === "") {
    if (trailingComma) return "$0,";
    return "$";
  }

  let intForFormat = intDigits;
  if (intForFormat === "") {
    intForFormat = "0";
  } else if (intForFormat.length > 1) {
    intForFormat = intForFormat.replace(/^0+/, "") || "0";
  }

  const intShown = intForFormat.replace(/\B(?=(\d{3})+(?!\d))/g, ".");

  if (!hasComma) {
    return `$${intShown}`;
  }
  if (trailingComma) {
    return `$${intShown},`;
  }
  return `$${intShown},${fracDigits}`;
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

  const [productoSeleccionado, setProductoSeleccionado] = useState<ProductoTiendaRowBusqueda | null>(null);
  const [cantRecibidaNueva, setCantRecibidaNueva] = useState<string>("");
  /** Valor normalizado para lógica futura: "" | "123" | "123.45" (punto decimal). */
  const [totalPedido, setTotalPedido] = useState<string>("");
  const [totalPedidoDraft, setTotalPedidoDraft] = useState<string>("");
  const [totalPedidoFocused, setTotalPedidoFocused] = useState(false);
  const [agregarProductosOpen, setAgregarProductosOpen] = useState(false);
  /** Valor ISO `YYYY-MM-DD` — UI: campo FECHA FACTURA; persistencia backend pendiente. */
  const [fechaRecepcion, setFechaRecepcion] = useState<string>("");
  /** Check list por ítem: borrador y confirmación (solo UI; persistencia / reglas pendientes). */
  const [checkListDraftByItem, setCheckListDraftByItem] = useState<Record<string, string>>({});
  const [checkListConfirmedByItem, setCheckListConfirmedByItem] = useState<Record<string, boolean>>(
    {}
  );

  const estado: PedidoHistoriaEstado | null = detalle ? detalle.estado : null;
  const locked = estado === "RECIBIDO";
  const busy = guardando != null || loading;

  const generadoAtStr = useMemo(() => {
    const d = toDate(detalle?.generadoAt ?? null);
    return d ? formatDdMmHHmm(d) : "";
  }, [detalle?.generadoAt]);

  async function cargarDetalle(id: string): Promise<PedidoHistoriaDetalle | null> {
    const res = await getPedidoHistoriaDetalleAction({ pedidoHistoriaId: id });
    if (!res.ok) {
      setDetalle(null);
      setErrorMsg(res.error ?? "Error al cargar detalle.");
      return null;
    }
    setDetalle(res.data);
    setErrorMsg(null);
    return res.data;
  }

  useEffect(() => {
    if (!open || !pedidoHistoriaId) return;

    queueMicrotask(() => {
      setDetalle(null);
      setErrorMsg(null);
      setLoading(true);
      setEditingItemId(null);
      setEditingValue("");
      setProductoSeleccionado(null);
      setCantRecibidaNueva("");
      setTotalPedido("");
      setTotalPedidoDraft("");
      setTotalPedidoFocused(false);
      setAgregarProductosOpen(false);
      setFechaRecepcion("");
      setCheckListDraftByItem({});
      setCheckListConfirmedByItem({});
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
    if (!editingItemId) return;
    queueMicrotask(() => {
      const el = document.querySelector<HTMLInputElement>(
        `input[data-edit-input="${editingItemId}"]`
      );
      el?.focus();
    });
  }, [editingItemId]);

  async function actualizarItemCantRecibida(pedidoHistoriaItemId: string, cantRecibida: number) {
    if (locked) return;
    if (guardando) return;

    setGuardando(pedidoHistoriaItemId);
    try {
      const res = await actualizarPedidoHistoriaItemCantRecibidaAction({
        pedidoHistoriaItemId,
        cantRecibida,
      });
      if (!res.ok) {
        toast.error(res.error ?? "Error al guardar.");
        return;
      }
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
    } finally {
      setGuardando(null);
    }
  }

  function onClickOk(item: PedidoHistoriaDetalle["items"][number]) {
    return async () => {
      await actualizarItemCantRecibida(item.id, item.cantPedida);
    };
  }

  function onClickCesto(item: PedidoHistoriaDetalle["items"][number]) {
    return async () => {
      await actualizarItemCantRecibida(item.id, 0);
    };
  }

  function onClickEditar(item: PedidoHistoriaDetalle["items"][number]) {
    return () => {
      if (locked) return;
      setEditingItemId(item.id);
      setEditingValue(String(item.cantRecibida));
    };
  }

  async function agregarNuevaFila() {
    if (locked) return;
    if (!pedidoHistoriaId) return;

    if (!productoSeleccionado) {
      toast.error("Seleccioná un producto y agregá una Cant. Recibida mayor a 0.");
      return;
    }

    const codTiendaAdded = productoSeleccionado.codTienda;
    let nextOkItemId: string | null = null;
    const cant = parseIntSafe(cantRecibidaNueva);
    if (cant <= 0) {
      toast.error("Ingresá una Cant. Recibida mayor a 0.");
      return;
    }

    setGuardando("new");
    try {
      const res = await agregarPedidoHistoriaItemAction({
        pedidoHistoriaId,
        codTienda: productoSeleccionado.codTienda,
        cantRecibida: cant,
      });
      if (!res.ok) {
        toast.error(res.error ?? "Error al agregar fila.");
        return;
      }

      // Recargar detalle para reflejar el consolidado por cod_tienda.
      setLoading(true);
      const detalleNuevo = await cargarDetalle(pedidoHistoriaId);
      toast.success("Ítem agregado.");
      // Limpieza UX: volver a estado "Seleccionar Producto".
      setProductoSeleccionado(null);
      setCantRecibidaNueva("");
      setAgregarProductosOpen(false);

      // Enfocar la fila recién agregada en la columna editable "CANT. RECIBIDA".
      const itemNuevo = detalleNuevo?.items.find((it) => it.codTienda === codTiendaAdded);
      if (itemNuevo) {
        nextOkItemId = itemNuevo.id;
      }
    } finally {
      setLoading(false);
      setGuardando(null);
      queueMicrotask(() => {
        // UX: luego de agregar el producto, enfocar el botón OK (check) de la fila.
        if (nextOkItemId) {
          const okBtn = document.querySelector<HTMLButtonElement>(
            `button[data-ok-button="${nextOkItemId}"]`
          );
          okBtn?.focus();
        }
        setEditingItemId(null);
        setEditingValue("");
      });
    }
  }

  function onSeleccionarProducto(row: ProductoTiendaRowBusqueda) {
    setProductoSeleccionado(row);
    setCantRecibidaNueva("");
    setAgregarProductosOpen(false);
    queueMicrotask(() => {
      const el = document.querySelector<HTMLInputElement>('input[data-cant-input="detalle"]');
      el?.focus();
      el?.select?.();
    });
  }

  function ajustarEditingValue(delta: number) {
    if (locked || busy) return;
    const current = parseIntSafe(editingValue);
    const next = Math.max(0, current + delta);
    setEditingValue(next === 0 ? "" : String(next));
  }

  const items = detalle?.items ?? [];
  const itemsControlled =
    items.length > 0 &&
    items.every((it) => it.cantPedida > 0 && it.cantRecibida === it.cantPedida);

  return (
    <>
      <Dialog open={open} onOpenChange={onOpenChange}>
        <AppModal
          title="Recepcion Del Pedido"
          scrollBody={false}
          size="xl"
          className="sm:max-w-[62.4rem] max-h-[95vh]"
          bodyShellClassName="p-0"
          padding="sm"
          headerClassName="pt-3 pb-3"
          footerClassName="py-3"
          bodyClassName="px-3 py-2 sm:px-4 sm:py-2.5"
          actions={
            <>
              <Button
                type="button"
                variant="outline"
                onClick={() => onOpenChange(false)}
              >
                Cerrar
              </Button>
              <Button
                type="button"
                onClick={async () => {
                  if (!pedidoHistoriaId) return;
                  if (!itemsControlled) return;
                  if (locked) return;
                  if (guardando) return;

                  setGuardando("sync");
                  try {
                    const res = await marcarPedidoHistoriaRegistradoAction({
                      pedidoHistoriaId,
                    });
                    if (!res.ok) {
                      toast.error(res.error ?? "Error al sincronizar con DUX.");
                      return;
                    }

                    setLoading(true);
                    await cargarDetalle(pedidoHistoriaId);
                    toast.success("Pedido sincronizado con DUX.");
                  } finally {
                    setLoading(false);
                    setGuardando(null);
                  }
                }}
                disabled={!itemsControlled || locked || busy || !pedidoHistoriaId}
              >
                Sincronizar Con DUX
              </Button>
            </>
          }
        >
        <div className="flex min-h-0 flex-1 flex-col gap-0">
          <section aria-labelledby="pedido-historia-resumen-title" className="shrink-0">
            <h2 id="pedido-historia-resumen-title" className="sr-only">
              Resumen del pedido
            </h2>
            <div
              className={cn(
                MODAL_RESUMEN_PANEL_CLASS,
                "pr-3 pl-0 pt-0 pb-0 sm:pr-4 sm:pl-0 sm:pt-0 sm:pb-0"
              )}
            >
              <div className={cn(GRID_CAPAS_SUP_PEDIDO_HISTORIA, "items-center")}>
                <div
                  className={cn(
                    "flex min-h-0 min-w-0 flex-col justify-center gap-0.5 py-0 text-center sm:text-left",
                    CELDA_RESUMEN_PROVEEDOR_PADDING_X
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
                    "flex min-h-0 min-w-0 w-full flex-col justify-center gap-0.5 py-0 px-0 text-left",
                    locked || loading ? "cursor-default" : "cursor-pointer"
                  )}
                >
                  <span
                    className={cn(
                      MODAL_MICRO_LABEL_CLASS,
                      "w-full text-left leading-tight"
                    )}
                  >
                    FECHA FACTURA
                  </span>
                  <Input
                    type="date"
                    value={fechaRecepcion}
                    onChange={(e) => setFechaRecepcion(e.target.value)}
                    disabled={locked || loading}
                    aria-label="FECHA FACTURA"
                    className={cn(
                      "h-9 w-full min-w-0 tabular-nums sm:text-left",
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
                "flex shrink-0 flex-col gap-0 pt-0 pb-1.5 pr-3 pl-0 sm:pt-0 sm:pb-2 sm:pr-4 sm:pl-0"
              )}
            >
              <span
                id="pedido-historia-agregar-recepcion-titulo"
                className={cn(
                  MODAL_MICRO_LABEL_CLASS,
                  "m-0 mb-1 block w-full box-border p-0 text-center font-bold text-foreground"
                )}
              >
                AGREGAR PRODUCTO A LA RECEPCIÓN
              </span>
              <div className={GRID_FILA_AGREGAR_PEDIDO_HISTORIA}>
                <div className="flex min-w-0 w-full flex-col items-center justify-center gap-1.5 py-0">
                  {productoSeleccionado ? (
                    <Input
                      value={productoSeleccionado.descripcionTienda}
                      readOnly
                      disabled={locked || loading}
                      data-desc-input="detalle"
                      aria-label="Descripción del producto"
                      role="button"
                      tabIndex={0}
                      onClick={() => {
                        if (locked || loading) return;
                        setAgregarProductosOpen(true);
                      }}
                      onKeyDown={(e) => {
                        if (locked || loading) return;
                        if (e.key === "Enter" || e.key === " ") {
                          e.preventDefault();
                          setAgregarProductosOpen(true);
                        }
                      }}
                      className={cn(
                        "h-9 min-w-0 w-full cursor-pointer text-left",
                        inputBorderClassName,
                        locked || loading ? "cursor-not-allowed" : ""
                      )}
                    />
                  ) : (
                    <Input
                      readOnly
                      disabled={locked || loading}
                      placeholder="BUSCAR POR DESCRIPCIÓN O CÓDIGO..."
                      data-desc-input="detalle"
                      aria-label="Buscar por descripción o código"
                      role="button"
                      tabIndex={0}
                      onClick={() => {
                        if (locked || loading) return;
                        setAgregarProductosOpen(true);
                      }}
                      onKeyDown={(e) => {
                        if (locked || loading) return;
                        if (e.key === "Enter" || e.key === " ") {
                          e.preventDefault();
                          setAgregarProductosOpen(true);
                        }
                      }}
                      className={cn(
                        "h-9 min-w-0 w-full cursor-pointer text-left placeholder:text-muted-foreground",
                        inputBorderClassName,
                        locked || loading ? "cursor-not-allowed" : ""
                      )}
                    />
                  )}
                </div>
                <div className="flex min-w-0 w-full flex-col items-center justify-center gap-1.5 py-0">
                  <Input
                    type="number"
                    min={0}
                    step={1}
                    inputMode="numeric"
                    placeholder="CANT."
                    aria-label="Cant. recibida (nuevo ítem)"
                    value={cantRecibidaNueva}
                    onChange={(e) =>
                      setCantRecibidaNueva(e.target.value.replace(/\D/g, "").slice(0, 6))
                    }
                    data-cant-input="detalle"
                    disabled={locked || loading}
                    className={cn(
                      "h-9 w-full min-w-0 tabular-nums text-center placeholder:text-muted-foreground",
                      inputBorderClassName
                    )}
                  />
                </div>
                <div className="flex min-w-0 w-full flex-col items-center justify-center gap-1.5 py-0">
                  <Button
                    type="button"
                    variant="default"
                    onClick={agregarNuevaFila}
                    disabled={
                      locked ||
                      loading ||
                      guardando != null ||
                      !productoSeleccionado ||
                      parseIntSafe(cantRecibidaNueva) <= 0
                    }
                    className="h-9 w-full min-w-0 shrink-0 px-3"
                  >
                    Agregar
                  </Button>
                </div>
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
                  className="contenedor-tabla-gestion no-scroll-x flex-1 min-h-0 overflow-y-hidden"
                  style={{ height: "auto" }}
                >
                  <div className="relative min-h-0 min-w-0 flex-1 overflow-x-hidden overflow-y-auto">
                    <Table variant="compact" scrollX={false}>
                <TableHeader>
                  <TableRow>
                    <TableHead className="w-[5%] text-center">
                      <span className="sr-only">LISTA DE VERIFICACIÓN</span>
                      <Check
                        className="mx-auto my-0 block h-4 w-4 shrink-0 leading-none text-primary-foreground"
                        aria-hidden
                      />
                    </TableHead>
                    <TableHead className="w-[55%]">DESCRIPCIÓN</TableHead>
                    <TableHead className="w-[10%]">CANT. PEDIDA</TableHead>
                    <TableHead className="w-[15%]">CANT. RECIBIDA</TableHead>
                    <TableHead className="w-[15%] tabla-bloque-secundario-head-divider">
                      ACCIONES
                    </TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {loading ? (
                    <EmptyTableRow colSpan={5} message="Cargando…" />
                  ) : errorMsg ? (
                    <EmptyTableRow colSpan={5} message={errorMsg} />
                  ) : items.length === 0 ? (
                    <EmptyTableRow colSpan={5} message="Sin ítems." />
                  ) : (
                    items.map((item) => {
                      const isEditing = editingItemId === item.id;
                      const cantRecibidaVisible = item.cantRecibida > 0 ? String(item.cantRecibida) : "";
                      const isControlado =
                        item.cantPedida > 0 && item.cantRecibida === item.cantPedida;
                      // Si por cualquier motivo el backend registra `cantPedida` en 0 pero el usuario
                      // ya cargó `cantRecibida` al agregar el producto, mostramos `cantRecibida` para
                      // que ambas columnas queden consistentes.
                      const cantPedidaVisible =
                        item.cantPedida > 0
                          ? item.cantPedida.toLocaleString("es-AR")
                          : item.cantRecibida > 0
                            ? item.cantRecibida.toLocaleString("es-AR")
                            : "";

                      const checkListConfirmed = checkListConfirmedByItem[item.id] === true;
                      const checkListDraft = checkListDraftByItem[item.id] ?? "";

                      return (
                        <TableRow
                          key={item.id}
                          className={cn(
                            "hover:bg-transparent",
                            isControlado && "bg-primary/10 hover:bg-primary/10"
                          )}
                        >
                          <TableCell className="celda-datos w-[5%] text-center align-middle">
                            {checkListConfirmed ? (
                              <Check
                                className="mx-auto h-4 w-4 shrink-0 text-primary"
                                aria-label="Ítem verificado"
                              />
                            ) : locked ? (
                              <span className="text-muted-foreground">—</span>
                            ) : (
                              <div className="flex min-w-0 w-full flex-col items-center justify-center py-0.5">
                                <Input
                                  value={checkListDraft}
                                  onChange={(e) =>
                                    setCheckListDraftByItem((prev) => ({
                                      ...prev,
                                      [item.id]: e.target.value.slice(0, 32),
                                    }))
                                  }
                                  onKeyDown={(e) => {
                                    if (e.key === "Enter") {
                                      e.preventDefault();
                                      if (!busy) {
                                        setCheckListConfirmedByItem((prev) => ({
                                          ...prev,
                                          [item.id]: true,
                                        }));
                                      }
                                    }
                                  }}
                                  disabled={busy}
                                  aria-label="Lista de verificación"
                                  className={cn(
                                    "h-7 min-h-7 w-full min-w-0 px-1 text-center text-xs tabular-nums",
                                    inputBorderClassName
                                  )}
                                />
                              </div>
                            )}
                          </TableCell>
                          <TableCell
                            className="celda-datos min-w-0 truncate w-[55%]"
                            title={
                              item.codTienda
                                ? `${item.codTienda} — ${item.descripcionTienda}`
                                : item.descripcionTienda
                            }
                          >
                            {item.descripcionTienda}
                          </TableCell>
                          <TableCell className="celda-datos tabular-nums w-[10%]">
                            {cantPedidaVisible}
                          </TableCell>
                          <TableCell className="celda-datos tabular-nums w-[15%]">
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
                                  disabled={locked || busy}
                                  aria-label="Disminuir"
                                  title="Disminuir"
                                >
                                  <span className="text-sm leading-none">-</span>
                                </Button>
                                <Input
                                  type="number"
                                  min={0}
                                  step={1}
                                  inputMode="numeric"
                                  value={editingValue}
                                  onChange={(e) => setEditingValue(e.target.value.replace(/\D/g, "").slice(0, 6))}
                                  data-edit-input={item.id}
                                  onBlur={() => {
                                    const v = parseIntSafe(editingValue);
                                    if (v === item.cantRecibida) {
                                      setEditingItemId(null);
                                      setEditingValue("");
                                      return;
                                    }
                                    void actualizarItemCantRecibida(item.id, v);
                                  }}
                                  onKeyDown={(e) => {
                                    if (e.key === "Enter") (e.target as HTMLInputElement).blur();
                                  }}
                                  disabled={locked || busy}
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
                                  disabled={locked || busy}
                                  aria-label="Aumentar"
                                  title="Aumentar"
                                >
                                  <span className="text-sm leading-none">+</span>
                                </Button>
                              </div>
                            ) : (
                              cantRecibidaVisible
                            )}
                          </TableCell>
                          <TableCell className="celda-datos w-[15%] tabla-bloque-secundario-cell-divider">
                            <div className="flex items-center justify-center gap-2">
                              <Button
                                type="button"
                                variant="outline"
                                size="icon-xs"
                                onClick={onClickOk(item)}
                                disabled={locked || busy}
                                aria-label="OK"
                                title="OK"
                                data-ok-button={item.id}
                              >
                                <Check className="h-4 w-4" />
                              </Button>
                              <Button
                                type="button"
                                variant="outline"
                                size="icon-xs"
                                onClick={onClickEditar(item)}
                                disabled={locked || busy}
                                aria-label="Editar"
                                title="Editar"
                              >
                                <Pencil className="h-4 w-4" />
                              </Button>
                              <Button
                                type="button"
                                variant="outline"
                                size="icon-xs"
                                onClick={onClickCesto(item)}
                                disabled={locked || busy}
                                aria-label="Cesto De Basura"
                                title="Cesto De Basura"
                              >
                                <Trash2 className="h-4 w-4" />
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
                  <section
                    aria-label="Totales del pedido"
                    className={cn(
                      GRID_PEDIDO_HISTORIA_TABLA_COLS,
                      "min-w-0 shrink-0 border-t border-border bg-transparent py-1 pr-3 pl-0 sm:py-1.5 sm:pr-4 sm:pl-0 items-center"
                    )}
                  >
                    <div className="celda-datos col-start-4 flex items-center justify-end border-b-0 text-right">
                      <span className="text-sm font-semibold tabular-nums text-foreground whitespace-nowrap">
                        TOTAL PEDIDO
                      </span>
                    </div>
                    <div className="celda-datos col-start-5 flex min-w-0 items-center justify-start gap-0 border-b-0 !pl-0">
                      <Input
                        type="text"
                        inputMode="decimal"
                        autoComplete="off"
                        disabled={locked || loading}
                        value={
                          totalPedidoFocused
                            ? totalPedidoDraft
                            : normalizedMontoToDisplayAr(totalPedido)
                        }
                        onFocus={() => {
                          setTotalPedidoDraft(
                            totalPedido === ""
                              ? "$"
                              : normalizedMontoToDisplayAr(totalPedido)
                          );
                          setTotalPedidoFocused(true);
                        }}
                        onChange={(e) => {
                          if (!totalPedidoFocused) return;
                          setTotalPedidoDraft(formatLiveTotalPedidoInput(e.target.value));
                        }}
                        onBlur={() => {
                          setTotalPedido(parseMontoArInputToNormalized(totalPedidoDraft));
                          setTotalPedidoFocused(false);
                        }}
                        className={cn(
                          "ml-0 h-9 w-full min-w-0 !pl-0 pr-3 py-1 tabular-nums text-center font-semibold",
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
        onSeleccionar={(row) => {
          onSeleccionarProducto(row);
        }}
      />
    </>
  );
}

