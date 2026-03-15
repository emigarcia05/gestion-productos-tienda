"use client";

import { useState, useEffect, useCallback } from "react";
import { Search, Check } from "lucide-react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { getProductosReposicionSelector, type ItemSelectorReposicion } from "@/actions/reposicion";
import type { SucursalReposicion } from "@/actions/reposicion";

interface Props {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  sucursal: SucursalReposicion;
  onConfirmar: (seleccionados: ItemSelectorReposicion[]) => void;
  excludeIds?: string[];
}

export default function SelectorProductosReposicionModal({
  open,
  onOpenChange,
  sucursal,
  onConfirmar,
  excludeIds = [],
}: Props) {
  const [q, setQ] = useState("");
  const [debouncedQ, setDebouncedQ] = useState("");
  const [items, setItems] = useState<ItemSelectorReposicion[]>([]);
  const [loading, setLoading] = useState(false);
  const [selected, setSelected] = useState<Set<string>>(new Set());

  useEffect(() => {
    const t = setTimeout(() => setDebouncedQ(q), 300);
    return () => clearTimeout(t);
  }, [q]);

  const load = useCallback(async () => {
    setLoading(true);
    const list = await getProductosReposicionSelector(sucursal, debouncedQ);
    setItems(list);
    setLoading(false);
  }, [sucursal, debouncedQ]);

  useEffect(() => {
    if (open) load();
  }, [open, load]);

  const toggle = (item: ItemSelectorReposicion) => {
    const key = `${item.idListaTienda}:${item.codExt}`;
    if (excludeIds.includes(item.idListaTienda)) return;
    setSelected((prev) => {
      const next = new Set(prev);
      if (next.has(key)) next.delete(key);
      else next.add(key);
      return next;
    });
  };

  const handleConfirmar = () => {
    const list = items.filter((it) => selected.has(`${it.idListaTienda}:${it.codExt}`));
    onConfirmar(list);
    setSelected(new Set());
    setQ("");
    onOpenChange(false);
  };

  const handleCerrar = () => {
    setSelected(new Set());
    setQ("");
    onOpenChange(false);
  };

  return (
    <Dialog
      open={open}
      onOpenChange={(o) => {
        if (!o) {
          setSelected(new Set());
          setQ("");
        }
        onOpenChange(o);
      }}
    >
      <DialogContent className="max-w-2xl max-h-[85vh] flex flex-col bg-gris p-0 gap-0">
        <DialogHeader className="shrink-0 bg-primary px-6 py-4 rounded-t-lg">
          <DialogTitle className="text-primary-foreground font-semibold text-lg text-center">
            Seleccionar Productos
          </DialogTitle>
        </DialogHeader>
        <div className="flex flex-col gap-4 min-h-0 flex-1 px-6 py-4 overflow-auto">
          <div>
            <label className="text-sm font-medium text-foreground block mb-1">DESCRIPCIÓN</label>
            <div className="relative">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <Input
                type="text"
                placeholder="BUSCAR POR DESCRIPCIÓN..."
                value={q}
                onChange={(e) => setQ(e.target.value)}
                className="pl-9 input-filtro-unificado"
              />
            </div>
          </div>
          <div className="border border-border rounded-lg overflow-auto flex-1 min-h-0">
            <Table variant="compact">
              <TableHeader>
                <TableRow className="hover:bg-transparent bg-muted/50">
                  <TableHead className="w-12 text-xs"> </TableHead>
                  <TableHead className="text-xs">DESCRIPCIÓN</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {loading && (
                  <TableRow>
                    <TableCell colSpan={2} className="text-center text-muted-foreground py-8">
                      Cargando...
                    </TableCell>
                  </TableRow>
                )}
                {!loading && items.length === 0 && (
                  <TableRow>
                    <TableCell colSpan={2} className="text-center text-muted-foreground py-8">
                      Sin resultados
                    </TableCell>
                  </TableRow>
                )}
                {!loading &&
                  items.map((item) => {
                    const key = `${item.idListaTienda}:${item.codExt}`;
                    const isSelected = selected.has(key);
                    const disabled = excludeIds.includes(item.idListaTienda);
                    return (
                      <TableRow
                        key={key}
                        className={cn(
                          disabled && "opacity-50",
                          !disabled && "cursor-pointer hover:bg-muted/50"
                        )}
                        onClick={() => !disabled && toggle(item)}
                      >
                        <TableCell className="w-12 py-2">
                          <button
                            type="button"
                            className={cn(
                              "selector-cuadro inline-flex items-center justify-center rounded border-2 transition-colors",
                              isSelected && "selector-cuadro--selected"
                            )}
                            aria-label={isSelected ? "Deseleccionar" : "Seleccionar"}
                            aria-checked={isSelected}
                            role="checkbox"
                            onClick={(e) => {
                              e.stopPropagation();
                              if (!disabled) toggle(item);
                            }}
                          >
                            {isSelected ? <Check className="h-3 w-3 text-primary-foreground" /> : null}
                          </button>
                        </TableCell>
                        <TableCell className="text-xs py-2 text-left">
                          {item.descripcionTienda ?? "—"}
                        </TableCell>
                      </TableRow>
                    );
                  })}
              </TableBody>
            </Table>
          </div>
        </div>
        <div className="flex justify-end gap-2 pt-4 px-6 pb-4 border-t border-border shrink-0 bg-gris rounded-b-lg">
          <Button type="button" variant="outline" onClick={handleCerrar}>
            Cancelar
          </Button>
          <Button type="button" onClick={handleConfirmar}>
            Agregar
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}
