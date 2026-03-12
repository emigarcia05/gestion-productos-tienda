"use client";

import { useState, useEffect, useRef } from "react";
import { toast } from "sonner";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
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
      <DialogContent className="max-w-2xl max-h-[85vh] flex flex-col gap-0 p-0 overflow-hidden">
        <DialogHeader className="shrink-0 px-6 pt-6 pb-2">
          <DialogTitle>Elegir producto de referencia</DialogTitle>
        </DialogHeader>
        <p className="text-sm text-muted-foreground px-6">{labelCompleto}</p>
        <div className="flex-1 min-h-0 overflow-y-auto px-6 py-4 space-y-3">
          <div className="flex flex-col gap-2">
            <Select
              value={proveedorId || "none"}
              onValueChange={(v) => setProveedorId(v === "none" ? "" : v)}
            >
              <SelectTrigger className="w-full">
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
            <Input
              value={q}
              onChange={(e) => setQ(e.target.value)}
              placeholder="Buscar por descripción o código..."
              className="w-full"
            />
          </div>
          <div className="border rounded-md overflow-hidden max-h-48 overflow-y-auto">
            {loading ? (
              <div className="py-8 text-center text-sm text-muted-foreground">Cargando…</div>
            ) : rows.length === 0 ? (
              <div className="py-8 text-center text-sm text-muted-foreground">
                Aplicá filtros para ver productos.
              </div>
            ) : (
              <Table variant="compact">
                <TableHeader>
                  <TableRow className="hover:bg-transparent">
                    <TableHead className="w-24">Proveedor</TableHead>
                    <TableHead>Descripción</TableHead>
                    <TableHead className="w-28 text-right">Px final</TableHead>
                  </TableRow>
                </TableHeader>
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
                        <TableCell className="py-1.5">
                          <Badge variant="secondary" className="font-mono text-xs">
                            {row.proveedor.prefijo}
                          </Badge>
                        </TableCell>
                        <TableCell className="py-1.5 truncate max-w-0" title={row.descripcionProveedor}>
                          {row.descripcionProveedor}
                        </TableCell>
                        <TableCell className="py-1.5 text-right tabular-nums">
                          {row.pxCompraFinal != null
                            ? `$${fmtPrecio(row.pxCompraFinal)}`
                            : "—"}
                        </TableCell>
                      </TableRow>
                    );
                  })}
                </TableBody>
              </Table>
            )}
          </div>
          {selectedRow != null && selectedRow.pxCompraFinal != null && (
            <Button
              type="button"
              size="sm"
              onClick={handleUsar}
              disabled={pending}
            >
              Usar como referencia (${fmtPrecio(selectedRow.pxCompraFinal)})
            </Button>
          )}
        </div>
        <div className="shrink-0 flex justify-end px-6 py-4 border-t">
          <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>
            Cancelar
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}
