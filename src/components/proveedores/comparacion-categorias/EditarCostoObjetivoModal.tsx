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
import { updatePresentacionAction } from "@/actions/comparacionCategorias";

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

  useEffect(() => {
    setValor(valorActual != null ? String(valorActual) : "");
  }, [open, valorActual]);

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

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-sm">
        <DialogHeader>
          <DialogTitle>Costo compra objetivo</DialogTitle>
        </DialogHeader>
        <p className="text-sm text-muted-foreground">{labelCompleto}</p>
        <div className="grid gap-4 py-2">
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
          <div className="flex justify-end gap-2">
            <Button type="button" variant="outline" onClick={() => onOpenChange(false)} disabled={pending}>
              Cancelar
            </Button>
            <Button type="button" onClick={handleGuardar} disabled={pending}>
              Guardar
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
