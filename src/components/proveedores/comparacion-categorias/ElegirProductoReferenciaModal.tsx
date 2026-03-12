"use client";

import { useState, useEffect, useRef } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
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
import { Badge } from "@/components/ui/badge";
import { LimpiarFiltrosButton } from "@/components/FilterBar";
import { buscarProductosParaAsignarAction } from "@/actions/comparacionCategorias";
import { getProveedores } from "@/actions/vinculos";
import { fmtPrecio } from "@/lib/format";
import type { ProductoProveedorParaVincular } from "@/services/listaPrecios.service";
import { cn } from "@/lib/utils";

type ProveedorOption = { id: string; nombre: string; prefijo: string };

interface Props {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  presentacionId: string;
  labelCompleto: string;
  onElegido: (pxCompraFinal: number) => void;
}

export default function ElegirProductoReferenciaModal({
  open,
  onOpenChange,
  presentacionId,
  labelCompleto,
  onElegido,
}: Props) {
  const [proveedores, setProveedores] = useState<ProveedorOption[]>([]);
  const [proveedorId, setProveedorId] = useState("");
  const [q, setQ] = useState("");
  const [rows, setRows] = useState<ProductoProveedorParaVincular[]>([]);
  const [loading, setLoading] = useState(false);
  const [selectedRow, setSelectedRow] = useState<ProductoProveedorParaVincular | null>(null);
  const [pending, setPending] = useState(false);
  const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const hayFiltros = (proveedorId && proveedorId !== "none") || q.trim() !== "";

  const limpiarFiltros = () => {
    setProveedorId("");
    setQ("");
  };

  useEffect(() => {
    if (!open) return;
    getProveedores().then(setProveedores);
    setSelectedRow(null);
  }, [open]);

  useEffect(() => {
    if (!open) return;
    if (debounceRef.current) clearTimeout(debounceRef.current);
    setLoading(true);
    const run = async () => {
      const result = await buscarProductosParaAsignarAction(
        proveedorId || undefined,
        q.trim() || undefined
      );
      setLoading(false);
      if (result.ok && result.data) setRows(result.data);
      else setRows([]);
    };
    debounceRef.current = setTimeout(run, 300);
    return () => {
      if (debounceRef.current) clearTimeout(debounceRef.current);
    };
  }, [open, proveedorId, q]);

  const handleUsar = () => {
    if (selectedRow == null || selectedRow.pxCompraFinal == null) return;
    setPending(true);
    onElegido(selectedRow.pxCompraFinal);
    setPending(false);
    onOpenChange(false);
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent
        className={cn(
          "modal-app max-w-2xl w-[calc(100%-2rem)] max-h-[90vh] flex flex-col gap-0 p-0 overflow-hidden"
        )}
      >
        <DialogHeader className="modal-app__header shrink-0">
          <DialogTitle className="modal-app__title">Elegir producto de referencia</DialogTitle>
        </DialogHeader>

        <div className="modal-app__content flex-1 min-h-0 flex flex-col">
          <div className="modal-app__body flex flex-col flex-1 min-h-0 overflow-hidden px-6 pt-4 pb-0">
            <p className="text-sm text-muted-foreground shrink-0 mb-3">{labelCompleto}</p>
            <div className="shrink-0 w-full flex flex-col gap-2 pb-3 border-b border-border">
              <Select
                value={proveedorId || "none"}
                onValueChange={(v) => setProveedorId(v === "none" ? "" : v)}
              >
                <SelectTrigger className="input-filtro-unificado w-full">
                  <SelectValue placeholder="Proveedor" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="none">Todos los proveedores</SelectItem>
                  {proveedores.map((p) => (
                    <SelectItem key={p.id} value={p.id}>
                      [{p.prefijo}] {p.nombre}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
              <div className="w-full flex items-center gap-2">
                <Input
                  value={q}
                  onChange={(e) => setQ(e.target.value)}
                  placeholder="Buscar por descripción o código..."
                  className="input-filtro-unificado flex-1 min-w-0"
                />
                <LimpiarFiltrosButton visible={!!hayFiltros} onClick={limpiarFiltros} />
              </div>
            </div>
            <div className="flex-1 min-h-0 flex flex-col pt-3 pb-3 overflow-hidden">
              {loading ? (
                <div className="flex items-center justify-center py-12 text-muted-foreground">
                  Cargando…
                </div>
              ) : rows.length === 0 ? (
                <div className="py-12 text-center text-sm text-muted-foreground">
                  Aplicá filtros para ver productos.
                </div>
              ) : (
                <>
                  <div className="shrink-0 overflow-hidden">
                    <Table variant="compact" className="table-fixed w-full">
                      <TableHeader>
                        <TableRow className="hover:bg-transparent border-b-0">
                          <TableHead className="py-2.5 px-3 text-xs w-24 text-center bg-primary text-primary-foreground font-bold">
                            Proveedor
                          </TableHead>
                          <TableHead className="py-2.5 px-3 text-xs min-w-0 bg-primary text-primary-foreground font-bold">
                            Descripción
                          </TableHead>
                          <TableHead className="py-2.5 px-3 text-xs w-28 text-right bg-primary text-primary-foreground font-bold">
                            Px final
                          </TableHead>
                        </TableRow>
                      </TableHeader>
                    </Table>
                  </div>
                  <div className="flex-1 min-h-0 overflow-y-auto border-b border-border">
                    <Table variant="compact" className="table-fixed w-full">
                      <TableBody>
                        {rows.map((row) => {
                          const isSelected = selectedRow?.id === row.id;
                          const hasPx = row.pxCompraFinal != null;
                          return (
                            <TableRow
                              key={row.id}
                              className={cn(
                                "cursor-pointer",
                                isSelected && "bg-primary/10",
                                !hasPx && "opacity-60"
                              )}
                              onClick={() => hasPx && setSelectedRow(isSelected ? null : row)}
                            >
                              <TableCell className="py-1.5 w-24 text-center">
                                <Badge variant="secondary" className="font-mono text-xs">
                                  {row.proveedor.prefijo}
                                </Badge>
                              </TableCell>
                              <TableCell className="py-1.5 min-w-0 truncate" title={row.descripcionProveedor}>
                                {row.descripcionProveedor}
                              </TableCell>
                              <TableCell className="py-1.5 w-28 text-right tabular-nums">
                                {row.pxCompraFinal != null
                                  ? `$${fmtPrecio(row.pxCompraFinal)}`
                                  : "—"}
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
            {selectedRow != null && selectedRow.pxCompraFinal != null && (
              <div className="shrink-0 pt-3">
                <Button
                  type="button"
                  size="sm"
                  onClick={handleUsar}
                  disabled={pending}
                >
                  Usar como referencia (${fmtPrecio(selectedRow.pxCompraFinal)})
                </Button>
              </div>
            )}
          </div>

          <div className="modal-app__footer shrink-0 justify-end">
            <Button type="button" variant="outline" size="sm" onClick={() => onOpenChange(false)}>
              Cancelar
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
