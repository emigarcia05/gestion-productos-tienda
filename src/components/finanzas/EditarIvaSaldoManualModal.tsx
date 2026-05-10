"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { Dialog } from "@/components/ui/dialog";
import AppModal from "@/components/shared/AppModal";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  eliminarFinBalPosicionIvaSaldoManualAction,
  guardarFinBalPosicionIvaSaldoManualAction,
} from "@/actions/finBalPosicionIvaSaldoManual";

const MESES: { valor: number; etiqueta: string }[] = [
  { valor: 1, etiqueta: "ENERO" },
  { valor: 2, etiqueta: "FEBRERO" },
  { valor: 3, etiqueta: "MARZO" },
  { valor: 4, etiqueta: "ABRIL" },
  { valor: 5, etiqueta: "MAYO" },
  { valor: 6, etiqueta: "JUNIO" },
  { valor: 7, etiqueta: "JULIO" },
  { valor: 8, etiqueta: "AGOSTO" },
  { valor: 9, etiqueta: "SEPTIEMBRE" },
  { valor: 10, etiqueta: "OCTUBRE" },
  { valor: 11, etiqueta: "NOVIEMBRE" },
  { valor: 12, etiqueta: "DICIEMBRE" },
];

/** Pesos enteros: permite miles con punto y signo menos (ej. -104.225). */
function parsePesosEntero(raw: string): number | null {
  const s = raw.trim();
  if (s === "") return null;
  const neg = s.startsWith("-");
  const digitsOnly = s.replace(/[^\d]/g, "");
  if (!digitsOnly) return null;
  let v = parseInt(digitsOnly, 10);
  if (neg) v = -v;
  return Number.isFinite(v) ? v : null;
}

interface Props {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  mes: number;
  anio: number;
  saldoCalculado: number;
  saldoManual: number | null;
}

export default function EditarIvaSaldoManualModal({
  open,
  onOpenChange,
  mes,
  anio,
  saldoCalculado,
  saldoManual,
}: Props) {
  const router = useRouter();
  const [valorTexto, setValorTexto] = useState("");
  const [guardando, setGuardando] = useState(false);

  const etiquetaMes = MESES.find((x) => x.valor === mes)?.etiqueta ?? String(mes);
  const tieneManual = saldoManual !== null;

  useEffect(() => {
    if (!open) return;
    const base = saldoManual ?? saldoCalculado;
    setValorTexto(String(base));
  }, [open, mes, anio, saldoManual, saldoCalculado]);

  async function handleGuardar() {
    const n = parsePesosEntero(valorTexto);
    if (n === null) {
      toast.error("Ingresá un importe válido (pesos enteros).");
      return;
    }
    setGuardando(true);
    try {
      const r = await guardarFinBalPosicionIvaSaldoManualAction({ mes, anio, saldoPesos: n });
      if (!r.ok) {
        toast.error(r.error ?? "No se pudo guardar.");
        return;
      }
      toast.success("Saldo manual guardado. Débito y crédito quedan sin valor mostrado para ese mes.");
      onOpenChange(false);
      router.refresh();
    } finally {
      setGuardando(false);
    }
  }

  async function handleAutomatico() {
    setGuardando(true);
    try {
      const r = await eliminarFinBalPosicionIvaSaldoManualAction({ mes, anio });
      if (!r.ok) {
        toast.error(r.error ?? "No se pudo restaurar.");
        return;
      }
      toast.success("Se usa de nuevo el cálculo automático de débito, crédito y saldo.");
      onOpenChange(false);
      router.refresh();
    } finally {
      setGuardando(false);
    }
  }

  return (
    <Dialog
      open={open}
      onOpenChange={(next) => {
        if (guardando && !next) return;
        onOpenChange(next);
      }}
    >
      <AppModal
        title={`IVA saldo manual · ${etiquetaMes} ${anio}`}
        size="sm"
        className="max-w-md"
        actions={
          <>
            <Button type="button" variant="outline" disabled={guardando} onClick={() => onOpenChange(false)}>
              Cerrar
            </Button>
            {tieneManual ? (
              <Button type="button" variant="secondary" disabled={guardando} onClick={() => void handleAutomatico()}>
                Cálculo automático
              </Button>
            ) : null}
            <Button type="button" disabled={guardando} onClick={() => void handleGuardar()}>
              Guardar
            </Button>
          </>
        }
      >
        <div className="flex flex-col gap-3 text-sm">
          <p className="text-muted-foreground">
            Si guardás un importe, el saldo mostrado será ese valor y las columnas IVA débito e IVA crédito
            aparecerán vacías para este mes.
          </p>
          <div className="space-y-2">
            <Label htmlFor="iva-saldo-manual-importe">Importe IVA saldo ($)</Label>
            <Input
              id="iva-saldo-manual-importe"
              inputMode="numeric"
              autoComplete="off"
              disabled={guardando}
              value={valorTexto}
              onChange={(e) => setValorTexto(e.target.value)}
              placeholder="Ej: -104225 o 39402"
            />
          </div>
        </div>
      </AppModal>
    </Dialog>
  );
}
