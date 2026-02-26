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

const CANTIDADES_FILA1 = [1, 2, 3, 4, 5];
const CANTIDADES_FILA2 = [6, 12, 24, 50];

export interface ProductoParaPedido {
  id: string;
  descripcion: string;
  codigoExterno?: string;
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

          {/* Contenedor fijo para alinear las 3 filas */}
          <div className="w-[14rem] mx-auto space-y-3">
            {/* Fila 1: 1, 2, 3, 4, 5 */}
            <div className="grid grid-cols-5 gap-2">
              {CANTIDADES_FILA1.map((n) => (
                <Button
                  key={n}
                  type="button"
                  variant="outline"
                  size="sm"
                  className="min-w-0"
                  onClick={() => guardar(n)}
                >
                  {n}
                </Button>
              ))}
            </div>

            {/* Fila 2: 6, 12, 24, 50 — centrada en el mismo ancho */}
            <div className="flex justify-center gap-2">
              {CANTIDADES_FILA2.map((n) => (
                <Button
                  key={n}
                  type="button"
                  variant="outline"
                  size="sm"
                  className="w-[2.25rem] min-w-0 shrink-0"
                  onClick={() => guardar(n)}
                >
                  {n}
                </Button>
              ))}
            </div>

            {/* Fila 3: Otra Cantidad (una fila) + input y Agregar centrados */}
            <div className="flex flex-col items-center gap-2">
              <span className="text-sm text-muted-foreground">Otra Cantidad</span>
              <div className="flex items-center justify-center gap-2">
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
          </div>
        </div>

        <DialogFooter className="flex justify-center pt-8">
          <Button variant="outline" onClick={() => onOpenChange(false)}>
            Cancelar
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
