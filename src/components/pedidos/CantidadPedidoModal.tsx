"use client";

import { useState, useEffect } from "react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";

const CANTIDADES_RAPIDAS = [1, 2, 3, 4, 5, 6, 12, 50];

export interface ProductoParaPedido {
  id: string;
  descripcion: string;
  codExt?: string;
  proveedor?: { nombre: string; sufijo: string };
}

interface Props {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  producto: ProductoParaPedido | null;
  onConfirmar: (cantidad: number) => void;
}

export default function CantidadPedidoModal({
  open,
  onOpenChange,
  producto,
  onConfirmar,
}: Props) {
  const [cantidad, setCantidad] = useState(1);
  const [otraCantidad, setOtraCantidad] = useState("");

  useEffect(() => {
    if (open && producto) {
      setCantidad(1);
      setOtraCantidad("");
    }
  }, [open, producto]);

  const cantidadFinal =
    otraCantidad.trim() !== ""
      ? Math.max(0, parseInt(otraCantidad, 10) || 0)
      : cantidad;

  function handleConfirmar() {
    if (cantidadFinal < 1) return;
    onConfirmar(cantidadFinal);
    onOpenChange(false);
  }

  if (!producto) return null;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle className="text-base">Agregar al pedido</DialogTitle>
        </DialogHeader>

        <div className="space-y-4 py-2">
          <div>
            <p className="text-xs text-muted-foreground mb-1">Descripción</p>
            <p className="text-sm font-medium text-foreground">
              {producto.descripcion}
            </p>
          </div>

          <p className="text-sm font-medium">¿Cuántas unidades desea pedir?</p>

          <div className="flex flex-wrap gap-2">
            {CANTIDADES_RAPIDAS.map((n) => (
              <Button
                key={n}
                type="button"
                variant={cantidad === n && !otraCantidad ? "default" : "outline"}
                size="sm"
                className="min-w-9"
                onClick={() => {
                  setCantidad(n);
                  setOtraCantidad("");
                }}
              >
                {n}
              </Button>
            ))}
          </div>

          <div className="flex items-center gap-2">
            <span className="text-sm text-muted-foreground whitespace-nowrap">
              Otra cantidad:
            </span>
            <Input
              type="number"
              min={1}
              placeholder="—"
              value={otraCantidad}
              onChange={(e) => setOtraCantidad(e.target.value.replace(/\D/g, "").slice(0, 5))}
              className="w-24"
            />
          </div>
        </div>

        <DialogFooter className="gap-2 sm:gap-0">
          <Button variant="outline" onClick={() => onOpenChange(false)}>
            Cancelar
          </Button>
          <Button onClick={handleConfirmar} disabled={cantidadFinal < 1}>
            Agregar
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
