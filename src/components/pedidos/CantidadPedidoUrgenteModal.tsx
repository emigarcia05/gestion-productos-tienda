"use client";

import { useState, useEffect } from "react";
import { Dialog } from "@/components/ui/dialog";
import AppModal from "@/components/shared/AppModal";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";

export interface ProductoPedidoUrgenteModal {
  id: string;
  descripcion: string;
}

interface Props {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  producto: ProductoPedidoUrgenteModal | null;
  onConfirmar: (cantidad: number) => void;
}

export default function CantidadPedidoUrgenteModal({
  open,
  onOpenChange,
  producto,
  onConfirmar,
}: Props) {
  const [valor, setValor] = useState<string>("");

  useEffect(() => {
    if (open && producto) {
      setValor("");
    }
  }, [open, producto]);

  if (!producto) return null;

  const cantidadNumerica = (() => {
    const n = parseInt(valor, 10);
    return Number.isFinite(n) ? n : 0;
  })();

  function handleAgregar() {
    if (cantidadNumerica <= 0) return;
    onConfirmar(cantidadNumerica);
    onOpenChange(false);
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <AppModal
        title="Cantidad A Pedir"
        actions={
          <div className="flex gap-2">
            <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>
              Cerrar
            </Button>
            <Button type="button" onClick={handleAgregar} disabled={cantidadNumerica <= 0}>
              Agregar
            </Button>
          </div>
        }
      >
        <div className="flex flex-col items-center gap-6 w-full text-center">
          <div className="flex flex-col items-center gap-2 w-full">
            <p className="text-sm text-foreground font-medium">{producto.descripcion}</p>
            <div className="w-full h-px bg-[#0072BB]" />
          </div>

          <div className="flex flex-col items-center gap-3 w-full">
            <span className="text-sm font-medium text-foreground">Cant. A Pedir</span>
            <Input
              type="number"
              min={1}
              step={1}
              value={valor}
              onChange={(e) => {
                const soloDigitos = e.target.value.replace(/\D/g, "");
                setValor(soloDigitos);
              }}
              onKeyDown={(e) => {
                if (e.key === "Enter") {
                  e.preventDefault();
                  handleAgregar();
                }
              }}
              className="w-32 text-center tabular-nums"
            />
          </div>
        </div>
      </AppModal>
    </Dialog>
  );
}

