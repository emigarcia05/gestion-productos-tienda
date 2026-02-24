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

const CANTIDADES_RAPIDAS = [1, 2, 3, 4, 5, 6, 12, 15, 50];

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
  const [otraCantidad, setOtraCantidad] = useState("");

  useEffect(() => {
    if (open && producto) setOtraCantidad("");
  }, [open, producto]);

  const cantidadFinal =
    otraCantidad.trim() !== ""
      ? Math.max(0, parseInt(otraCantidad, 10) || 0)
      : 1;

  function guardar(cant: number) {
    if (cant < 1) return;
    onConfirmar(cant);
    onOpenChange(false);
  }

  if (!producto) return null;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md text-center">
        <DialogHeader>
          <DialogTitle className="text-base text-center text-accent2">Agregar al pedido</DialogTitle>
        </DialogHeader>

        <div className="space-y-4 py-2">
          <div>
            <p className="text-xs text-muted-foreground mb-1">Descripción</p>
            <p className="text-sm font-medium text-foreground">
              {producto.descripcion}
            </p>
          </div>

          <p className="text-sm font-medium">¿Cuántas unidades desea pedir?</p>

          {/* Cantidades predeterminadas en filas de 3 — al hacer clic se guarda y cierra */}
          <div className="grid grid-cols-3 gap-2 justify-items-center max-w-[12rem] mx-auto">
            {CANTIDADES_RAPIDAS.map((n) => (
              <Button
                key={n}
                type="button"
                variant="outline"
                size="sm"
                className="w-full min-w-9"
                onClick={() => guardar(n)}
              >
                {n}
              </Button>
            ))}
          </div>

          {/* Cantidad manual: input sin flechas + botón Agregar */}
          <div className="flex items-center justify-center gap-2 flex-wrap">
            <span className="text-sm text-muted-foreground whitespace-nowrap">
              Otra cantidad:
            </span>
            <Input
              type="text"
              inputMode="numeric"
              pattern="[0-9]*"
              placeholder="—"
              value={otraCantidad}
              onChange={(e) => setOtraCantidad(e.target.value.replace(/\D/g, "").slice(0, 5))}
              onKeyDown={(e) => {
                if (e.key === "Enter" && otraCantidad.trim() !== "" && cantidadFinal >= 1)
                  guardar(cantidadFinal);
              }}
              className="w-20"
            />
            <Button
              onClick={() => guardar(cantidadFinal)}
              disabled={otraCantidad.trim() === "" || cantidadFinal < 1}
            >
              Agregar
            </Button>
          </div>
        </div>

        <DialogFooter className="gap-3 justify-center">
          <Button variant="outline" onClick={() => onOpenChange(false)}>
            Cancelar
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
