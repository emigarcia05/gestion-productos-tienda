"use client";

import { useRouter } from "next/navigation";
import { useTransition } from "react";
import { toast } from "sonner";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { guardarCostoCxProdTiendaAction } from "@/actions/cxPxTienda";
import {
  CX_PROD_SELECCION_PROM,
  costoCxProdMostrado,
  type CxProdDatosFila,
} from "@/lib/cxPxTienda";
import { fmtPrecio } from "@/lib/format";
import { cn } from "@/lib/utils";

export default function CeldaCxProdTienda({
  codTienda,
  cxProd,
  puedeEditar,
  className,
}: {
  codTienda: string;
  cxProd: CxProdDatosFila;
  puedeEditar: boolean;
  className?: string;
}) {
  const router = useRouter();
  const [isPending, startTransition] = useTransition();
  const sinVinculosCx = cxProd.opcionesProveedor.length === 0;
  const costoVista = costoCxProdMostrado(cxProd);

  function handleCambio(seleccion: string) {
    startTransition(async () => {
      const res = await guardarCostoCxProdTiendaAction({ codTienda, seleccion });
      if (!res.ok) {
        toast.error(res.error);
        return;
      }
      router.refresh();
    });
  }

  return (
    <div
      className={cn(
        "grid w-full min-w-0 grid-cols-2 items-center gap-1.5",
        className
      )}
    >
      <Select
        value={cxProd.seleccion}
        onValueChange={handleCambio}
        disabled={!puedeEditar || isPending || sinVinculosCx}
      >
        <SelectTrigger
          className={cn(
            "input-filtro-unificado h-8 w-full min-w-0",
            !puedeEditar && "pointer-events-none opacity-80"
          )}
          aria-label={`Costo producto ${codTienda}`}
        >
          <SelectValue placeholder="CX PROD." />
        </SelectTrigger>
        <SelectContent
          position="popper"
          side="bottom"
          align="start"
          className="select-content-filtro"
        >
          <SelectItem value={CX_PROD_SELECCION_PROM}>CX. PROM.</SelectItem>
          {cxProd.opcionesProveedor.map((op) => (
            <SelectItem key={op.codExt} value={op.codExt}>
              {op.etiqueta}
            </SelectItem>
          ))}
        </SelectContent>
      </Select>
      <span
        className="celda-numero tabular-nums text-center text-sm font-medium text-foreground min-w-0 block w-full"
        aria-label="Costo seleccionado"
      >
        ${fmtPrecio(costoVista)}
      </span>
    </div>
  );
}
