"use client";

import { useRef, useState } from "react";
import { CalendarDays } from "lucide-react";
import ModalMicroLabel from "@/components/shared/ModalMicroLabel";
import { Button } from "@/components/ui/button";
import {
  addDaysToIsoYmdArgentina,
  dateToIsoYmdArgentina,
  formatIsoYmdDdMmYyyyArgentina,
} from "@/lib/fechaArgentina";
import {
  ENVIOS_HORA_VALUES,
  rangoHorarioDesdeClicks,
  type EnviosHoraValue,
} from "@/lib/envios";
import { cn } from "@/lib/utils";

function abrirSelectorFechaNativo(el: HTMLInputElement | null) {
  if (!el) return;
  try {
    void el.showPicker?.();
  } catch {
    el.click();
  }
}

interface Props {
  fechaIso: string;
  horaDesde: EnviosHoraValue | "";
  horaHasta: EnviosHoraValue | "";
  disabled?: boolean;
  onFechaChange: (iso: string) => void;
  onHoraDesdeChange: (hora: EnviosHoraValue | "") => void;
  onHoraHastaChange: (hora: EnviosHoraValue | "") => void;
  /** Tras fecha + rango válidos (p. ej. wizard: pasar al paso siguiente). */
  onCompleto?: () => void;
  /** Oculta el label FECHA (el wizard ya lo muestra como título de paso). */
  ocultarTituloFecha?: boolean;
}

export default function EnviosFechaHorarioCampos({
  fechaIso,
  horaDesde,
  horaHasta,
  disabled = false,
  onFechaChange,
  onHoraDesdeChange,
  onHoraHastaChange,
  onCompleto,
  ocultarTituloFecha = false,
}: Props) {
  const hiddenFechaRef = useRef<HTMLInputElement>(null);
  const [horaPendiente, setHoraPendiente] = useState<EnviosHoraValue | "">("");
  const hoyIso = dateToIsoYmdArgentina(new Date());
  const mananaIso = addDaysToIsoYmdArgentina(hoyIso, 1);
  const fechaOtra = fechaIso !== "" && fechaIso !== hoyIso && fechaIso !== mananaIso;
  const rangoListo = horaDesde !== "" && horaHasta !== "" && horaDesde < horaHasta;

  function intentarCompletar(nextFecha: string, nextDesde: string, nextHasta: string) {
    if (nextFecha !== "" && nextDesde !== "" && nextHasta !== "" && nextDesde < nextHasta) {
      onCompleto?.();
    }
  }

  function handleFecha(iso: string) {
    onFechaChange(iso);
    intentarCompletar(iso, horaDesde, horaHasta);
  }

  function handleHoraClick(hora: EnviosHoraValue) {
    if (horaPendiente === "") {
      setHoraPendiente(hora);
      onHoraDesdeChange("");
      onHoraHastaChange("");
      return;
    }
    const rango = rangoHorarioDesdeClicks(horaPendiente, hora);
    if (!rango) return;
    setHoraPendiente("");
    onHoraDesdeChange(rango.horaDesde);
    onHoraHastaChange(rango.horaHasta);
    intentarCompletar(fechaIso, rango.horaDesde, rango.horaHasta);
  }

  return (
    <div className="flex w-full flex-col items-center gap-6">
      <div className="flex w-full flex-col items-center gap-2">
        {ocultarTituloFecha ? null : <ModalMicroLabel align="center">FECHA</ModalMicroLabel>}
        <div className="flex items-center justify-center gap-2">
          <Button
            type="button"
            variant={fechaIso === hoyIso ? "default" : "outline"}
            disabled={disabled}
            onClick={() => handleFecha(hoyIso)}
          >
            HOY
          </Button>
          <Button
            type="button"
            variant={fechaIso === mananaIso ? "default" : "outline"}
            disabled={disabled}
            onClick={() => handleFecha(mananaIso)}
          >
            MAÑANA
          </Button>
          <Button
            type="button"
            variant={fechaOtra ? "default" : "outline"}
            size="icon"
            disabled={disabled}
            className="size-9 shrink-0"
            onClick={() => abrirSelectorFechaNativo(hiddenFechaRef.current)}
            aria-label="Abrir calendario"
            title="Abrir calendario"
          >
            <CalendarDays className="h-4 w-4 shrink-0" aria-hidden />
          </Button>
          <input
            ref={hiddenFechaRef}
            type="date"
            tabIndex={-1}
            aria-hidden
            className="sr-only"
            value={fechaIso}
            disabled={disabled}
            onChange={(e) => {
              const v = e.target.value;
              if (v) handleFecha(v);
            }}
          />
        </div>
        {fechaIso && !ocultarTituloFecha ? (
          <p className="text-sm tabular-nums text-foreground">
            {formatIsoYmdDdMmYyyyArgentina(fechaIso)}
          </p>
        ) : null}
      </div>

      <div className="flex w-full flex-col items-center gap-2">
        <ModalMicroLabel align="center">RANGO HORARIO</ModalMicroLabel>
        {rangoListo ? (
          <p className="text-sm tabular-nums text-foreground">
            {horaDesde} / {horaHasta}
          </p>
        ) : null}
        <div
          className="flex max-w-full flex-wrap items-center justify-center gap-1"
          role="group"
          aria-label="Rango horario"
        >
          {ENVIOS_HORA_VALUES.map((hora) => {
            const esPendiente = horaPendiente === hora;
            const esExtremo = hora === horaDesde || hora === horaHasta;
            const enMedio =
              rangoListo && hora > horaDesde && hora < horaHasta;
            return (
              <Button
                key={hora}
                type="button"
                variant={esPendiente || esExtremo ? "default" : "outline"}
                disabled={disabled}
                aria-pressed={esPendiente || esExtremo || enMedio}
                className={cn(
                  "h-8 min-w-12 px-2 text-xs font-medium tabular-nums",
                  enMedio && "border-primary/40 bg-primary/20 text-foreground"
                )}
                onClick={() => handleHoraClick(hora)}
              >
                {hora}
              </Button>
            );
          })}
        </div>
      </div>
    </div>
  );
}
