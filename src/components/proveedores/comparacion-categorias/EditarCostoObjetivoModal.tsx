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
import { Label } from "@/components/ui/label";
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
import { updatePresentacionAction, buscarProductosParaAsignarAction } from "@/actions/comparacionCategorias";
import { getProveedores } from "@/actions/vinculos";
import { fmtPrecio } from "@/lib/format";
import type { ProductoProveedorParaVincular } from "@/services/listaPrecios.service";
import { cn } from "@/lib/utils";

type ProveedorOption = { id: string; nombre: string; prefijo: string };

interface Props {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  presentacionId: string;
  valorActual: number | null;
  labelCompleto: string;
  onSaved: (valor: number | null) => void;
}

export default function EditarCostoObjetivoModal({
  open,
  onOpenChange,
  presentacionId,
  valorActual,
  labelCompleto,
  onSaved,
}: Props) {
  const [valor, setValor] = useState("");
  const [pending, setPending] = useState(false);

  const [modo, setModo] = useState<"manual" | "lista">("manual");
  const [proveedores, setProveedores] = useState<ProveedorOption[]>([]);
  const [proveedorId, setProveedorId] = useState("");
  const [q, setQ] = useState("");
  const [rows, setRows] = useState<ProductoProveedorParaVincular[]>([]);
  const [loadingLista, setLoadingLista] = useState(false);
  const [selectedRow, setSelectedRow] = useState<ProductoProveedorParaVincular | null>(null);
  const [pendingDesdeLista, setPendingDesdeLista] = useState(false);
  const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => {
    setValor(valorActual != null ? String(valorActual) : "");
  }, [open, valorActual]);

  useEffect(() => {
    if (!open) return;
    getProveedores().then(setProveedores);
  }, [open]);

  useEffect(() => {
    if (!open || modo !== "lista") return;
    if (debounceRef.current) clearTimeout(debounceRef.current);
    setLoadingLista(true);
    const run = async () => {
      const result = await buscarProductosParaAsignarAction(
        proveedorId || undefined,
        q.trim() || undefined
      );
      setLoadingLista(false);
      if (result.ok && result.data) setRows(result.data);
      else setRows([]);
    };
    debounceRef.current = setTimeout(run, 300);
    return () => {
      if (debounceRef.current) clearTimeout(debounceRef.current);
    };
  }, [open, modo, proveedorId, q]);

  useEffect(() => {
    if (!open) setSelectedRow(null);
  }, [open]);

  const handleGuardar = async () => {
    setPending(true);
    try {
      const num = valor.trim() === "" ? null : parseFloat(valor.replace(",", "."));
      if (valor.trim() !== "" && (Number.isNaN(num) || num! < 0)) {
        toast.error("Ingresá un número válido mayor o igual a 0.");
        return;
      }
      const res = await updatePresentacionAction(presentacionId, {
        costoCompraObjetivo: num,
      });
      if (!res.ok) {
        toast.error(res.error ?? "Error al guardar.");
        return;
      }
      toast.success("Costo objetivo actualizado.");
      onSaved(num);
      onOpenChange(false);
    } finally {
      setPending(false);
    }
  };

  const handleUsarDesdeLista = async () => {
    if (selectedRow == null || selectedRow.pxCompraFinal == null) return;
    setPendingDesdeLista(true);
    try {
      const res = await updatePresentacionAction(presentacionId, {
        costoCompraObjetivo: selectedRow.pxCompraFinal,
      });
      if (!res.ok) {
        toast.error(res.error ?? "Error al guardar.");
        return;
      }
      toast.success(`Costo objetivo definido: $${fmtPrecio(selectedRow.pxCompraFinal)}`);
      onSaved(selectedRow.pxCompraFinal);
      onOpenChange(false);
    } finally {
      setPendingDesdeLista(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl max-h-[90vh] flex flex-col gap-0 p-0 overflow-hidden">
        <DialogHeader className="shrink-0 px-6 pt-6 pb-2">
          <DialogTitle>Costo Compra Objetivo</DialogTitle>
        </DialogHeader>
        <p className="text-sm text-muted-foreground px-6">{labelCompleto}</p>

        <div className="flex-1 min-h-0 overflow-y-auto px-6 py-4 space-y-6">
          {/* 1. Manual */}
          <div className="space-y-2">
            <div className="flex items-center gap-2">
              <button
                type="button"
                onClick={() => setModo("manual")}
                className={cn(
                  "text-sm font-medium",
                  modo === "manual" ? "text-primary" : "text-muted-foreground hover:text-foreground"
                )}
              >
                1. Manual
              </button>
              <span className="text-muted-foreground">|</span>
              <button
                type="button"
                onClick={() => setModo("lista")}
                className={cn(
                  "text-sm font-medium",
                  modo === "lista" ? "text-primary" : "text-muted-foreground hover:text-foreground"
                )}
              >
                2. Desde lista de precios
              </button>
            </div>

            {modo === "manual" && (
              <div className="grid gap-2">
                <Label htmlFor="costo-objetivo">Costo compra objetivo ($)</Label>
                <Input
                  id="costo-objetivo"
                  type="text"
                  inputMode="decimal"
                  value={valor}
                  onChange={(e) => setValor(e.target.value)}
                  placeholder="Dejar vacío para sin objetivo"
                />
              </div>
            )}

            {modo === "lista" && (
              <div className="space-y-3">
                <p className="text-xs text-muted-foreground">
                  Filtrá por proveedor y/o descripción; elegí un producto y usá su precio final de compra como costo objetivo.
                </p>
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
                  {loadingLista ? (
                    <div className="py-8 text-center text-sm text-muted-foreground">
                      Cargando…
                    </div>
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
                    onClick={handleUsarDesdeLista}
                    disabled={pendingDesdeLista}
                  >
                    Usar este costo (${fmtPrecio(selectedRow.pxCompraFinal)}) como objetivo
                  </Button>
                )}
              </div>
            )}
          </div>
        </div>

        <div className="shrink-0 flex justify-end gap-2 px-6 py-4 border-t">
          <Button type="button" variant="outline" onClick={() => onOpenChange(false)} disabled={pending || pendingDesdeLista}>
            Cancelar
          </Button>
          {modo === "manual" && (
            <Button type="button" onClick={handleGuardar} disabled={pending}>
              Guardar
            </Button>
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
}
