"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { toast } from "sonner";
import { Loader2, Lock } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { FiltroIndividualContainer } from "@/components/FilterBar";
import {
  TableEmptyState,
  modalListLoadingVariants,
  tableEmptyStateContainerVariants,
  tableEmptyStateMessageVariants,
} from "@/components/shared/TableEmptyState";
import { fmtPrecio } from "@/lib/format";
import { cn } from "@/lib/utils";
import type { FilaListaPrecioParaCliente } from "@/services/listaPrecios.service";
import type { PrecioRexParaVincular } from "@/services/prodPreciosRex.service";
import {
  listarPreciosRexParaVincularAction,
  vincularListaPrecioConPrecioRexAction,
} from "@/actions/prodPreciosRex";

interface Props {
  open: boolean;
  onClose: () => void;
  fila: FilaListaPrecioParaCliente | null;
  onVinculado?: () => void;
}

const MENSAJE_SIN_FILTRO =
  "ESCRIBÍ EN EL FILTRO DE DESCRIPCIÓN PARA VER LOS PRECIOS REX DEL PROVEEDOR.";

function fmtPrecioTabla(n: number): string {
  return `$${fmtPrecio(n)}`;
}

export default function VincularPrecioRexModal({ open, onClose, fila, onVinculado }: Props) {
  const [q, setQ] = useState("");
  const [rows, setRows] = useState<PrecioRexParaVincular[]>([]);
  const [loading, setLoading] = useState(false);
  const [vinculando, setVinculando] = useState(false);
  const [infoVinculo, setInfoVinculo] = useState<{
    codExt: string;
    descripcionProveedor: string;
  } | null>(null);
  const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const proveedorId = fila?.proveedor?.id ?? "";
  const codExtLista = fila?.codExt ?? "";

  useEffect(() => {
    if (!open) {
      queueMicrotask(() => {
        setQ("");
        setRows([]);
        setInfoVinculo(null);
      });
    }
  }, [open]);

  const lineaMarcaRubro = useMemo(
    () => [fila?.marca, fila?.rubro].map((s) => (s ?? "").trim()).filter(Boolean).join(" - "),
    [fila?.marca, fila?.rubro]
  );

  const hayFiltro = !!q.trim();

  useEffect(() => {
    if (!open || !fila || !proveedorId) return;
    if (debounceRef.current) clearTimeout(debounceRef.current);
    if (!hayFiltro) {
      queueMicrotask(() => {
        setLoading(false);
        setRows([]);
      });
      return;
    }
    queueMicrotask(() => setLoading(true));
    debounceRef.current = setTimeout(async () => {
      const result = await listarPreciosRexParaVincularAction({
        proveedorId,
        codExtLista,
        q: q.trim() || undefined,
      });
      setLoading(false);
      if (!result.ok) {
        toast.error(result.error);
        setRows([]);
        return;
      }
      setRows(result.data);
    }, 300);
    return () => {
      if (debounceRef.current) clearTimeout(debounceRef.current);
    };
  }, [open, fila, proveedorId, codExtLista, q, hayFiltro]);

  function vinculadoOtroProducto(row: PrecioRexParaVincular): boolean {
    return row.listaPrecioVinculada != null;
  }

  async function vincularRow(row: PrecioRexParaVincular) {
    if (!fila) return;
    if (vinculadoOtroProducto(row) && row.listaPrecioVinculada) {
      setInfoVinculo(row.listaPrecioVinculada);
      return;
    }
    setVinculando(true);
    try {
      const result = await vincularListaPrecioConPrecioRexAction({
        codExtLista: fila.codExt,
        idPrecioRex: row.id,
      });
      if (!result.ok) {
        toast.error(result.error);
        return;
      }
      toast.success("Precio REX vinculado.");
      onVinculado?.();
      onClose();
    } finally {
      setVinculando(false);
    }
  }

  if (!fila) return null;

  return (
    <>
      <Dialog
        open={open}
        onOpenChange={(v) => {
          if (!v) onClose();
        }}
      >
        <DialogContent
          className={cn(
            "modal-app max-w-[84rem] w-[calc(100%-2rem)] max-h-[90vh] flex flex-col gap-0 p-0 overflow-hidden"
          )}
        >
          <DialogHeader className="modal-app__header shrink-0">
            <DialogTitle className="modal-app__title">Vincular Precio REX</DialogTitle>
          </DialogHeader>

          <div className="modal-app__content flex-1 min-h-0">
            <div className="modal-app__body flex flex-col flex-1 min-h-0 overflow-hidden px-6 pt-4 pb-0">
              <div className="flex shrink-0 flex-col gap-1 pb-2 text-center">
                <p className="text-sm font-semibold text-foreground break-words">
                  {fila.descripcionProveedor}
                </p>
                {lineaMarcaRubro ? (
                  <p className="text-xs text-muted-foreground break-words">{lineaMarcaRubro}</p>
                ) : null}
                {fila.proveedor ? (
                  <p className="text-xs text-muted-foreground">
                    Proveedor:{" "}
                    <Badge variant="secondary" className="font-mono text-xs">
                      {fila.proveedor.prefijo}
                    </Badge>{" "}
                    {fila.proveedor.nombre}
                  </p>
                ) : null}
              </div>

              <div className="shrink-0 w-full flex flex-col gap-2 pb-3 border-b border-border">
                <FiltroIndividualContainer
                  className="w-full"
                  activo={!!q.trim()}
                  onLimpiar={() => setQ("")}
                >
                  <Input
                    value={q}
                    onChange={(e) => setQ(e.target.value)}
                    placeholder="DESCRIPCIÓN"
                    className="input-filtro-unificado w-full min-w-0"
                  />
                </FiltroIndividualContainer>
              </div>

              <div className="flex-1 min-h-0 flex flex-col pt-3 pb-3">
                {!hayFiltro ? (
                  <div
                    className={cn(
                      tableEmptyStateContainerVariants({ placement: "panel" }),
                      "flex flex-col items-center justify-center"
                    )}
                  >
                    <span className={cn(tableEmptyStateMessageVariants({ maxWidth: "readable" }))}>
                      {MENSAJE_SIN_FILTRO}
                    </span>
                  </div>
                ) : loading ? (
                  <div
                    className={cn(modalListLoadingVariants({ padding: "panel" }))}
                    role="status"
                    aria-live="polite"
                  >
                    <Loader2 className="h-6 w-6 animate-spin" aria-hidden />
                    CARGANDO…
                  </div>
                ) : rows.length === 0 ? (
                  <TableEmptyState
                    message="NO HAY PRECIOS REX O NO COINCIDEN LOS FILTROS."
                    placement="panel"
                  />
                ) : (
                  <>
                    <div className="shrink-0">
                      <Table variant="compact" scrollX={false} className="table-fixed w-full">
                        <TableHeader>
                          <TableRow className="hover:bg-transparent border-b-0">
                            <TableHead className="min-w-0">DESCRIPCIÓN</TableHead>
                            <TableHead className="w-32 text-right">PX. REX</TableHead>
                          </TableRow>
                        </TableHeader>
                      </Table>
                    </div>
                    <div className="flex-1 min-h-0 overflow-y-auto border-b border-border">
                      <Table variant="compact" scrollX={false} className="table-fixed w-full">
                        <TableBody>
                          {rows.map((row) => {
                            const bloqueado = vinculadoOtroProducto(row);
                            return (
                              <TableRow
                                key={row.id}
                                onDoubleClick={() => void vincularRow(row)}
                                className={cn(
                                  "select-none",
                                  bloqueado
                                    ? "cursor-not-allowed opacity-60 bg-muted/40 hover:bg-muted/50"
                                    : "cursor-pointer hover:bg-primary/5",
                                  vinculando && "pointer-events-none opacity-60"
                                )}
                                title={
                                  bloqueado
                                    ? "Precio REX ya vinculado a otro producto. Doble clic para ver detalles."
                                    : "Doble Clic Para Vincular"
                                }
                                aria-disabled={bloqueado || vinculando || undefined}
                              >
                                <TableCell className="celda-datos min-w-0">
                                  <span
                                    className="flex items-center gap-2 min-w-0"
                                    title={row.descripcion}
                                  >
                                    {bloqueado ? (
                                      <Lock
                                        className="h-3.5 w-3.5 shrink-0 text-muted-foreground"
                                        aria-hidden
                                      />
                                    ) : null}
                                    <span className="block truncate">{row.descripcion}</span>
                                  </span>
                                </TableCell>
                                <TableCell className="celda-datos celda-numero text-right tabular-nums whitespace-nowrap">
                                  {fmtPrecioTabla(row.precio)}
                                </TableCell>
                              </TableRow>
                            );
                          })}
                        </TableBody>
                      </Table>
                    </div>
                  </>
                )}
              </div>
            </div>

            <div className="modal-app__footer shrink-0 justify-between">
              <p className="text-sm text-muted-foreground tabular-nums">
                {rows.length > 0 && (
                  <>
                    <strong className="text-primary font-semibold">
                      {rows.length.toLocaleString()}
                    </strong>
                    {" RESULTADO(S)"}
                  </>
                )}
              </p>
              <Button variant="outline" size="sm" onClick={onClose} disabled={vinculando}>
                Cancelar
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>

      <Dialog
        open={infoVinculo != null}
        onOpenChange={(v) => {
          if (!v) setInfoVinculo(null);
        }}
      >
        <DialogContent className="modal-app max-w-md w-[calc(100%-2rem)] flex flex-col gap-0 p-0 overflow-hidden">
          <DialogHeader className="modal-app__header shrink-0">
            <DialogTitle className="modal-app__title">Precio REX Ya Vinculado</DialogTitle>
          </DialogHeader>
          <div className="modal-app__content">
            <div className="modal-app__body px-6 py-4 flex flex-col gap-3">
              <p className="text-sm text-muted-foreground">
                Este precio REX ya está vinculado al siguiente producto de lista:
              </p>
              <div className="rounded-md border border-border bg-card p-3 flex flex-col gap-1">
                <span className="text-xs uppercase text-muted-foreground tracking-wide">
                  Cód. Ext.
                </span>
                <span className="text-sm font-mono font-semibold text-foreground">
                  {infoVinculo?.codExt}
                </span>
                <span className="text-xs uppercase text-muted-foreground tracking-wide mt-2">
                  Descripción
                </span>
                <span className="text-sm text-foreground break-words">
                  {infoVinculo?.descripcionProveedor?.trim() || "(sin descripción)"}
                </span>
              </div>
              <p className="text-xs text-muted-foreground">
                Para vincularlo a otro producto, primero desvinculá el precio REX desde el producto
                actual.
              </p>
            </div>
            <div className="modal-app__footer shrink-0 justify-end">
              <Button variant="default" size="sm" onClick={() => setInfoVinculo(null)}>
                Cerrar
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </>
  );
}
