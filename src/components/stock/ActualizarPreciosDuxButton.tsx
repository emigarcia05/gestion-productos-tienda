"use client";

import { useTransition } from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { RefreshCw } from "lucide-react";
import { Button } from "@/components/ui/button";
import { actualizarPreciosDuxDesdeStock } from "@/actions/duxCostos";

interface Props {
  /** IDs de los ítems de precios_tienda actualmente visibles en la tabla (Control Stock). */
  itemIds: string[];
  /** Deshabilita el botón (ej. sin sucursal o sin ítems). */
  disabled?: boolean;
}

/**
 * Botón que envía a DUX los costos (px_compra_final) de lista proveedores
 * para los ítems visibles. cod_item = cod_tienda, id_proveedor = proveedores.id_proveedor_dux.
 */
export default function ActualizarPreciosDuxButton({ itemIds, disabled }: Props) {
  const router = useRouter();
  const [pending, startTransition] = useTransition();

  function handleClick() {
    if (itemIds.length === 0) return;
    startTransition(async () => {
      try {
        const result = await actualizarPreciosDuxDesdeStock(itemIds);
        if (!result.ok) {
          toast.error(result.error ?? "Error al actualizar precios en Dux.");
          return;
        }
        const enviados = result.data?.enviados ?? 0;
        toast.success(
          enviados > 0
            ? `Se enviaron ${enviados} actualización(es) de costo a Dux.`
            : "Actualización en Dux completada."
        );
        router.refresh();
      } catch (e: unknown) {
        console.error("[Exportar Px. Dux] Error en cliente:", e);
        const message =
          e instanceof Error ? e.message : typeof e === "string" ? e : "Error al intentar actualizar precios en Dux.";
        toast.error(message);
      }
    });
  }

  return (
    <Button
      type="button"
      variant="outline"
      size="default"
      className="gap-2 shrink-0"
      disabled={disabled || pending || itemIds.length === 0}
      onClick={handleClick}
    >
      <RefreshCw className={`h-4 w-4 shrink-0 ${pending ? "animate-spin" : ""}`} />
      Exportar Px. Dux
    </Button>
  );
}

