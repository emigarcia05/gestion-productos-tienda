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
  const [totalPedido, setTotalPedido] = useState<string>("");
  const [agregarProductosOpen, setAgregarProductosOpen] = useState(false);

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
      setAgregarProductosOpen(false);
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
          title="Detalle Del Pedido"
          scrollBody={false}
          size="xl"
          className="sm:max-w-[72rem] max-h-[95vh]"
          bodyShellClassName="p-0"
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
        <div className="flex flex-col gap-4 h-full min-h-0">
          <div className="flex flex-col gap-1">
            <div className="text-sm font-medium text-foreground">
              {detalle ? detalle.proveedorNombre : "—"} - {detalle ? detalle.sucursalNombre : "—"}
            </div>
            <div className="text-xs text-muted-foreground">
              {generadoAtStr || "—"} · {estado === "RECIBIDO" ? "RECIBIDO" : "PEDIDO"}
            </div>
          </div>

          <div className="flex flex-col gap-3">
            <div className="flex items-end gap-2">
              <div className="flex flex-col gap-1 flex-1">
                <span className="text-xs text-foreground">DESCRIPCIÓN</span>
                {productoSeleccionado ? (
                  <Input
                    value={productoSeleccionado.descripcionTienda}
                    readOnly
                    disabled={locked || loading}
                    data-desc-input="detalle"
                    aria-label="Seleccionar Producto"
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
                      "h-10 cursor-pointer",
                      inputBorderClassName,
                      locked || loading ? "cursor-not-allowed" : ""
                    )}
                  />
                ) : (
                  <Button
                    type="button"
                    variant="outline"
                    className="h-10 justify-start"
                    onClick={() => setAgregarProductosOpen(true)}
                    disabled={locked || loading}
                  >
                    Seleccionar Producto
                  </Button>
                )}
              </div>

              <div className="flex flex-col gap-1 w-40">
                <span className="text-xs text-foreground">CANT.</span>
                <Input
                  type="number"
                  min={0}
                  step={1}
                  inputMode="numeric"
                  value={cantRecibidaNueva}
                  onChange={(e) => setCantRecibidaNueva(e.target.value.replace(/\D/g, "").slice(0, 6))}
                  data-cant-input="detalle"
                  disabled={locked || loading}
                  className={cn("h-10 tabular-nums text-center", inputBorderClassName)}
                />
              </div>

              <Button
                type="button"
                onClick={agregarNuevaFila}
                disabled={
                  locked ||
                  loading ||
                  guardando != null ||
                  !productoSeleccionado ||
                  parseIntSafe(cantRecibidaNueva) <= 0
                }
                className="h-10"
              >
                + AGREGAR
              </Button>
            </div>

            <div className="flex flex-col flex-1 min-h-0">
              <div className="contenedor-tabla-gestion no-scroll-x flex-1 min-h-0">
              <Table variant="compact" scrollX={false}>
                <TableHeader>
                  <TableRow>
                    <TableHead className="w-[9%]">COD. TIENDA</TableHead>
                    <TableHead className="w-[62.5%]">DESCRIPCIÓN (descripcion_tienda)</TableHead>
                    <TableHead className="w-[10.5%]">CANT. PEDIDA</TableHead>
                    <TableHead className="w-[10.5%]">CANT. RECIBIDA</TableHead>
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

                      return (
                        <TableRow
                          key={item.id}
                          className={cn(
                            "hover:bg-transparent",
                            isControlado && "bg-primary/10 hover:bg-primary/10"
                          )}
                        >
                          <TableCell className="celda-datos min-w-0 truncate w-[9%]" title={item.codTienda}>
                            {item.codTienda}
                          </TableCell>
                          <TableCell
                            className="celda-datos min-w-0 truncate w-[62.5%]"
                            title={item.descripcionTienda}
                          >
                            {item.descripcionTienda}
                          </TableCell>
                          <TableCell className="celda-datos tabular-nums w-[10.5%]">
                            {cantPedidaVisible}
                          </TableCell>
                          <TableCell className="celda-datos tabular-nums w-[10.5%]">
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

              <div className="grid grid-cols-[9%_62.5%_10.5%_10.5%_15%] w-full px-[1px] items-center pt-1 pb-2">
                <div className="col-start-4 flex justify-end pr-1">
                  <span className="text-xs text-foreground shrink-0 whitespace-nowrap font-semibold">
                    TOTAL PEDIDO
                  </span>
                </div>
                <div className="col-start-5 flex items-center">
                  <Input
                    type="number"
                    min={0}
                    step={0.01}
                    inputMode="decimal"
                    value={totalPedido}
                    onChange={(e) => {
                      const raw = e.target.value;
                      const normalized = raw.replace(",", ".");

                      // Permitir: "" | "12" | "12." | "12.3" | "12.34" (máx 2 decimales)
                      if (normalized === "") {
                        setTotalPedido("");
                        return;
                      }
                      if (!/^\d*\.?\d{0,2}$/.test(normalized)) return;
                      setTotalPedido(normalized);
                    }}
                    disabled={locked || loading}
                    className={cn(
                      "h-10 w-full tabular-nums text-center",
                      inputBorderClassName
                    )}
                    aria-label="Total Pedido"
                  />
                </div>
              </div>
            </div>
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

