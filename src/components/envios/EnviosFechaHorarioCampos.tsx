"use client";

import { useMemo, useRef } from "react";
import { CalendarDays } from "lucide-react";
import ModalMicroLabel from "@/components/shared/ModalMicroLabel";
import { Button } from "@/components/ui/button";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  addDaysToIsoYmdArgentina,
  dateToIsoYmdArgentina,
  formatIsoYmdDdMmYyyyArgentina,
} from "@/lib/fechaArgentina";
import {
  horasDesdeDisponibles,
  horasHastaDisponibles,
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
}

export default function EnviosFechaHorarioCampos({
  fechaIso,
  horaDesde,
  horaHasta,
  disabled = false,
  onFechaChange,
  onHoraDesdeChange,
  onHoraHastaChange,
}: Props) {
  const hiddenFechaRef = useRef<HTMLInputElement>(null);
  const hoyIso = dateToIsoYmdArgentina(new Date());
  const mananaIso = addDaysToIsoYmdArgentina(hoyIso, 1);
  const horasDesde = useMemo(() => horasDesdeDisponibles(), []);
  const horasHasta = useMemo(() => horasHastaDisponibles(horaDesde), [horaDesde]);

  function handleHoraDesde(value: string) {
    const next = value as EnviosHoraValue;
    onHoraDesdeChange(next);
    if (horaHasta !== "" && horaHasta <= next) {
      onHoraHastaChange("");
    }
  }

  return (
    <div className="flex flex-col gap-4">
      <div className="flex flex-col gap-2">
        <ModalMicroLabel>FECHA</ModalMicroLabel>
        <div className="flex flex-wrap items-center gap-2">
          <Button
            type="button"
            variant={fechaIso === hoyIso ? "default" : "outline"}
            disabled={disabled}
            onClick={() => onFechaChange(hoyIso)}
          >
            HOY
          </Button>
          <Button
            type="button"
            variant={fechaIso === mananaIso ? "default" : "outline"}
            disabled={disabled}
            onClick={() => onFechaChange(mananaIso)}
          >
            MAÑANA
          </Button>
          <Button
            type="button"
            variant="ghost"
            size="icon"
            disabled={disabled}
            className={cn(
              "size-9 shrink-0 rounded-md border border-input bg-background text-muted-foreground",
              "hover:bg-accent hover:text-foreground"
            )}
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
              if (v) onFechaChange(v);
            }}
          />
          {fechaIso ? (
            <span className="text-sm tabular-nums text-foreground">
              {formatIsoYmdDdMmYyyyArgentina(fechaIso)}
            </span>
          ) : null}
        </div>
      </div>
      <div className="grid grid-cols-2 gap-3">
        <div className="flex flex-col gap-1">
          <ModalMicroLabel>HORA DESDE</ModalMicroLabel>
          <Select
            value={horaDesde || undefined}
            disabled={disabled}
            onValueChange={handleHoraDesde}
          >
            <SelectTrigger>
              <SelectValue placeholder="DESDE..." />
            </SelectTrigger>
            <SelectContent className="select-content-filtro" position="popper" side="bottom" align="start">
              {horasDesde.map((hora) => (
                <SelectItem key={hora} value={hora}>
                  {hora}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
        <div className="flex flex-col gap-1">
          <ModalMicroLabel>HORA HASTA</ModalMicroLabel>
          <Select
            value={horaHasta || undefined}
            disabled={disabled || horaDesde === ""}
            onValueChange={(v) => onHoraHastaChange(v as EnviosHoraValue)}
          >
            <SelectTrigger>
              <SelectValue placeholder="HASTA..." />
            </SelectTrigger>
            <SelectContent className="select-content-filtro" position="popper" side="bottom" align="start">
              {horasHasta.map((hora) => (
                <SelectItem key={hora} value={hora}>
                  {hora}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
      </div>
    </div>
  );
}
