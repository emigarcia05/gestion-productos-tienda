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
import {
  cxTerminalConIvaFinAnaCosFina,
  cxTerminalSinIvaFinAnaCosFina,
  etiquetaPagoFinAnaCosFina,
  etiquetaTerminalFinAnaCosFina,
  fmtPorcentajeDosDecimalesFinAnaCosFina,
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

const INPUT_FILA_CLASS =
  "h-[calc(var(--tabla-body-row-min-height)-0.5rem)] min-w-0 max-h-full px-2 py-0 text-center text-xs tabular-nums border-primary";

type CampoDecimalFinAnaCosFina = "arancel" | "costoFinanciero";

const ETIQUETAS_CAMPO_DECIMAL: Record<CampoDecimalFinAnaCosFina, string> = {
  arancel: "Arancel",
  costoFinanciero: "Cx. financiero",
};

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

  function guardar() {
    if (!esEditor) return;

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
        onChange={(event) => {
          if (!esEditor) return;
          setDraft(event.target.value);
        }}
        onBlur={guardar}
        onKeyDown={(event) => {
          if (event.key === "Enter") {
            event.currentTarget.blur();
          }
        }}
        inputMode="numeric"
        autoComplete="off"
        readOnly={!esEditor}
        disabled={saving}
        className={cn(INPUT_FILA_CLASS, "w-20")}
        aria-label={`Días de acreditación ${etiquetaTerminalFinAnaCosFina(fila.terminal)} ${etiquetaPagoFinAnaCosFina(fila.pago)}`}
      />
    </div>
  );
}

function CeldaDecimalDosDecimales({
  fila,
  campo,
  esEditor,
  onFilaActualizada,
}: {
  fila: FinAnaCosFinaFila;
  campo: CampoDecimalFinAnaCosFina;
  esEditor: boolean;
  onFilaActualizada: (fila: FinAnaCosFinaFila) => void;
}) {
  const valorPersistido = fila[campo];
  const [draft, setDraft] = useState(() => porcentajeCentFromNumber(valorPersistido));
  const [saving, startTransition] = useTransition();
  const etiquetaCampo = ETIQUETAS_CAMPO_DECIMAL[campo];

  function guardar() {
    if (!esEditor) return;

    const parsed = parsePorcentajeCentNormalized(draft);
    if (parsed === undefined) {
      toast.error(`Ingresá un ${etiquetaCampo.toLowerCase()} válido (0–100).`);
      setDraft(porcentajeCentFromNumber(valorPersistido));
      return;
    }
    if (parsed === valorPersistido) return;

    startTransition(async () => {
      const res = await actualizarFinAnaCosFinaAction({
        id: fila.id,
        campos: { [campo]: parsed },
      });
      if (res.ok) {
        onFilaActualizada(res.data);
      } else {
        toast.error(res.error);
        setDraft(porcentajeCentFromNumber(valorPersistido));
      }
    });
  }

  return (
    <div className="flex items-center justify-center gap-1">
      {saving && <Loader2 className="h-3 w-3 animate-spin text-muted-foreground" />}
      <PorcentajeCentInput
        valueNormalized={draft}
        onValueNormalizedChange={(next) => {
          if (!esEditor) return;
          setDraft(next);
        }}
        onCommit={guardar}
        showPctSuffix={false}
        readOnly={!esEditor}
        disabled={saving}
        className={cn(INPUT_FILA_CLASS, "w-24")}
        aria-label={`${etiquetaCampo} ${etiquetaTerminalFinAnaCosFina(fila.terminal)} ${etiquetaPagoFinAnaCosFina(fila.pago)}`}
      />
    </div>
  );
}

function CeldaPorcentajeCalculado({ valor, etiqueta }: { valor: number; etiqueta: string }) {
  return (
    <Input
      readOnly
      tabIndex={-1}
      value={fmtPorcentajeDosDecimalesFinAnaCosFina(valor)}
      className={cn(INPUT_FILA_CLASS, "w-24 cursor-default bg-muted/30")}
      aria-label={etiqueta}
    />
  );
}

export default function TablaFinAnaCosFina({ filas, esEditor, onFilaActualizada }: Props) {
  return (
    <div className="contenedor-tabla-gestion flex min-h-0 flex-1 flex-col overflow-hidden">
      <div className="min-h-0 flex-1 overflow-x-hidden overflow-y-auto">
        <Table variant="compact">
          <TableHeader>
            <TableRow>
              <TableHead className="w-[8%]">HABILITADO</TableHead>
              <TableHead className="w-[12%]">TERMINAL</TableHead>
              <TableHead className="w-[12%]">PAGO</TableHead>
              <TableHead className="w-[10%]">DÍAS ACRED.</TableHead>
              <TableHead className="w-[10%]">ARANCEL</TableHead>
              <TableHead className="w-[10%]">CX FINANCIERO</TableHead>
              <TableHead className="w-[12%]">CX TERMINAL S/ IVA</TableHead>
              <TableHead className="w-[12%]">CX TERMINAL C/ IVA</TableHead>
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
                <TableCell className="celda-datos">
                  <CeldaDecimalDosDecimales
                    key={`${fila.id}-arancel-${fila.arancel}`}
                    fila={fila}
                    campo="arancel"
                    esEditor={esEditor}
                    onFilaActualizada={onFilaActualizada}
                  />
                </TableCell>
                <TableCell className="celda-datos">
                  <CeldaDecimalDosDecimales
                    key={`${fila.id}-cxfin-${fila.costoFinanciero}`}
                    fila={fila}
                    campo="costoFinanciero"
                    esEditor={esEditor}
                    onFilaActualizada={onFilaActualizada}
                  />
                </TableCell>
                <TableCell className="celda-datos">
                  <CeldaPorcentajeCalculado
                    valor={cxTerminalSinIvaFinAnaCosFina(fila.arancel, fila.costoFinanciero)}
                    etiqueta={`Cx. terminal sin IVA ${etiquetaTerminalFinAnaCosFina(fila.terminal)} ${etiquetaPagoFinAnaCosFina(fila.pago)}`}
                  />
                </TableCell>
                <TableCell className="celda-datos">
                  <CeldaPorcentajeCalculado
                    valor={cxTerminalConIvaFinAnaCosFina(fila.arancel, fila.costoFinanciero)}
                    etiqueta={`Cx. terminal con IVA ${etiquetaTerminalFinAnaCosFina(fila.terminal)} ${etiquetaPagoFinAnaCosFina(fila.pago)}`}
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
