"use client";

import { useState, useEffect } from "react";
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
import { buscarProductosParaAsignarAction, asignarProductosAPresentacionAction } from "@/actions/comparacionCategorias";

interface Props {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  presentacionId: string;
  onSuccess: () => void;
}

interface ProductoOption {
  id: string;
  codExt: string;
  descripcion: string;
  label: string;
}

export default function AsignarProductosModal({
  open,
  onOpenChange,
  presentacionId,
  onSuccess,
}: Props) {
  const [busqueda, setBusqueda] = useState("");
  const [lista, setLista] = useState<ProductoOption[]>([]);
  const [loading, setLoading] = useState(false);
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());
  const [asignando, setAsignando] = useState(false);

  useEffect(() => {
    if (!open) return;
    setBusqueda("");
    setSelectedIds(new Set());
    setLista([]);
  }, [open]);

  const handleBuscar = async () => {
    setLoading(true);
    try {
      const res = await buscarProductosParaAsignarAction(busqueda.trim());
      if (res.ok && res.data) {
        setLista(res.data);
      } else {
        setLista([]);
      }
    } finally {
      setLoading(false);
    }
  };

  const toggleSelect = (id: string) => {
    setSelectedIds((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  };

  const toggleSelectAll = () => {
    if (selectedIds.size === lista.length) {
      setSelectedIds(new Set());
    } else {
      setSelectedIds(new Set(lista.map((p) => p.id)));
    }
  };

  const handleAsignar = async () => {
    if (selectedIds.size === 0) {
      toast.error("Seleccioná al menos un producto.");
      return;
    }
    setAsignando(true);
    try {
      const res = await asignarProductosAPresentacionAction(presentacionId, Array.from(selectedIds));
      if (!res.ok) {
        toast.error(res.error ?? "Error al asignar.");
        return;
      }
      toast.success(`Se asignaron ${res.count} productos.`);
      onSuccess();
      onOpenChange(false);
    } finally {
      setAsignando(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl max-h-[85vh] flex flex-col">
        <DialogHeader>
          <DialogTitle>Asignar productos a esta categoría</DialogTitle>
        </DialogHeader>
        <div className="grid gap-2">
          <Label htmlFor="buscar-prod">Buscar por código o descripción</Label>
          <div className="flex gap-2">
            <Input
              id="buscar-prod"
              value={busqueda}
              onChange={(e) => setBusqueda(e.target.value)}
              onKeyDown={(e) => e.key === "Enter" && handleBuscar()}
              placeholder="Escribí y presioná Enter"
            />
            <Button type="button" variant="secondary" onClick={handleBuscar} disabled={loading}>
              {loading ? "Buscando…" : "Buscar"}
            </Button>
          </div>
        </div>
        <div className="flex-1 min-h-0 overflow-auto border rounded-md">
          {lista.length === 0 && !loading && (
            <p className="text-sm text-muted-foreground p-4">
              Ejecutá una búsqueda para ver productos de la lista de precios (máx. 500 resultados).
            </p>
          )}
          {lista.length > 0 && (
            <div className="p-2 space-y-1">
              <label className="flex items-center gap-2 text-sm font-medium cursor-pointer">
                <input
                  type="checkbox"
                  checked={selectedIds.size === lista.length}
                  onChange={toggleSelectAll}
                  className="rounded border-input"
                />
                Seleccionar todos ({lista.length})
              </label>
              <ul className="space-y-0.5 max-h-60 overflow-y-auto">
                {lista.map((p) => (
                  <li key={p.id}>
                    <label className="flex items-center gap-2 text-sm cursor-pointer hover:bg-muted/50 rounded px-2 py-1">
                      <input
                        type="checkbox"
                        checked={selectedIds.has(p.id)}
                        onChange={() => toggleSelect(p.id)}
                        className="rounded border-input"
                      />
                      <span className="truncate">{p.label}</span>
                    </label>
                  </li>
                ))}
              </ul>
            </div>
          )}
        </div>
        <div className="flex justify-end gap-2 pt-2 border-t">
          <Button type="button" variant="outline" onClick={() => onOpenChange(false)} disabled={asignando}>
            Cancelar
          </Button>
          <Button
            type="button"
            onClick={handleAsignar}
            disabled={asignando || selectedIds.size === 0}
          >
            {asignando ? "Asignando…" : `Asignar ${selectedIds.size} producto(s)`}
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}
