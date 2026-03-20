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
import {
  actualizarPedidoHistoriaItemCantRecibidaAction,
  agregarPedidoHistoriaItemAction,
  getPedidoHistoriaDetalleAction,
} from "@/actions/pedidosHistoria";

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

  const [newCodTienda, setNewCodTienda] = useState("");
  const [newCantRecibida, setNewCantRecibida] = useState("");

  const estado: PedidoHistoriaEstado | null = detalle ? detalle.estado : null;
  const locked = estado === "REGISTRADO";
  const busy = guardando != null || loading;

  const generadoAtStr = useMemo(() => {
    const d = toDate(detalle?.generadoAt ?? null);
    return d ? formatDdMmHHmm(d) : "";
  }, [detalle?.generadoAt]);

  async function cargarDetalle(id: string) {
    const res = await getPedidoHistoriaDetalleAction({ pedidoHistoriaId: id });
    if (!res.ok) {
      setDetalle(null);
      setErrorMsg(res.error ?? "Error al cargar detalle.");
      return;
    }
    setDetalle(res.data);
    setErrorMsg(null);
  }

  useEffect(() => {
    if (!open || !pedidoHistoriaId) return;

    queueMicrotask(() => {
      setDetalle(null);
      setErrorMsg(null);
      setLoading(true);
      setEditingItemId(null);
      setEditingValue("");
      setNewCodTienda("");
      setNewCantRecibida("");
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

    const cod = newCodTienda.trim();
    const cant = parseIntSafe(newCantRecibida);
    if (!cod || cant <= 0) {
      toast.error("Ingresá un Cod. Tienda y una Cant. Recibida mayor a 0.");
      return;
    }

    setGuardando("new");
    try {
      const res = await agregarPedidoHistoriaItemAction({
        pedidoHistoriaId,
        codTienda: cod,
        cantRecibida: cant,
      });
      if (!res.ok) {
        toast.error(res.error ?? "Error al agregar fila.");
        return;
      }

      // Recargar detalle para reflejar el consolidado por cod_tienda.
      setLoading(true);
      await cargarDetalle(pedidoHistoriaId);
      toast.success("Ítem agregado.");
    } finally {
      setLoading(false);
      setGuardando(null);
    }
  }

  const items = detalle?.items ?? [];

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <AppModal
        title="Detalle Del Pedido"
        scrollBody={false}
        size="xl"
        bodyShellClassName="p-0"
        actions={
          <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>
            Cerrar
          </Button>
        }
      >
        <div className="flex flex-col gap-4 h-full min-h-0">
          <div className="flex flex-col gap-1">
            <div className="text-sm font-medium text-foreground">
              {detalle ? detalle.proveedorNombre : "—"} - {detalle ? detalle.sucursalNombre : "—"}
            </div>
            <div className="text-xs text-muted-foreground">
              {generadoAtStr || "—"} · {estado === "REGISTRADO" ? "Registrado" : "Pedido"}
            </div>
          </div>

          <div className="flex flex-col gap-3">
            <div className="flex items-center gap-2">
              <div className="flex flex-col gap-1 w-56">
                <span className="text-xs text-muted-foreground">Cod. Tienda</span>
                <Input
                  value={newCodTienda}
                  onChange={(e) => setNewCodTienda(e.target.value)}
                  placeholder="Ingresar…"
                  disabled={locked || loading}
                  className="h-10"
                />
              </div>
              <div className="flex flex-col gap-1 w-40">
                <span className="text-xs text-muted-foreground">Cant. Recibida</span>
                <Input
                  type="number"
                  min={0}
                  step={1}
                  inputMode="numeric"
                  value={newCantRecibida}
                  onChange={(e) => setNewCantRecibida(e.target.value.replace(/\D/g, "").slice(0, 6))}
                  disabled={locked || loading}
                  className="h-10 tabular-nums text-center"
                />
              </div>
              <Button
                type="button"
                onClick={agregarNuevaFila}
                disabled={locked || loading || guardando != null || newCodTienda.trim().length === 0 || parseIntSafe(newCantRecibida) <= 0}
              >
                Agregar
              </Button>
            </div>

            <div className="contenedor-tabla-gestion no-scroll-x flex-1 min-h-0">
              <Table variant="compact" scrollX={false}>
                <TableHeader>
                  <TableRow>
                    <TableHead className="w-[25%]">COD. TIENDA</TableHead>
                    <TableHead className="w-[20%]">CANT. PEDIDA</TableHead>
                    <TableHead className="w-[20%]">CANT. RECIBIDA</TableHead>
                    <TableHead className="w-[35%]">ACCIONES</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {loading ? (
                    <EmptyTableRow colSpan={4} message="Cargando…" />
                  ) : errorMsg ? (
                    <EmptyTableRow colSpan={4} message={errorMsg} />
                  ) : items.length === 0 ? (
                    <EmptyTableRow colSpan={4} message="Sin ítems." />
                  ) : (
                    items.map((item) => {
                      const isEditing = editingItemId === item.id;
                      const cantRecibidaVisible = item.cantRecibida > 0 ? String(item.cantRecibida) : "";

                      return (
                        <TableRow key={item.id} className="hover:bg-transparent">
                          <TableCell className="celda-datos min-w-0 truncate" title={item.codTienda}>
                            {item.codTienda}
                          </TableCell>
                          <TableCell className="celda-datos tabular-nums">
                            {item.cantPedida > 0 ? item.cantPedida.toLocaleString("es-AR") : ""}
                          </TableCell>
                          <TableCell className="celda-datos tabular-nums">
                            {locked ? (
                              cantRecibidaVisible
                            ) : isEditing ? (
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
                                className="h-8 w-24 text-center"
                              />
                            ) : (
                              cantRecibidaVisible
                            )}
                          </TableCell>
                          <TableCell className="celda-datos">
                            <div className="flex items-center justify-center gap-2">
                              <Button
                                type="button"
                                variant="outline"
                                size="icon-xs"
                                onClick={onClickOk(item)}
                                disabled={locked || busy}
                                aria-label="OK"
                                title="OK"
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
          </div>
        </div>
      </AppModal>
    </Dialog>
  );
}

