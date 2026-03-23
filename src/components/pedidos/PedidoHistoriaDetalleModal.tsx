"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { Dialog } from "@/components/ui/dialog";
import AppModal from "@/components/shared/AppModal";
import FiltroBusquedaInput from "@/components/shared/FiltroBusquedaInput";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { LimpiarFiltrosButton } from "@/components/FilterBar";
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
  actualizarPedidoHistoriaItemCantRecibidaAction,
  agregarPedidoHistoriaItemAction,
  getPedidoHistoriaDetalleAction,
  marcarPedidoHistoriaRegistradoAction,
} from "@/actions/pedidosHistoria";
import { exportarExcelRecepcionPedidoAction } from "@/actions/exportRecepcionPedidoExcel";
import AgregarProductosModal from "@/components/pedidos/AgregarProductosModal";
import { cn } from "@/lib/utils";
import { descargarExcelBase64 } from "@/lib/descargarExcelBase64";

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

function dateToIsoYmd(d: Date): string {
  const yyyy = d.getFullYear();
  const mm = String(d.getMonth() + 1).padStart(2, "0");
  const dd = String(d.getDate()).padStart(2, "0");
  return `${yyyy}-${mm}-${dd}`;
}

const inputBorderClassName = "border-[#0072bb] focus-visible:ring-[#0072bb]";

/**
 * Cabecera resumen: proveedor + metadatos | fecha factura (`sm`: dos columnas ~85% / ~15%).
 */
const GRID_CAPAS_SUP_PEDIDO_HISTORIA =
  "grid min-w-0 w-full grid-cols-1 gap-2 sm:grid-cols-[85fr_15fr] sm:gap-0";

/** Misma proporción que columnas de la tabla de ítems (check | desc | cant.p. | cant.r. | acciones). */
const GRID_PEDIDO_HISTORIA_TABLA_COLS =
  "grid w-full grid-cols-[5fr_50fr_10fr_20fr_15fr]";

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
/** Total normalizado (`totalPedido`) distinto de vacío y mayor que 0. */
function totalPedidoMontoPositivo(norm: string): boolean {
  if (norm === "") return false;
  const n = Number(norm);
  return Number.isFinite(n) && n > 0;
}

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

  /** Valor normalizado para lógica futura: "" | "123" | "123.45" (punto decimal). */
  const [totalPedido, setTotalPedido] = useState<string>("");
  const [totalPedidoDraft, setTotalPedidoDraft] = useState<string>("");
  const [totalPedidoFocused, setTotalPedidoFocused] = useState(false);
  const [agregarProductosOpen, setAgregarProductosOpen] = useState(false);
  const [busquedaAgregarProducto, setBusquedaAgregarProducto] = useState("");
  /** Valor ISO `YYYY-MM-DD` — UI: campo FECHA FACTURA; persistencia backend pendiente. */
  const [fechaRecepcion, setFechaRecepcion] = useState<string>("");
  /** Check list por ítem: solo se marca vía botón OK (confirma cant. recibida) o cesto (0 + verificar). */
  const [checkListConfirmedByItem, setCheckListConfirmedByItem] = useState<Record<string, boolean>>(
    {}
  );

  const fechaInputRef = useRef<HTMLInputElement>(null);
  const busquedaAgregarRef = useRef<HTMLInputElement>(null);

  const estado: PedidoHistoriaEstado | null = detalle ? detalle.estado : null;
  const locked = estado === "RECEPCIONADO";
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
    const detalleNormalizado =
      res.data.estado === "RECEPCIONADO"
        ? res.data
        : {
            ...res.data,
            items: res.data.items.map((it) => ({ ...it, cantRecibida: null })),
          };
    setDetalle(detalleNormalizado);
    // Para permitir "Descargar Recepcion" en modo RECEPCIONADO, alimentamos el campo con una fecha razonable.
    // Hoy no existe persistencia de "FECHA FACTURA" en DB; usamos `generadoAt` del snapshot.
    if (res.data.estado === "RECEPCIONADO") {
      const d = toDate(res.data.generadoAt);
      if (d) setFechaRecepcion(dateToIsoYmd(d));
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
      setTotalPedidoDraft("");
      setTotalPedidoFocused(false);
      setAgregarProductosOpen(false);
      setBusquedaAgregarProducto("");
      setFechaRecepcion("");
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
    if (!open || locked || loading) return;
    queueMicrotask(() => {
      fechaInputRef.current?.focus();
    });
  }, [open, pedidoHistoriaId, locked, loading]);

  useEffect(() => {
    if (!editingItemId) return;
    queueMicrotask(() => {
      const el = document.querySelector<HTMLInputElement>(
        `input[data-edit-input="${editingItemId}"]`
      );
      el?.focus();
    });
  }, [editingItemId]);

  async function actualizarItemCantRecibida(
    pedidoHistoriaItemId: string,
    cantRecibida: number,
    options?: { confirmChecklistAfter?: boolean }
  ): Promise<boolean> {
    if (locked) return false;
    if (guardando) return false;
    if (fechaRecepcion.trim() === "") return false;

    setGuardando(pedidoHistoriaItemId);
    try {
      const res = await actualizarPedidoHistoriaItemCantRecibidaAction({
        pedidoHistoriaItemId,
        cantRecibida,
      });
      if (!res.ok) {
        toast.error(res.error ?? "Error al guardar.");
        return false;
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
    } finally {
      setGuardando(null);
    }
  }

  function onClickOk(item: PedidoHistoriaDetalle["items"][number]) {
    return async () => {
      if (locked || busy) return;
      if (fechaRecepcion.trim() === "") return;
      const cant = Math.max(0, item.cantPedida);
      await actualizarItemCantRecibida(item.id, cant, {
        confirmChecklistAfter: true,
      });
    };
  }

  function onClickCesto(item: PedidoHistoriaDetalle["items"][number]) {
    return async () => {
      if (locked || busy) return;
      if (fechaRecepcion.trim() === "") return;
      await actualizarItemCantRecibida(item.id, 0, {
        confirmChecklistAfter: true,
      });
    };
  }

  function onClickEditar(item: PedidoHistoriaDetalle["items"][number]) {
    return async () => {
      if (locked) return;
      if (busy) return;
      if (fechaRecepcion.trim() === "") return;
      const cantInicial = Math.max(0, item.cantPedida);
      const ok = await actualizarItemCantRecibida(item.id, cantInicial);
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
    if (!pedidoHistoriaId) return;
    const codTiendaAdded = producto.codTienda;
    let nextOkItemId: string | null = null;
    const cant = Math.max(0, Math.floor(Number(cantRecibida) || 0));
    if (cant <= 0) {
      toast.error("Ingresá una Cant. Recibida mayor a 0.");
      return;
    }

    setGuardando("new");
    try {
      const res = await agregarPedidoHistoriaItemAction({
        pedidoHistoriaId,
        codTienda: producto.codTienda,
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

  function ajustarEditingValue(delta: number) {
    if (locked || busy) return;
    if (fechaRecepcion.trim() === "") return;
    const current = parseIntSafe(editingValue);
    const next = Math.max(0, current + delta);
    setEditingValue(next === 0 ? "" : String(next));
  }

  function onClickConfirmarEdicion(item: PedidoHistoriaDetalle["items"][number]) {
    return async () => {
      if (locked || busy) return;
      if (fechaRecepcion.trim() === "") return;
      if (editingItemId !== item.id) return;
      const cant = parseIntSafe(editingValue);
      await actualizarItemCantRecibida(item.id, cant, {
        confirmChecklistAfter: true,
      });
    };
  }

  const itemsOrdenados = useMemo(() => {
    const base = detalle?.items ?? [];
    return [...base].sort((a, b) => {
      const aChecked = checkListConfirmedByItem[a.id] === true;
      const bChecked = checkListConfirmedByItem[b.id] === true;
      if (aChecked !== bChecked) return aChecked ? 1 : -1;
      return a.descripcionTienda.localeCompare(b.descripcionTienda, "es", {
        sensitivity: "base",
      });
    });
  }, [detalle?.items, checkListConfirmedByItem]);

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

  const clsBotonTabla = "disabled:cursor-not-allowed";

  return (
    <>
      <Dialog open={open} onOpenChange={onOpenChange}>
        <AppModal
          title="Recepcion Del Pedido"
          scrollBody={false}
          size="xl"
          className="sm:max-w-[66rem] h-[95vh] max-h-[95vh]"
          bodyShellClassName="p-0"
          padding="sm"
          headerClassName="pt-3 pb-3"
          footerClassName="py-3"
          bodyClassName="py-2 sm:py-2.5"
          actions={
            <>
              <Button
                type="button"
                variant="outline"
                onClick={() => onOpenChange(false)}
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
                      // Secuencia requerida: primero generamos y descargamos el Excel (97-2003),
                      // y luego registramos el pedido como "recibido" en DUX.
                      const excelRes = await exportarExcelRecepcionPedidoAction({
                        pedidoHistoriaId,
                        fechaFacturaIso: fechaRecepcion,
                      });
                      if (!excelRes.ok) {
                        toast.error(excelRes.error ?? "Error al generar el Excel.");
                        return;
                      }
                      descargarExcelBase64(
                        excelRes.data.excelBase64,
                        excelRes.data.filename
                      );

                      const res = await marcarPedidoHistoriaRegistradoAction({
                        pedidoHistoriaId,
                      });
                      if (!res.ok) {
                        toast.error(res.error ?? "Error al registrar en DUX.");
                        return;
                      }
                      toast.success("Pedido registrado en DUX.");
                      onOpenChange(false);
                    } finally {
                      setGuardando(null);
                    }
                  }}
                  disabled={!puedeRegistrarEnDux}
                >
                  Registrar En Dux
                </Button>
              ) : (
                <Button
                  type="button"
                  className="disabled:cursor-not-allowed"
                  disabled={locked && (guardando != null || loading || !pedidoHistoriaId)}
                  onClick={async () => {
                    if (!pedidoHistoriaId) return;
                    const isoFecha =
                      fechaRecepcion.trim() !== ""
                        ? fechaRecepcion
                        : (() => {
                            const d = toDate(detalle?.generadoAt ?? null);
                            return d ? dateToIsoYmd(d) : "";
                          })();
                    if (!isoFecha) {
                      toast.error("No hay fecha para descargar la recepcion.");
                      return;
                    }

                    setGuardando("export");
                    try {
                      const excelRes = await exportarExcelRecepcionPedidoAction({
                        pedidoHistoriaId,
                        fechaFacturaIso: isoFecha,
                      });
                      if (!excelRes.ok) {
                        toast.error(excelRes.error ?? "Error al generar el Excel.");
                        return;
                      }
                      descargarExcelBase64(
                        excelRes.data.excelBase64,
                        excelRes.data.filename
                      );
                    } finally {
                      setGuardando(null);
                    }
                  }}
                >
                  Descargar Recepcion
                </Button>
              )}
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
                "pt-0 pb-1.5"
              )}
            >
              <div className={cn(GRID_CAPAS_SUP_PEDIDO_HISTORIA, "w-full items-center")}>
                <div
                  className={cn(
                    "flex min-h-0 min-w-0 flex-col justify-center gap-0.5 py-0 text-center sm:text-left"
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
                  <span
                    className={cn(
                      MODAL_MICRO_LABEL_CLASS,
                      "w-full text-left leading-tight"
                    )}
                  >
                    FECHA FACTURA
                  </span>
                  <Input
                    ref={fechaInputRef}
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
                "flex shrink-0 flex-col gap-0 pt-0 pb-1.5 sm:pt-0 sm:pb-2",
                !tablaYAltaHabilitados &&
                  !locked &&
                  "pointer-events-none cursor-not-allowed opacity-50"
              )}
            >
              <span
                id="pedido-historia-agregar-recepcion-titulo"
                className="sr-only"
              >
                AGREGAR PRODUCTO A LA RECEPCIÓN
              </span>
              <div className="grid w-full min-w-0 grid-cols-[85fr_15fr] items-center gap-x-4 pt-1 pb-0">
                <div className="flex min-w-0 items-center gap-2">
                  <div className="min-w-0 flex-1">
                    <FiltroBusquedaInput
                      id="pedido-historia-agregar-producto-filtro"
                      placeholder="BUSCAR POR DESCRIPCIÓN..."
                      value={busquedaAgregarProducto}
                      onChange={setBusquedaAgregarProducto}
                      isDebouncing={false}
                      inputRef={busquedaAgregarRef}
                    />
                  </div>
                  <LimpiarFiltrosButton
                    visible={busquedaAgregarProducto.trim().length > 0}
                    onClick={() => setBusquedaAgregarProducto("")}
                  />
                </div>
                <Button
                  type="button"
                  variant="default"
                  onClick={() => setAgregarProductosOpen(true)}
                  disabled={locked || loading || !fechaFacturaOk || guardando != null}
                  className={cn(
                    "h-9 w-full min-w-0 shrink-0 cursor-pointer justify-start gap-2 rounded-md px-3 py-1 text-sm font-normal text-primary-foreground [&_svg]:text-primary-foreground",
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
                  <div className="relative min-h-0 min-w-0 flex-1 overflow-x-hidden overflow-y-auto max-h-[50vh] no-scrollbar">
                    <div
                      className={cn(
                        !tablaYAltaHabilitados &&
                          !locked &&
                          "pointer-events-none cursor-not-allowed opacity-50"
                      )}
                    >
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
                    <TableHead className="w-[50%]">DESCRIPCIÓN</TableHead>
                    <TableHead className="w-[10%]">CANT. PEDIDA</TableHead>
                    <TableHead className="w-[20%]">CANT. RECIBIDA</TableHead>
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
                  ) : itemsFiltrados.length === 0 ? (
                    <EmptyTableRow
                      colSpan={5}
                      message={
                        busquedaAgregarProducto.trim()
                          ? "Sin ítems para la descripción buscada."
                          : "Sin ítems."
                      }
                    />
                  ) : (
                    itemsFiltrados.map((item) => {
                      const isEditing = editingItemId === item.id;
                      const cantRecNum = item.cantRecibida ?? 0;
                      const cantRecibidaVisible =
                        item.cantRecibida != null ? String(item.cantRecibida) : "";
                      const isControlado =
                        item.cantPedida > 0 &&
                        item.cantRecibida != null &&
                        item.cantRecibida === item.cantPedida;
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

                      return (
                        <TableRow
                          key={item.id}
                          className={cn(
                            !checkListConfirmed &&
                              !isControlado &&
                              "hover:bg-transparent",
                            checkListConfirmed &&
                              "cursor-not-allowed bg-muted/50 odd:bg-muted/50 even:bg-muted/50 hover:bg-muted/50",
                            isControlado &&
                              !checkListConfirmed &&
                              "bg-primary/10 hover:bg-primary/10"
                          )}
                        >
                          <TableCell
                            className={cn(
                              "celda-datos w-[5%] text-center align-middle",
                              checkListConfirmed && "opacity-60"
                            )}
                          >
                            {checkListConfirmed ? (
                              <Check
                                className="mx-auto h-4 w-4 shrink-0 text-primary"
                                aria-label="Ítem verificado"
                              />
                            ) : locked ? (
                              <span className="text-muted-foreground">—</span>
                            ) : (
                              <div className="flex min-w-0 w-full flex-col items-center justify-center py-0">
                                <Input
                                  readOnly
                                  tabIndex={-1}
                                  value=""
                                  aria-label="Lista de verificación"
                                  title="OK copia CANT. PEDIDA en CANT. RECIBIDA y verifica; Editar copia CANT. PEDIDA y habilita edición; Cesto guarda 0 y verifica."
                                  disabled={
                                    busy || checkListConfirmed || !fechaFacturaOk || locked
                                  }
                                  className={cn(
                                    "pointer-events-none h-7 min-h-7 w-full min-w-0 px-1 text-center text-xs tabular-nums",
                                    inputBorderClassName
                                  )}
                                />
                              </div>
                            )}
                          </TableCell>
                          <TableCell
                            className={cn(
                              "celda-datos min-w-0 truncate w-[50%]",
                              checkListConfirmed && "opacity-60"
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
                              checkListConfirmed && "opacity-60"
                            )}
                          >
                            {cantPedidaVisible}
                          </TableCell>
                          <TableCell
                            className={cn(
                              "celda-datos tabular-nums w-[20%]",
                              checkListConfirmed && !isEditing && "opacity-60"
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
                                  className={clsBotonTabla}
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
                                    void actualizarItemCantRecibida(item.id, v);
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
                                  className={clsBotonTabla}
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
                                    clsBotonTabla,
                                    "text-primary-foreground [&_svg]:text-primary-foreground"
                                  )}
                                  aria-label="Confirmar Edición"
                                  title="Confirmar Edición"
                                >
                                  <Check className="h-4 w-4" />
                                </Button>
                              </div>
                            ) : (
                              cantRecibidaVisible
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
                                className={clsBotonTabla}
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
                                disabled={locked || busy || !fechaFacturaOk}
                                className={clsBotonTabla}
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
                                disabled={locked || busy || !fechaFacturaOk}
                                className={clsBotonTabla}
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
                  >
                    <div className="celda-datos col-start-4 flex items-center justify-end border-b-0 text-right">
                      <span className="text-sm font-semibold tabular-nums text-foreground whitespace-nowrap">
                        TOTAL PEDIDO
                      </span>
                    </div>
                    <div className="celda-datos celda-datos--flush-left celda-datos--flush-right col-start-5 flex min-w-0 items-center justify-start gap-0 border-b-0">
                      <Input
                        type="text"
                        inputMode="decimal"
                        autoComplete="off"
                        disabled={locked || loading || !totalPedidoInputHabilitado}
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
                          "ml-0 h-9 w-full min-w-0 pl-0 pr-3 py-1 tabular-nums text-center font-semibold",
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
    </>
  );
}

