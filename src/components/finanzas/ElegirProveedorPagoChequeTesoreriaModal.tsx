"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
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

interface Props {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  cheque: FinTesoreriaChequeItem | null;
  onSeleccion: (payload: { chequeId: string; proveedorId: string }) => void | Promise<void>;
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
      return;
    }
    void cargarLista();
  }, [open, cargarLista]);

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
              placeholder="BUSCAR POR NOMBRE O PREFIJO…"
              aria-label="Buscar proveedor de mercadería"
              className="h-9"
            />
          </label>
          <div className="contenedor-tabla-gestion max-h-[min(22rem,45vh)] min-h-[10rem] w-full min-w-0 overflow-hidden">
            <Table variant="compact" scrollX={false} className="w-full">
              <TableHeader>
                <TableRow className="hover:bg-transparent">
                  <TableHead className="min-w-0">PROVEEDOR</TableHead>
                  <TableHead className="w-[7rem] whitespace-nowrap">PREF.</TableHead>
                  <TableHead className="w-[9rem] text-center">ACCIÓN</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {cargando ? (
                  <TableRow>
                    <TableCell colSpan={3} className="celda-datos text-center text-muted-foreground">
                      Cargando…
                    </TableCell>
                  </TableRow>
                ) : filas.length === 0 ? (
                  <EmptyTableRow
                    colSpan={3}
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
                      <TableCell className="celda-datos whitespace-nowrap text-muted-foreground">
                        {p.prefijo ?? "—"}
                      </TableCell>
                      <TableCell className="celda-datos text-center">
                        <Button
                          type="button"
                          size="sm"
                          disabled={!!enviandoId}
                          className="h-8"
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
                          Seleccionar
                        </Button>
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
