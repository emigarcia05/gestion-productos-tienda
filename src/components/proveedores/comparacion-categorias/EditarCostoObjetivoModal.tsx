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
import MontoArInput from "@/components/shared/MontoArInput";
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
import { TableEmptyState } from "@/components/shared/TableEmptyState";
import { cn } from "@/lib/utils";
import {
  montoArNormalizedStringToCents,
  montoArNormalizedStringToPesosNumber,
} from "@/lib/montoArMask";

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
  const [valorNorm, setValorNorm] = useState("");
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
    setValorNorm(valorActual != null ? String(valorActual) : "");
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
      const cents = montoArNormalizedStringToCents(valorNorm);
      const num = cents === 0 ? null : montoArNormalizedStringToPesosNumber(valorNorm);
      if (num != null && (Number.isNaN(num) || num < 0)) {
        toast.error("Ingresá un número válido mayor o igual a 0.");
        return;
      }
      const res = await updatePresentacionAction(presentacionId, {
        costoCompraObjetivo: num,
        idProductoReferencia: null,
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
    if (selectedRow == null || selectedRow.pxCompraFinalSinIva == null) return;
    setPendingDesdeLista(true);
    try {
      const res = await updatePresentacionAction(presentacionId, {
        costoCompraObjetivo: null,
        idProductoReferencia: selectedRow.id,
      });
      if (!res.ok) {
        toast.error(res.error ?? "Error al guardar.");
        return;
      }
      toast.success(`Costo objetivo definido: $${fmtPrecio(selectedRow.pxCompraFinalSinIva)}`);
      onSaved(selectedRow.pxCompraFinalSinIva);
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
                1. MANUAL
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
                2. DESDE LISTA DE PRECIOS
              </button>
            </div>

            {modo === "manual" && (
              <div className="grid gap-2">
                <Label htmlFor="costo-objetivo">COSTO COMPRA OBJETIVO</Label>
                <MontoArInput
                  id="costo-objetivo"
                  valueNormalized={valorNorm}
                  onValueNormalizedChange={setValorNorm}
                  aria-label="Costo compra objetivo en pesos"
                />
                <p className="text-xs text-muted-foreground uppercase tracking-wide">
                  DEJÁ EN $0,00 PARA QUITAR EL OBJETIVO.
                </p>
              </div>
            )}

            {modo === "lista" && (
              <div className="space-y-3">
                <p className="text-xs text-muted-foreground uppercase tracking-wide">
                  FILTRÁ POR PROVEEDOR Y/O DESCRIPCIÓN; ELEGÍ UN PRODUCTO Y USÁ SU PRECIO FINAL DE COMPRA COMO COSTO OBJETIVO.
                </p>
                <div className="flex flex-col gap-2">
                  <Select
                    value={proveedorId || "none"}
                    onValueChange={(v) => setProveedorId(v === "none" ? "" : v)}
                  >
                    <SelectTrigger className="w-full">
                      <SelectValue placeholder="PROVEEDOR" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="none">TODOS LOS PROVEEDORES</SelectItem>
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
                    placeholder="BUSCAR POR DESCRIPCIÓN O CÓDIGO..."
                    className="w-full"
                  />
                </div>
                <div className="border rounded-md overflow-hidden max-h-48 overflow-y-auto">
                  {loadingLista ? (
                    <TableEmptyState
                      message="CARGANDO…"
                      placement="tableCell"
                      textSize="sm"
                      maxWidth="full"
                    />
                  ) : rows.length === 0 ? (
                    <TableEmptyState
                      message="APLICÁ FILTROS PARA VER PRODUCTOS."
                      placement="tableCell"
                      textSize="sm"
                      maxWidth="full"
                    />
                  ) : (
                    <Table variant="compact">
                      <TableHeader>
                        <TableRow className="hover:bg-transparent">
                          <TableHead className="w-24">PROVEEDOR</TableHead>
                          <TableHead>DESCRIPCIÓN</TableHead>
                          <TableHead className="w-28 text-right">PX. FINAL</TableHead>
                        </TableRow>
                      </TableHeader>
                      <TableBody>
                        {rows.map((row) => {
                          const isSelected = selectedRow?.id === row.id;
                          const hasPx = row.pxCompraFinalSinIva != null;
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
                                {row.pxCompraFinalSinIva != null
                                  ? `$${fmtPrecio(row.pxCompraFinalSinIva)}`
                                  : "—"}
                              </TableCell>
                            </TableRow>
                          );
                        })}
                      </TableBody>
                    </Table>
                  )}
                </div>
                {selectedRow != null && selectedRow.pxCompraFinalSinIva != null && (
                  <Button
                    type="button"
                    size="sm"
                    onClick={handleUsarDesdeLista}
                    disabled={pendingDesdeLista}
                  >
                    Usar este costo (${fmtPrecio(selectedRow.pxCompraFinalSinIva)}) como objetivo
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
