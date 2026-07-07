"use client";

import { useState, useTransition } from "react";
import { Check, Loader2 } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import PorcentajeCentInput from "@/components/shared/PorcentajeCentInput";
import { actualizarFinAnaCosFinaAction } from "@/actions/finAnaCosFina";
import { fmtPorcentajeTabla } from "@/lib/format";
import {
  etiquetaPagoFinAnaCosFina,
  etiquetaTerminalFinAnaCosFina,
} from "@/lib/finAnaCosFina";
import {
  parsePorcentajeCentNormalized,
  porcentajeCentFromNumber,
} from "@/lib/porcentajeCentMask";
import { cn } from "@/lib/utils";
import { TABLE_ROW_ACTION_ICON_CLASS } from "@/lib/ui-classes";
import type { FinAnaCosFinaItem } from "@/services/finAnaCosFina.service";

export type FinAnaCosFinaFila = FinAnaCosFinaItem;

interface Props {
  filas: FinAnaCosFinaFila[];
  esEditor: boolean;
  onFilaActualizada: (fila: FinAnaCosFinaFila) => void;
}

function parseDiasAcreditacionInput(raw: string): number | null | undefined {
  const trimmed = raw.trim();
  if (trimmed === "") return null;
  if (!/^\d{1,3}$/.test(trimmed)) return undefined;
  const n = Number(trimmed);
  if (!Number.isInteger(n) || n < 0 || n > 999) return undefined;
  return n;
}

function CeldaHabilitadoToggleVisual({ activo }: { activo: boolean }) {
  return (
    <span
      className={cn(
        "tabla-check-toggle tabla-check-toggle--alto-fila shrink-0 !bg-background",
        activo && "[&_svg]:!text-[#0072bb]"
      )}
      role="img"
      aria-hidden={!activo}
    >
      {activo ? <Check className={TABLE_ROW_ACTION_ICON_CLASS} aria-hidden /> : null}
    </span>
  );
}

function CeldaHabilitado({
  fila,
  esEditor,
  onFilaActualizada,
}: {
  fila: FinAnaCosFinaFila;
  esEditor: boolean;
  onFilaActualizada: (fila: FinAnaCosFinaFila) => void;
}) {
  const [saving, startTransition] = useTransition();

  if (!esEditor) {
    return (
      <div className="flex h-full w-full items-center justify-center">
        <CeldaHabilitadoToggleVisual activo={fila.habilitado} />
      </div>
    );
  }

  function handleToggle() {
    const siguiente = !fila.habilitado;
    startTransition(async () => {
      const res = await actualizarFinAnaCosFinaAction({
        id: fila.id,
        campos: { habilitado: siguiente },
      });
      if (res.ok) {
        onFilaActualizada(res.data);
      } else {
        toast.error(res.error);
      }
    });
  }

  return (
    <div className="flex h-full w-full items-center justify-center gap-1">
      {saving && <Loader2 className="h-3 w-3 shrink-0 animate-spin text-muted-foreground" />}
      <Button
        type="button"
        variant="ghost"
        size="icon"
        onClick={handleToggle}
        disabled={saving}
        className={cn(
          "tabla-check-toggle tabla-check-toggle--alto-fila shrink-0 !bg-background",
          fila.habilitado && "[&_svg]:!text-[#0072bb]"
        )}
        aria-pressed={fila.habilitado}
        aria-label={`Habilitar ${etiquetaTerminalFinAnaCosFina(fila.terminal)} ${etiquetaPagoFinAnaCosFina(fila.pago)}`}
      >
        {fila.habilitado ? <Check className={TABLE_ROW_ACTION_ICON_CLASS} aria-hidden /> : null}
      </Button>
    </div>
  );
}

function CeldaDiasAcreditacion({
  fila,
  esEditor,
  onFilaActualizada,
}: {
  fila: FinAnaCosFinaFila;
  esEditor: boolean;
  onFilaActualizada: (fila: FinAnaCosFinaFila) => void;
}) {
  const [draft, setDraft] = useState(fila.diasAcreditacion?.toString() ?? "");
  const [saving, startTransition] = useTransition();

  if (!esEditor) {
    return (
      <span className="block w-full text-center text-xs tabular-nums text-muted-foreground">
        {fila.diasAcreditacion ?? "—"}
      </span>
    );
  }

  function guardar() {
    const parsed = parseDiasAcreditacionInput(draft);
    if (parsed === undefined) {
      toast.error("Ingresá días de acreditación válidos (0–999) o dejá vacío.");
      setDraft(fila.diasAcreditacion?.toString() ?? "");
      return;
    }
    if (parsed === fila.diasAcreditacion) return;

    startTransition(async () => {
      const res = await actualizarFinAnaCosFinaAction({
        id: fila.id,
        campos: { diasAcreditacion: parsed },
      });
      if (res.ok) {
        onFilaActualizada(res.data);
      } else {
        toast.error(res.error);
        setDraft(fila.diasAcreditacion?.toString() ?? "");
      }
    });
  }

  return (
    <div className="flex items-center justify-center gap-1">
      {saving && <Loader2 className="h-3 w-3 animate-spin text-muted-foreground" />}
      <Input
        value={draft}
        onChange={(event) => setDraft(event.target.value)}
        onBlur={guardar}
        onKeyDown={(event) => {
          if (event.key === "Enter") {
            event.currentTarget.blur();
          }
        }}
        inputMode="numeric"
        autoComplete="off"
        disabled={saving}
        className="h-[calc(var(--tabla-body-row-min-height)-0.5rem)] w-20 min-w-0 max-h-full px-2 py-0 text-center text-xs tabular-nums"
        aria-label={`Días de acreditación ${etiquetaTerminalFinAnaCosFina(fila.terminal)} ${etiquetaPagoFinAnaCosFina(fila.pago)}`}
      />
    </div>
  );
}

function CeldaCostoFinanciero({
  fila,
  esEditor,
  onFilaActualizada,
}: {
  fila: FinAnaCosFinaFila;
  esEditor: boolean;
  onFilaActualizada: (fila: FinAnaCosFinaFila) => void;
}) {
  const [draft, setDraft] = useState(() => porcentajeCentFromNumber(fila.costoFinanciero));
  const [saving, startTransition] = useTransition();

  if (!esEditor) {
    return (
      <span className="block w-full text-center text-xs tabular-nums text-muted-foreground">
        {fmtPorcentajeTabla(fila.costoFinanciero) || "—"}
      </span>
    );
  }

  function guardar() {
    const parsed = parsePorcentajeCentNormalized(draft);
    if (parsed === undefined) {
      toast.error("Ingresá un costo financiero válido (0–100).");
      setDraft(porcentajeCentFromNumber(fila.costoFinanciero));
      return;
    }
    if (parsed === fila.costoFinanciero) return;

    startTransition(async () => {
      const res = await actualizarFinAnaCosFinaAction({
        id: fila.id,
        campos: { costoFinanciero: parsed },
      });
      if (res.ok) {
        onFilaActualizada(res.data);
      } else {
        toast.error(res.error);
        setDraft(porcentajeCentFromNumber(fila.costoFinanciero));
      }
    });
  }

  return (
    <div className="flex items-center justify-center gap-1">
      {saving && <Loader2 className="h-3 w-3 animate-spin text-muted-foreground" />}
      <PorcentajeCentInput
        valueNormalized={draft}
        onValueNormalizedChange={setDraft}
        onCommit={guardar}
        disabled={saving}
        className="h-[calc(var(--tabla-body-row-min-height)-0.5rem)] w-28 min-w-0 max-h-full px-2 py-0 text-center text-xs"
        aria-label={`Costo financiero ${etiquetaTerminalFinAnaCosFina(fila.terminal)} ${etiquetaPagoFinAnaCosFina(fila.pago)}`}
      />
    </div>
  );
}

export default function TablaFinAnaCosFina({ filas, esEditor, onFilaActualizada }: Props) {
  return (
    <div className="contenedor-tabla-gestion flex min-h-0 flex-1 flex-col overflow-hidden">
      <div className="min-h-0 flex-1 overflow-x-hidden overflow-y-auto">
        <Table variant="compact">
          <TableHeader>
            <TableRow>
              <TableHead className="w-[10%]">HABILITADO</TableHead>
              <TableHead className="w-[18%]">TERMINAL</TableHead>
              <TableHead className="w-[18%]">PAGO</TableHead>
              <TableHead className="w-[14%]">DÍAS ACRED.</TableHead>
              <TableHead className="w-[14%]">ARANCEL</TableHead>
              <TableHead className="w-[16%]">COSTO FIN.</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {filas.map((fila) => (
              <TableRow key={fila.id}>
                <TableCell className="celda-datos celda-datos--accion-relleno-fila">
                  <CeldaHabilitado
                    fila={fila}
                    esEditor={esEditor}
                    onFilaActualizada={onFilaActualizada}
                  />
                </TableCell>
                <TableCell className="celda-datos text-center text-xs font-medium">
                  {etiquetaTerminalFinAnaCosFina(fila.terminal)}
                </TableCell>
                <TableCell className="celda-datos text-center text-xs">
                  {etiquetaPagoFinAnaCosFina(fila.pago)}
                </TableCell>
                <TableCell className="celda-datos">
                  <CeldaDiasAcreditacion
                    key={`${fila.id}-dias-${fila.diasAcreditacion ?? "null"}`}
                    fila={fila}
                    esEditor={esEditor}
                    onFilaActualizada={onFilaActualizada}
                  />
                </TableCell>
                <TableCell className="celda-datos text-center text-xs tabular-nums text-muted-foreground">
                  {fmtPorcentajeTabla(fila.arancel) || "—"}
                </TableCell>
                <TableCell className="celda-datos">
                  <CeldaCostoFinanciero
                    key={`${fila.id}-costo-${fila.costoFinanciero}`}
                    fila={fila}
                    esEditor={esEditor}
                    onFilaActualizada={onFilaActualizada}
                  />
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </div>
    </div>
  );
}
