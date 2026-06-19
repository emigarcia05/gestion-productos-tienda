"use client";

import { useCallback, useState, useTransition } from "react";
import { toast } from "sonner";
import { DollarSign, Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Dialog, DialogTrigger } from "@/components/ui/dialog";
import AppModal from "@/components/shared/AppModal";
import MontoArInput from "@/components/shared/MontoArInput";
import {
  actualizarCotizacionUsdAction,
  getCotizacionUsdAction,
  type CotizacionUsdEstado,
} from "@/actions/cotizacionUsd";
import { montoArNumberToNormalizedString, montoArNormalizedStringToPesosNumber } from "@/lib/montoArMask";
import { cn } from "@/lib/utils";

interface Props {
  puedeEditar: boolean;
  estadoInicial: CotizacionUsdEstado;
  onActualizada?: () => void;
}

function fmtCotizacion(valor: number): string {
  return valor.toLocaleString("es-AR", {
    minimumFractionDigits: 2,
    maximumFractionDigits: 4,
  });
}

export default function CotizacionUsdListaPreciosControl({
  puedeEditar,
  estadoInicial,
  onActualizada,
}: Props) {
  const [open, setOpen] = useState(false);
  const [pending, startTransition] = useTransition();
  const [estado, setEstado] = useState<CotizacionUsdEstado>(estadoInicial);
  const [valorNorm, setValorNorm] = useState(() => montoArNumberToNormalizedString(estadoInicial.valor));

  const estadoToolbar = open ? estado : estadoInicial;

  const refrescar = useCallback(async () => {
    const result = await getCotizacionUsdAction();
    if (!result.ok) {
      toast.error(result.error ?? "No se pudo cargar la cotización USD.");
      return;
    }
    setEstado(result.data);
    setValorNorm(montoArNumberToNormalizedString(result.data.valor));
  }, []);

  function handleOpen(next: boolean) {
    if (next) {
      setEstado(estadoInicial);
      setValorNorm(montoArNumberToNormalizedString(estadoInicial.valor));
    }
    setOpen(next);
  }

  function handleGuardar() {
    const norm = valorNorm.trim();
    if (!norm) {
      toast.error("Ingresá la cotización USD.");
      return;
    }
    const valor = montoArNormalizedStringToPesosNumber(norm);
    if (!Number.isFinite(valor) || valor <= 0) {
      toast.error("La cotización debe ser mayor a 0.");
      return;
    }

    startTransition(async () => {
      const result = await actualizarCotizacionUsdAction({ valor });
      if (!result.ok) {
        toast.error(result.error ?? "No se pudo guardar la cotización.");
        return;
      }
      const n = result.data?.actualizados ?? 0;
      if (result.data?.estado) {
        setEstado(result.data.estado);
      }
      toast.success(
        `Cotización USD actualizada. ${n.toLocaleString("es-AR")} producto${n !== 1 ? "s" : ""} en dólares recalculado${n !== 1 ? "s" : ""}.`
      );
      setOpen(false);
      onActualizada?.();
      await refrescar();
    });
  }

  const labelValor = `$ ${fmtCotizacion(estadoToolbar.valor)}`;

  if (!puedeEditar) {
    return (
      <div className="flex items-center gap-2 shrink-0 text-sm text-muted-foreground tabular-nums">
        <DollarSign className="h-4 w-4 shrink-0" aria-hidden />
        <span>
          Cotización U$S= <strong className="text-foreground">{labelValor}</strong>
        </span>
      </div>
    );
  }

  return (
    <Dialog open={open} onOpenChange={handleOpen}>
      <DialogTrigger asChild>
        <Button
          type="button"
          variant="outline"
          size="default"
          className="gap-2 shrink-0 tabular-nums"
        >
          <DollarSign className="h-4 w-4 shrink-0" />
          Cotización U$S= {labelValor}
        </Button>
      </DialogTrigger>
      <AppModal
        title="Cotización USD"
        actions={
          <>
            <Button type="button" variant="outline" onClick={() => setOpen(false)} disabled={pending}>
              Cancelar
            </Button>
            <Button type="button" onClick={handleGuardar} disabled={pending}>
              {pending ? <Loader2 className="h-4 w-4 animate-spin" /> : "Guardar"}
            </Button>
          </>
        }
      >
        <div className="flex flex-col gap-4">
          <p className="text-sm text-muted-foreground">
            Valor único para todos los productos importados o marcados con precio en dólares. Al guardar se
            actualizan los precios de compra de esos ítems.
          </p>
          <div className="grid grid-cols-[1.35fr_minmax(0,1fr)] gap-x-4 gap-y-2 items-center">
            <label htmlFor="cotizacionUsdGlobal" className="text-right font-medium text-sm text-foreground">
              COTIZACIÓN US$
            </label>
            <MontoArInput
              id="cotizacionUsdGlobal"
              placeholder="0,00"
              valueNormalized={valorNorm}
              onValueNormalizedChange={setValorNorm}
              className={cn("tabular-nums border-primary w-full min-w-0")}
            />
          </div>
        </div>
      </AppModal>
    </Dialog>
  );
}
