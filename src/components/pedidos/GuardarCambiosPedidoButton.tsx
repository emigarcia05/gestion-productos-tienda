"use client";

import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Save } from "lucide-react";
import { toast } from "sonner";
import { syncPedidoUrgenteEnvioAction } from "@/actions/pedidos";

interface Props {
  sucursal: "" | "guaymallen" | "maipu";
  cantPorId: Record<string, string>;
}

export default function GuardarCambiosPedidoButton({ sucursal, cantPorId }: Props) {
  const [guardando, setGuardando] = useState(false);

  async function handleClick() {
    if (!sucursal) {
      toast.error("Seleccioná una sucursal para guardar.");
      return;
    }
    const items = Object.entries(cantPorId)
      .filter(([, c]) => Number(c) > 0)
      .map(([id, c]) => ({ id, cant: Number(c) }));
    setGuardando(true);
    try {
      const result = await syncPedidoUrgenteEnvioAction(sucursal, items);
      if (result.ok) {
        toast.success(
          result.data.creados === 0
            ? "Pedido actualizado (sin ítems con cantidad)."
            : `Se guardaron ${result.data.creados} ítem(s) en el pedido de envío.`
        );
      } else {
        toast.error(result.error);
      }
    } finally {
      setGuardando(false);
    }
  }

  if (!sucursal) return null;

  return (
    <Button
      type="button"
      variant="default"
      size="default"
      className="gap-2 h-10 px-4"
      onClick={handleClick}
      disabled={guardando}
    >
      <Save className="h-4 w-4" />
      {guardando ? "Guardando…" : "Guardar Cambios"}
    </Button>
  );
}
