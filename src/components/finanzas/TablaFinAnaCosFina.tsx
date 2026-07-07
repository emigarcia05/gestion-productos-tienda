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
  cxImpChequeFinAnaCosFina,
  cxTerminalConIvaFinAnaCosFina,
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
  "h-[calc(var(--tabla-body-row-min-height)-0.5rem)] min-w-0 max-h-full text-xs tabular-nums";

const INPUT_FILA_PLANO_CLASS = cn(INPUT_FILA_CLASS, "border-primary px-2 py-0 text-center");

const INPUT_FILA_PORCENTAJE_CLASS = cn(INPUT_FILA_CLASS, "w-24");

type CampoBooleanoFinAnaCosFina = "habilitado" | "impCheque";

const ETIQUETAS_CAMPO_BOOLEANO: Record<CampoBooleanoFinAnaCosFina, string> = {
  habilitado: "Habilitar",
  impCheque: "Imp. cheque",
};

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

function CeldaToggleBooleano({
  fila,
  campo,
  esEditor,
  onFilaActualizada,
}: {
  fila: FinAnaCosFinaFila;
  campo: CampoBooleanoFinAnaCosFina;
  esEditor: boolean;
  onFilaActualizada: (fila: FinAnaCosFinaFila) => void;
}) {
  const [saving, startTransition] = useTransition();
  const activo = fila[campo];
  const etiquetaAccion = ETIQUETAS_CAMPO_BOOLEANO[campo];
  const contextoFila = `${etiquetaTerminalFinAnaCosFina(fila.terminal)} ${etiquetaPagoFinAnaCosFina(fila.pago)}`;

  if (!esEditor) {
    return (
      <div className="flex h-full w-full items-center justify-center">
        <CeldaHabilitadoToggleVisual activo={activo} />
      </div>
    );
  }

  function handleToggle() {
    const siguiente = !activo;
    startTransition(async () => {
      const res = await actualizarFinAnaCosFinaAction({
        id: fila.id,
        campos: { [campo]: siguiente },
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
          activo && "[&_svg]:!text-[#0072bb]"
        )}
        aria-pressed={activo}
        aria-label={`${etiquetaAccion} ${contextoFila}`}
      >
        {activo ? <Check className={TABLE_ROW_ACTION_ICON_CLASS} aria-hidden /> : null}
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
        className={cn(INPUT_FILA_PLANO_CLASS, "w-20")}
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
        readOnly={!esEditor}
        disabled={saving}
        className={INPUT_FILA_PORCENTAJE_CLASS}
        aria-label={`${etiquetaCampo} ${etiquetaTerminalFinAnaCosFina(fila.terminal)} ${etiquetaPagoFinAnaCosFina(fila.pago)}`}
      />
    </div>
  );
}

function CeldaPorcentajeCalculado({ valor, etiqueta }: { valor: number; etiqueta: string }) {
  return (
    <div
      className={cn(
        "input-mascara-sufijo flex items-center rounded-md border border-primary bg-muted/30",
        INPUT_FILA_PORCENTAJE_CLASS,
        "cursor-default"
      )}
    >
      <input
        readOnly
        tabIndex={-1}
        value={fmtPorcentajeDosDecimalesFinAnaCosFina(valor)}
        className="min-h-0 min-w-0 flex-1 cursor-default border-0 bg-transparent px-1 py-0 text-center text-xs tabular-nums shadow-none outline-none"
        aria-label={etiqueta}
      />
      <span className="input-mascara-sufijo__pct tabular-nums" aria-hidden>
        %
      </span>
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
              <TableHead className="w-[7%]">HABILITADO</TableHead>
              <TableHead className="w-[7%]">IMP. CHEQUE</TableHead>
              <TableHead className="w-[10%]">TERMINAL</TableHead>
              <TableHead className="w-[10%]">PAGO</TableHead>
              <TableHead className="w-[8%]">DÍAS ACRED.</TableHead>
              <TableHead className="w-[9%]">ARANCEL</TableHead>
              <TableHead className="w-[9%]">CX FINANCIERO</TableHead>
              <TableHead className="w-[11%]">CX TERMINAL C/ IVA</TableHead>
              <TableHead className="w-[11%]">CX IMP. CHEQUE</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {filas.map((fila) => (
              <TableRow key={fila.id}>
                <TableCell className="celda-datos celda-datos--accion-relleno-fila">
                  <CeldaToggleBooleano
                    fila={fila}
                    campo="habilitado"
                    esEditor={esEditor}
                    onFilaActualizada={onFilaActualizada}
                  />
                </TableCell>
                <TableCell className="celda-datos celda-datos--accion-relleno-fila">
                  <CeldaToggleBooleano
                    fila={fila}
                    campo="impCheque"
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
                    valor={cxTerminalConIvaFinAnaCosFina(fila.arancel, fila.costoFinanciero)}
                    etiqueta={`Cx. terminal con IVA ${etiquetaTerminalFinAnaCosFina(fila.terminal)} ${etiquetaPagoFinAnaCosFina(fila.pago)}`}
                  />
                </TableCell>
                <TableCell className="celda-datos">
                  <CeldaPorcentajeCalculado
                    valor={cxImpChequeFinAnaCosFina(fila.impCheque, fila.arancel, fila.costoFinanciero)}
                    etiqueta={`Cx. imp. cheque ${etiquetaTerminalFinAnaCosFina(fila.terminal)} ${etiquetaPagoFinAnaCosFina(fila.pago)}`}
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
