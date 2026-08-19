"use client";

import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";

export const ENVIOS_WIZARD_PASOS = [
  { numero: 1, label: "CLIENTE" },
  { numero: 2, label: "DIRECCIÓN" },
  { numero: 3, label: "FECHA" },
  { numero: 4, label: "MERCADERÍA" },
] as const;

export type EnvioWizardPaso = (typeof ENVIOS_WIZARD_PASOS)[number]["numero"];

interface Props {
  pasoActual: EnvioWizardPaso;
  pasoMaximoAlcanzable: EnvioWizardPaso;
  onPasoChange: (paso: EnvioWizardPaso) => void;
}

export default function EnviosWizardPasos({
  pasoActual,
  pasoMaximoAlcanzable,
  onPasoChange,
}: Props) {
  return (
    <ol className="flex h-full min-h-0 w-full items-stretch gap-1" aria-label="Pasos del envío">
      {ENVIOS_WIZARD_PASOS.map((paso) => {
        const activo = paso.numero === pasoActual;
        const alcanzado = paso.numero < pasoActual;
        const habilitado = paso.numero <= pasoMaximoAlcanzable;
        return (
          <li key={paso.numero} className="flex min-h-0 min-w-0 flex-1">
            <Button
              type="button"
              variant={activo ? "default" : "outline"}
              disabled={!habilitado}
              onClick={() => onPasoChange(paso.numero)}
              className={cn(
                "h-full min-h-0 w-full flex-col gap-1 rounded-md px-2 py-1 text-center",
                !activo && alcanzado && "border-primary/40 bg-primary/10 text-foreground hover:bg-primary/15",
              )}
              aria-current={activo ? "step" : undefined}
            >
              <span className="text-xs font-semibold tabular-nums leading-none">{paso.numero}</span>
              <span className="w-full truncate text-[0.65rem] font-semibold uppercase tracking-[0.06em] leading-tight">
                {paso.label}
              </span>
            </Button>
          </li>
        );
      })}
    </ol>
  );
}
