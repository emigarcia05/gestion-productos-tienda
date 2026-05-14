"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { toast } from "sonner";
import { Dialog } from "@/components/ui/dialog";
import AppModal from "@/components/shared/AppModal";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import MontoArInput from "@/components/shared/MontoArInput";
import { crearFinTesoreriaChequeAction } from "@/actions/finTesoreriaCheques";
import {
  dateToIsoYmdArgentina,
  formatIsoYmdDdMmYyyyArgentina,
  maskDigitsToDdMmYyyyDisplay,
  parseDdMmYyyyToIsoYmdArgentina,
} from "@/lib/fechaArgentina";
import { montoArNormalizedStringToPesosIntRounded } from "@/lib/montoArMask";
import { SELECT_TRIGGER_FILTER_CLASS } from "@/components/FilterBar";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { CalendarDays } from "lucide-react";
import { cn } from "@/lib/utils";
import {
  TITULARES_CAJA_TESORERIA,
  type TitularCajaTesoreria,
} from "@/lib/cajasTesoreriaTitulares";
import type { TipoChequeTesoreria } from "@prisma/client";

const TIPOS_CHEQUE: readonly TipoChequeTesoreria[] = ["FISICO", "ECHEQUE"];

function abrirSelectorFechaNativo(el: HTMLInputElement | null) {
  if (!el) return;
  try {
    void el.showPicker?.();
  } catch {
    el.click();
  }
}

function tenedorInicialDesdeTitularCaja(raw: string | null | undefined): TitularCajaTesoreria {
  if (raw && TITULARES_CAJA_TESORERIA.includes(raw as TitularCajaTesoreria)) {
    return raw as TitularCajaTesoreria;
  }
  return TITULARES_CAJA_TESORERIA[0];
}

interface Props {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  cajaId: string | null;
  /** Misma lista que tenedor: se preselecciona con el titular de la caja. */
  titularCaja?: string | null;
  onCreated?: () => void;
}

export default function AltaChequeTesoreriaModal({
  open,
  onOpenChange,
  cajaId,
  titularCaja,
  onCreated,
}: Props) {
  const [tipo, setTipo] = useState<TipoChequeTesoreria>("FISICO");
  const [tenedor, setTenedor] = useState<TitularCajaTesoreria>(TITULARES_CAJA_TESORERIA[0]);
  const [emisor, setEmisor] = useState("");
  const [montoNorm, setMontoNorm] = useState("");
  const [fechaDdMmYyyy, setFechaDdMmYyyy] = useState("");
  const [fechaRecibidoDdMmYyyy, setFechaRecibidoDdMmYyyy] = useState("");
  const [saving, setSaving] = useState(false);
  const hiddenFechaRecibidoRef = useRef<HTMLInputElement>(null);
  const hiddenFechaAcreditacionRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (!open) return;
    setTipo("FISICO");
    setTenedor(tenedorInicialDesdeTitularCaja(titularCaja ?? null));
    setEmisor("");
    setMontoNorm("");
    const hoy = formatIsoYmdDdMmYyyyArgentina(dateToIsoYmdArgentina(new Date()));
    setFechaDdMmYyyy(hoy);
    setFechaRecibidoDdMmYyyy(hoy);
  }, [open, titularCaja]);

  const parsedMonto = useMemo(() => montoArNormalizedStringToPesosIntRounded(montoNorm), [montoNorm]);
  const fechaAcreditacionIso = useMemo(
    () => parseDdMmYyyyToIsoYmdArgentina(fechaDdMmYyyy),
    [fechaDdMmYyyy]
  );
  const fechaRecibidoIso = useMemo(
    () => parseDdMmYyyyToIsoYmdArgentina(fechaRecibidoDdMmYyyy),
    [fechaRecibidoDdMmYyyy]
  );

  const isoRecibidoParaPicker = useMemo(
    () => (fechaRecibidoIso !== "" ? fechaRecibidoIso : dateToIsoYmdArgentina(new Date())),
    [fechaRecibidoIso]
  );
  const isoAcreditacionParaPicker = useMemo(
    () => (fechaAcreditacionIso !== "" ? fechaAcreditacionIso : dateToIsoYmdArgentina(new Date())),
    [fechaAcreditacionIso]
  );

  const abrirPickerRecibido = useCallback(() => {
    if (!saving) abrirSelectorFechaNativo(hiddenFechaRecibidoRef.current);
  }, [saving]);
  const abrirPickerAcreditacion = useCallback(() => {
    if (!saving) abrirSelectorFechaNativo(hiddenFechaAcreditacionRef.current);
  }, [saving]);

  const disabledSubmit = useMemo(() => {
    return (
      saving ||
      !cajaId ||
      emisor.trim().length === 0 ||
      parsedMonto < 0 ||
      fechaAcreditacionIso === "" ||
      fechaRecibidoIso === ""
    );
  }, [saving, cajaId, emisor, parsedMonto, fechaAcreditacionIso, fechaRecibidoIso]);

  async function handleSubmit() {
    if (disabledSubmit || !cajaId) return;
    setSaving(true);
    try {
      const res = await crearFinTesoreriaChequeAction({
        cajaId,
        tipo,
        tenedor,
        emisor: emisor.trim(),
        monto: parsedMonto,
        fechaAcreditacion: fechaAcreditacionIso,
        fechaRecibido: fechaRecibidoIso,
      });
      if (!res.ok) {
        toast.error(res.error ?? "No se pudo registrar el cheque.");
        return;
      }
      toast.success("Cheque registrado correctamente.");
      onOpenChange(false);
      onCreated?.();
    } finally {
      setSaving(false);
    }
  }

  return (
    <Dialog open={open} onOpenChange={(next) => (!saving ? onOpenChange(next) : undefined)}>
      <AppModal
        title="Registrar Cheque"
        size="sm"
        className="max-w-md"
        scrollBody={false}
        actions={
          <div className="flex w-full justify-end gap-2">
            <Button type="button" variant="outline" disabled={saving} onClick={() => onOpenChange(false)}>
              Cancelar
            </Button>
            <Button type="button" disabled={disabledSubmit} onClick={handleSubmit}>
              Guardar
            </Button>
          </div>
        }
      >
        <div className="grid grid-cols-1 gap-3">
          <label className="flex flex-col gap-1">
            <span className="text-xs font-semibold uppercase tracking-[0.06em] text-muted-foreground">
              TIPO
            </span>
            <Select
              value={tipo}
              onValueChange={(value) => setTipo(value as TipoChequeTesoreria)}
              disabled={saving || !cajaId}
            >
              <SelectTrigger className={cn(SELECT_TRIGGER_FILTER_CLASS, "w-full")}>
                <SelectValue placeholder="TIPO DE CHEQUE" />
              </SelectTrigger>
              <SelectContent
                position="popper"
                side="bottom"
                align="start"
                className="select-content-filtro"
              >
                {TIPOS_CHEQUE.map((opt) => (
                  <SelectItem key={opt} value={opt}>
                    {opt === "ECHEQUE" ? "E-CHEQUE" : "FÍSICO"}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </label>
          <label className="flex flex-col gap-1">
            <span className="text-xs font-semibold uppercase tracking-[0.06em] text-muted-foreground">
              TENEDOR
            </span>
            <Select
              value={tenedor}
              onValueChange={(value) => setTenedor(value as TitularCajaTesoreria)}
              disabled={saving || !cajaId}
            >
              <SelectTrigger className={cn(SELECT_TRIGGER_FILTER_CLASS, "w-full")}>
                <SelectValue placeholder="SELECCIONAR TENEDOR" />
              </SelectTrigger>
              <SelectContent
                position="popper"
                side="bottom"
                align="start"
                className="select-content-filtro"
              >
                {TITULARES_CAJA_TESORERIA.map((opt) => (
                  <SelectItem key={opt} value={opt}>
                    {opt}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </label>
          <label className="flex flex-col gap-1">
            <span className="text-xs font-semibold uppercase tracking-[0.06em] text-muted-foreground">
              EMISOR
            </span>
            <Input
              value={emisor}
              onChange={(e) => setEmisor(e.target.value.toLocaleUpperCase("es-AR"))}
              disabled={saving}
              placeholder="Nombre del emisor"
              aria-label="Emisor del cheque"
            />
          </label>
          <label className="flex flex-col gap-1">
            <span className="text-xs font-semibold uppercase tracking-[0.06em] text-muted-foreground">
              MONTO
            </span>
            <MontoArInput
              valueNormalized={montoNorm}
              onValueNormalizedChange={setMontoNorm}
              disabled={saving}
              aria-label="Monto del cheque"
            />
          </label>
          <label className="flex flex-col gap-1">
            <span className="text-xs font-semibold uppercase tracking-[0.06em] text-muted-foreground">
              FECHA RECIBIDO
            </span>
            <div className="relative w-full">
              <Input
                type="text"
                inputMode="numeric"
                autoComplete="off"
                placeholder="dd/mm/aaaa"
                value={fechaRecibidoDdMmYyyy}
                onChange={(e) =>
                  setFechaRecibidoDdMmYyyy(maskDigitsToDdMmYyyyDisplay(e.target.value))
                }
                onDoubleClick={(e) => {
                  e.preventDefault();
                  abrirPickerRecibido();
                }}
                disabled={saving}
                className={cn("tabular-nums", "pr-10")}
                title="Ícono de calendario o doble clic para abrir el calendario"
                aria-label="Fecha en que se recibió el cheque (dd/mm/aaaa). Ícono de calendario o doble clic para calendario."
              />
              <Button
                type="button"
                variant="ghost"
                size="icon"
                disabled={saving}
                className={cn(
                  "absolute right-0 top-0 h-9 w-9 shrink-0 rounded-r-md text-muted-foreground hover:bg-muted hover:text-foreground"
                )}
                onClick={(e) => {
                  e.preventDefault();
                  abrirPickerRecibido();
                }}
                aria-label="Abrir calendario para fecha recibido"
                title="Abrir calendario"
              >
                <CalendarDays className="h-4 w-4 shrink-0" aria-hidden />
              </Button>
            </div>
            <input
              ref={hiddenFechaRecibidoRef}
              type="date"
              tabIndex={-1}
              aria-hidden
              className="sr-only"
              value={isoRecibidoParaPicker}
              onChange={(e) => {
                const v = e.target.value;
                if (v) setFechaRecibidoDdMmYyyy(formatIsoYmdDdMmYyyyArgentina(v));
              }}
            />
          </label>
          <label className="flex flex-col gap-1">
            <span className="text-xs font-semibold uppercase tracking-[0.06em] text-muted-foreground">
              FECHA ACREDITACIÓN
            </span>
            <div className="relative w-full">
              <Input
                type="text"
                inputMode="numeric"
                autoComplete="off"
                placeholder="dd/mm/aaaa"
                value={fechaDdMmYyyy}
                onChange={(e) =>
                  setFechaDdMmYyyy(maskDigitsToDdMmYyyyDisplay(e.target.value))
                }
                onDoubleClick={(e) => {
                  e.preventDefault();
                  abrirPickerAcreditacion();
                }}
                disabled={saving}
                className={cn("tabular-nums", "pr-10")}
                title="Ícono de calendario o doble clic para abrir el calendario"
                aria-label="Fecha de acreditación del cheque (dd/mm/aaaa). Ícono de calendario o doble clic para calendario."
              />
              <Button
                type="button"
                variant="ghost"
                size="icon"
                disabled={saving}
                className={cn(
                  "absolute right-0 top-0 h-9 w-9 shrink-0 rounded-r-md text-muted-foreground hover:bg-muted hover:text-foreground"
                )}
                onClick={(e) => {
                  e.preventDefault();
                  abrirPickerAcreditacion();
                }}
                aria-label="Abrir calendario para fecha de acreditación"
                title="Abrir calendario"
              >
                <CalendarDays className="h-4 w-4 shrink-0" aria-hidden />
              </Button>
            </div>
            <input
              ref={hiddenFechaAcreditacionRef}
              type="date"
              tabIndex={-1}
              aria-hidden
              className="sr-only"
              value={isoAcreditacionParaPicker}
              onChange={(e) => {
                const v = e.target.value;
                if (v) setFechaDdMmYyyy(formatIsoYmdDdMmYyyyArgentina(v));
              }}
            />
          </label>
        </div>
      </AppModal>
    </Dialog>
  );
}
