"use client";

import { useCallback, useEffect, useMemo, useState, useTransition } from "react";
import { Check } from "lucide-react";
import { toast } from "sonner";
import { Dialog } from "@/components/ui/dialog";
import AppModal from "@/components/shared/AppModal";
import ModalMicroLabel from "@/components/shared/ModalMicroLabel";
import { Button } from "@/components/ui/button";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { SELECT_TRIGGER_FILTER_CLASS } from "@/components/FilterBar";
import {
  listarPendientesTransfDepositosAction,
  listarSucursalesTransfDepositosAction,
  marcarTransferidoTransfDepositosAction,
  type PendienteTransfDepositoItemDto,
  type Sucursal,
  type SucursalTransfDepositoOptionDto,
} from "@/actions/stock";
import { fmtNumero } from "@/lib/format";
import { DUX_TRANSFERENCIA_DEPOSITOS_URL } from "@/lib/transfDepositosControl";
import {
  TABLE_ROW_ACTION_ICON_CLASS,
  TABLE_ROW_CELL_ICON_ACTIONS_FLEX_CLASS,
  TABLE_ROW_ICON_BUTTON_FILLED_BRAND_CLASS,
} from "@/lib/ui-classes";
import { cn } from "@/lib/utils";

interface Props {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  /** Código de sucursal del usuario (origen de las filas). */
  origenCodigo: Sucursal | null;
  /** Destino de la página, si hay, para preseleccionar. */
  destinoCodigo: Sucursal | null;
  onTransferido?: () => void;
}

/**
 * Modal **Generar Transf.**: dos selectores **SUC. ORIGEN** (sucursal del usuario)
 * y **SUC. DESTINO** (`global_sucursales` distintas, con `deposito` no vacío);
 * tabla COD. TIENDA / DESCRIPCIÓN TIENDA / CANTIDAD A TRANSFERIR / ACCIONES (OK);
 * checklist local hasta **Transferido**, que borra el lote. **Comenzar Transferencia** abre DUX en pestaña nueva.
 */
export default function GenerarTransfDepositosModal({
  open,
  onOpenChange,
  origenCodigo,
  destinoCodigo,
  onTransferido,
}: Props) {
  const [sucursales, setSucursales] = useState<SucursalTransfDepositoOptionDto[]>(
    []
  );
  const [sucOrigenId, setSucOrigenId] = useState<string | null>(null);
  const [sucDestinoId, setSucDestinoId] = useState<string | null>(null);
  const [items, setItems] = useState<PendienteTransfDepositoItemDto[]>([]);
  const [okPorCodTienda, setOkPorCodTienda] = useState<Record<string, boolean>>(
    {}
  );
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [isPending, startTransition] = useTransition();

  const origenes = useMemo(() => {
    return sucursales.filter(
      (s) => s.tieneDeposito || s.codigo === origenCodigo
    );
  }, [sucursales, origenCodigo]);

  const destinos = useMemo(
    () =>
      sucursales.filter((s) => s.tieneDeposito && s.id !== sucOrigenId),
    [sucursales, sucOrigenId]
  );

  const cargarItems = useCallback(
    async (origenId: string, destinoId: string) => {
      const res = await listarPendientesTransfDepositosAction({
        sucOrigenId: origenId,
        sucDestinoId: destinoId,
      });
      if (!res.ok) {
        setError(res.error);
        setItems([]);
        setOkPorCodTienda({});
        return;
      }
      setError(null);
      setItems(res.data);
      setOkPorCodTienda({});
    },
    []
  );

  useEffect(() => {
    if (!open) return;
    let cancelled = false;

    queueMicrotask(() => {
      setLoading(true);
      setError(null);
      setItems([]);
      setOkPorCodTienda({});
      setSucOrigenId(null);
      setSucDestinoId(null);
    });

    (async () => {
      const res = await listarSucursalesTransfDepositosAction();
      if (cancelled) return;
      if (!res.ok) {
        setLoading(false);
        setError(res.error);
        return;
      }
      setSucursales(res.data);
      const origen = origenCodigo
        ? res.data.find((s) => s.codigo === origenCodigo)
        : undefined;
      if (!origen) {
        setLoading(false);
        setError("Sucursal origen no encontrada.");
        return;
      }
      setSucOrigenId(origen.id);
      const destinoPre =
        destinoCodigo && destinoCodigo !== origen.codigo
          ? res.data.find(
              (s) =>
                s.codigo === destinoCodigo &&
                s.tieneDeposito &&
                s.id !== origen.id
            )
          : undefined;
      if (destinoPre) {
        setSucDestinoId(destinoPre.id);
        await cargarItems(origen.id, destinoPre.id);
      }
      if (!cancelled) setLoading(false);
    })();

    return () => {
      cancelled = true;
    };
  }, [open, origenCodigo, destinoCodigo, cargarItems]);

  function handleOrigenChange(value: string) {
    const next = value === "none" ? null : value;
    setSucOrigenId(next);
    setSucDestinoId(null);
    setItems([]);
    setOkPorCodTienda({});
    setError(null);
  }

  function handleDestinoChange(value: string) {
    const next = value === "none" ? null : value;
    setSucDestinoId(next);
    if (!sucOrigenId || !next) {
      setItems([]);
      setOkPorCodTienda({});
      setError(null);
      return;
    }
    setLoading(true);
    startTransition(async () => {
      await cargarItems(sucOrigenId, next);
      setLoading(false);
    });
  }

  function handleOkItem(codTienda: string) {
    setOkPorCodTienda((prev) => ({ ...prev, [codTienda]: true }));
  }

  function handleTransferido() {
    if (!sucOrigenId || !sucDestinoId || items.length === 0) return;
    startTransition(async () => {
      const res = await marcarTransferidoTransfDepositosAction({
        sucOrigenId,
        sucDestinoId,
      });
      if (!res.ok) {
        toast.error(res.error);
        return;
      }
      toast.success(
        `${res.data.borrados} transferencia${res.data.borrados !== 1 ? "s" : ""} marcada${res.data.borrados !== 1 ? "s" : ""} como transferida${res.data.borrados !== 1 ? "s" : ""}.`
      );
      setItems([]);
      setOkPorCodTienda({});
      onTransferido?.();
      onOpenChange(false);
    });
  }

  const todosOk =
    items.length > 0 && items.every((item) => okPorCodTienda[item.codTienda] === true);
  const puedeMarcar =
    sucOrigenId !== null &&
    sucDestinoId !== null &&
    todosOk &&
    !loading;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <AppModal
        size="lg"
        title="Generar Transf."
        bodyClassName="space-y-4"
        actions={
          <>
            <Button
              type="button"
              variant="outline"
              onClick={() => onOpenChange(false)}
              disabled={isPending}
            >
              Cerrar
            </Button>
            <Button
              type="button"
              onClick={handleTransferido}
              disabled={!puedeMarcar || isPending}
            >
              Transferido
            </Button>
          </>
        }
      >
        <Button asChild className="w-full">
          <a
            href={DUX_TRANSFERENCIA_DEPOSITOS_URL}
            target="_blank"
            rel="noopener noreferrer"
          >
            Comenzar Transferencia
          </a>
        </Button>
        <div className="grid grid-cols-2 gap-3">
          <div className="flex min-w-0 flex-col gap-1">
            <ModalMicroLabel align="center">SUC. ORIGEN</ModalMicroLabel>
            <Select
              value={sucOrigenId ?? "none"}
              onValueChange={handleOrigenChange}
              disabled={isPending}
            >
              <SelectTrigger
                id="filtro-transf-origen-modal"
                className={cn(SELECT_TRIGGER_FILTER_CLASS, "w-full")}
                aria-label="Sucursal origen"
              >
                <SelectValue placeholder="SUC. ORIGEN" />
              </SelectTrigger>
              <SelectContent
                position="popper"
                side="bottom"
                align="start"
                className="select-content-filtro"
              >
                <SelectItem value="none">SUC. ORIGEN</SelectItem>
                {origenes.map((s) => (
                  <SelectItem key={s.id} value={s.id}>
                    {s.nombre.toUpperCase()}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <div className="flex min-w-0 flex-col gap-1">
            <ModalMicroLabel align="center">SUC. DESTINO</ModalMicroLabel>
            <Select
              value={sucDestinoId ?? "none"}
              onValueChange={handleDestinoChange}
              disabled={!sucOrigenId || isPending}
            >
              <SelectTrigger
                id="filtro-transf-destino"
                className={cn(SELECT_TRIGGER_FILTER_CLASS, "w-full")}
                aria-label="Sucursal destino"
              >
                <SelectValue placeholder="SUC. DESTINO" />
              </SelectTrigger>
              <SelectContent
                position="popper"
                side="bottom"
                align="start"
                className="select-content-filtro"
              >
                <SelectItem value="none">SUC. DESTINO</SelectItem>
                {destinos.map((s) => (
                  <SelectItem key={s.id} value={s.id}>
                    {s.nombre.toUpperCase()}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        </div>

        {loading ? (
          <p className="text-sm text-foreground py-6 text-center">Cargando…</p>
        ) : null}

        {!loading && error ? (
          <p className="text-sm text-destructive py-6 text-center">{error}</p>
        ) : null}

        {!loading && !error && sucDestinoId === null ? (
          <p className="text-sm text-foreground py-6 text-center">
            Seleccioná una sucursal destino.
          </p>
        ) : null}

        {!loading &&
        !error &&
        sucDestinoId !== null &&
        items.length === 0 ? (
          <p className="text-sm text-foreground py-6 text-center">
            No hay transferencias pendientes hacia esta sucursal.
          </p>
        ) : null}

        {!loading && !error && items.length > 0 ? (
          <Table variant="compact" className="tabla-recepcion-pedido">
            <TableHeader>
              <TableRow className="hover:bg-transparent">
                <TableHead className="w-[20%]">COD. TIENDA</TableHead>
                <TableHead className="w-[48%]">DESCRIPCIÓN TIENDA</TableHead>
                <TableHead className="w-[18%] text-center">
                  CANTIDAD A TRANSFERIR
                </TableHead>
                <TableHead className="w-[14%] text-center">
                  <Check className="mx-auto h-4 w-4" aria-hidden />
                  <span className="sr-only">OK</span>
                </TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {items.map((item) => {
                const ok = okPorCodTienda[item.codTienda] === true;
                return (
                  <TableRow
                    key={item.codTienda}
                    className={cn(
                      "transition-colors duration-100",
                      ok
                        ? "recepcion-fila-verificada cursor-not-allowed"
                        : "recepcion-fila-pendiente"
                    )}
                  >
                    <TableCell className="celda-datos">{item.codTienda}</TableCell>
                    <TableCell className="celda-datos">
                      {item.descripcionTienda}
                    </TableCell>
                    <TableCell className="celda-datos text-center tabular-nums">
                      {fmtNumero(item.cantidad)}
                    </TableCell>
                    <TableCell className="celda-datos celda-datos--accion-relleno-fila">
                      <div className={TABLE_ROW_CELL_ICON_ACTIONS_FLEX_CLASS}>
                        <Button
                          type="button"
                          variant="ghost"
                          size="icon"
                          onClick={() => handleOkItem(item.codTienda)}
                          disabled={ok || isPending}
                          className={TABLE_ROW_ICON_BUTTON_FILLED_BRAND_CLASS}
                          aria-label="OK"
                          title="OK"
                        >
                          <Check
                            className={TABLE_ROW_ACTION_ICON_CLASS}
                            aria-hidden
                          />
                        </Button>
                      </div>
                    </TableCell>
                  </TableRow>
                );
              })}
            </TableBody>
          </Table>
        ) : null}
      </AppModal>
    </Dialog>
  );
}
