"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { toast } from "sonner";
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
import { listarProveedoresMercaderiaParaPagoChequeTesoreriaAction } from "@/actions/finTesoreriaCheques";
import type { FinTesoreriaChequeItem, ProveedorMercaderiaChequeTesoreriaItem } from "@/services/finTesoreriaCheques.service";
import { fmtPrecio } from "@/lib/format";
import { cn } from "@/lib/utils";
import { Check, CalendarDays, Loader2 } from "lucide-react";
import {
  TABLE_ROW_ACTION_ICON_CLASS,
  TABLE_ROW_CELL_ICON_ACTIONS_FLEX_CLASS,
  TABLE_ROW_ICON_BUTTON_FILLED_BRAND_CLASS,
} from "@/lib/ui-classes";
import { dateToIsoYmdArgentina } from "@/lib/fechaArgentina";

interface Props {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  cheque: FinTesoreriaChequeItem | null;
  onSeleccion: (
    payload: { chequeId: string; proveedorId: string; fechaTransferencia: string }
  ) => void | Promise<void>;
}

function abrirSelectorFechaNativo(el: HTMLInputElement | null) {
  if (!el) return;
  try {
    void el.showPicker?.();
  } catch {
    el.click();
  }
}

export default function ElegirProveedorPagoChequeTesoreriaModal({
  open,
  onOpenChange,
  cheque,
  onSeleccion,
}: Props) {
  const [cargando, setCargando] = useState(false);
  const [proveedores, setProveedores] = useState<ProveedorMercaderiaChequeTesoreriaItem[]>([]);
  const [busqueda, setBusqueda] = useState("");
  const [enviandoId, setEnviandoId] = useState<string | null>(null);
  const [fechaTransferenciaIso, setFechaTransferenciaIso] = useState("");
  const fechaTransferenciaPickerRef = useRef<HTMLInputElement>(null);

  const cargarLista = useCallback(async () => {
    setCargando(true);
    try {
      const res = await listarProveedoresMercaderiaParaPagoChequeTesoreriaAction();
      if (!res.ok) {
        toast.error(res.error ?? "No se pudo cargar la lista de proveedores.");
        setProveedores([]);
        return;
      }
      setProveedores(res.data ?? []);
    } finally {
      setCargando(false);
    }
  }, []);

  useEffect(() => {
    if (!open) {
      setBusqueda("");
      setProveedores([]);
      setEnviandoId(null);
      setFechaTransferenciaIso("");
      return;
    }
    setFechaTransferenciaIso(dateToIsoYmdArgentina(new Date()));
    void cargarLista();
  }, [open, cargarLista]);

  const abrirPickerTransferencia = useCallback(() => {
    if (!cargando && !enviandoId) abrirSelectorFechaNativo(fechaTransferenciaPickerRef.current);
  }, [cargando, enviandoId]);

  const filas = useMemo(() => {
    const t = busqueda.trim().toLocaleUpperCase("es-AR");
    if (!t) return proveedores;
    return proveedores.filter(
      (p) =>
        p.nombre.toLocaleUpperCase("es-AR").includes(t) ||
        (p.prefijo != null && p.prefijo.toLocaleUpperCase("es-AR").includes(t))
    );
  }, [proveedores, busqueda]);

  return (
    <Dialog open={open} onOpenChange={(next) => (!enviandoId ? onOpenChange(next) : undefined)}>
      <AppModal
        title="Proveedores De Mercadería"
        size="lg"
        scrollBody
        actions={
          <div className="flex w-full justify-end">
            <Button type="button" variant="outline" disabled={!!enviandoId} onClick={() => onOpenChange(false)}>
              Cancelar
            </Button>
          </div>
        }
      >
        <div className="flex flex-col gap-3">
          {cheque ? (
            <div className="rounded-md border border-border bg-muted/30 px-3 py-2 text-sm text-foreground">
              <p className="font-semibold tabular-nums">${fmtPrecio(cheque.monto)}</p>
              <p className="truncate text-muted-foreground" title={cheque.emisor}>
                {cheque.emisor}
              </p>
            </div>
          ) : null}
          <label className="flex flex-col gap-1">
            <span className="text-xs font-semibold uppercase tracking-[0.06em] text-muted-foreground">
              Buscar
            </span>
            <Input
              value={busqueda}
              onChange={(e) => setBusqueda(e.target.value.toLocaleUpperCase("es-AR"))}
              disabled={cargando || !!enviandoId}
              placeholder="BUSCAR POR NOMBRE…"
              aria-label="Buscar proveedor de mercadería"
              className="h-9"
            />
          </label>
          <div className="contenedor-tabla-gestion max-h-[min(22rem,45vh)] min-h-[10rem] w-full min-w-0 overflow-hidden">
            <Table variant="compact" scrollX={false} className="table-fixed w-full">
              <colgroup>
                <col className="min-w-0" />
                <col className="w-[3.25rem]" />
              </colgroup>
              <TableHeader>
                <TableRow className="hover:bg-transparent">
                  <TableHead className="min-w-0">PROVEEDOR</TableHead>
                  <TableHead className="w-[3.25rem] text-center tabla-bloque-secundario-head-divider">
                    ACCIONES
                  </TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {cargando ? (
                  <TableRow>
                    <TableCell colSpan={2} className="celda-datos text-center text-muted-foreground">
                      Cargando…
                    </TableCell>
                  </TableRow>
                ) : filas.length === 0 ? (
                  <EmptyTableRow
                    colSpan={2}
                    message={
                      proveedores.length === 0
                        ? "No hay proveedores de mercadería."
                        : "Ningún proveedor coincide con la búsqueda."
                    }
                  />
                ) : (
                  filas.map((p) => (
                    <TableRow key={p.id} className="h-10 min-h-10 max-h-10">
                      <TableCell className={cn("celda-datos min-w-0")} title={p.nombre}>
                        <span className="celda-destacado block truncate">{p.nombre}</span>
                      </TableCell>
                      <TableCell
                        className={cn(
                          "celda-datos celda-datos--accion-relleno-fila tabla-bloque-secundario-cell-divider min-w-0"
                        )}
                      >
                        <div className={cn(TABLE_ROW_CELL_ICON_ACTIONS_FLEX_CLASS, "flex justify-center")}>
                          <Button
                            type="button"
                            variant="ghost"
                            size="icon"
                            disabled={!!enviandoId || !cheque}
                            className={TABLE_ROW_ICON_BUTTON_FILLED_BRAND_CLASS}
                            aria-label={`Seleccionar proveedor ${p.nombre}`}
                            title="Seleccionar"
                            onClick={async () => {
                              if (!cheque) return;
                              setEnviandoId(p.id);
                              try {
                                await onSeleccion({ chequeId: cheque.id, proveedorId: p.id });
                              } finally {
                                setEnviandoId(null);
                              }
                            }}
                          >
                            {enviandoId === p.id ? (
                              <Loader2 className={cn(TABLE_ROW_ACTION_ICON_CLASS, "animate-spin")} aria-hidden />
                            ) : (
                              <Check className={TABLE_ROW_ACTION_ICON_CLASS} aria-hidden />
                            )}
                          </Button>
                        </div>
                      </TableCell>
                    </TableRow>
                  ))
                )}
              </TableBody>
            </Table>
          </div>
        </div>
      </AppModal>
    </Dialog>
  );
}
