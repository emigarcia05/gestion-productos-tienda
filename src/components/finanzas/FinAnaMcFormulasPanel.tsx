"use client";

import { useMemo, useState } from "react";
import { cn } from "@/lib/utils";
import PxListaEnteroInput from "@/components/shared/PxListaEnteroInput";
import PorcentajeCentInput from "@/components/shared/PorcentajeCentInput";
import {
  PORCENTAJE_CENT_MASK_MAX_CENTS,
  porcentajeCentFromNumber,
  parsePorcentajeCentNormalized,
} from "@/lib/porcentajeCentMask";
import {
  parsePxListaEnteroNormalized,
  pxListaEnteroFromNumber,
} from "@/lib/pxListaEnteroMask";
import {
  resolverParametrosFormulaMargenContribucion,
  type FinAnaMcFormulaCodigo,
  type FinAnaMcFormulaItem,
} from "@/lib/finAnaMcFormulas";
import { actualizarFormulaMargenContribucionAction } from "@/actions/finAnaMargenContribucion";
import { toast } from "sonner";

type Props = {
  formulasIniciales: FinAnaMcFormulaItem[];
  esEditor: boolean;
  onFormulasChange: (items: FinAnaMcFormulaItem[]) => void;
};

function etiquetaCampo(codigo: FinAnaMcFormulaCodigo): string {
  switch (codigo) {
    case "PX_LISTA_C_IVA":
      return "PX LISTA C/ IVA";
    case "IVA_ALICUOTA":
      return "IVA";
    case "IIBB_ALICUOTA":
      return "IIBB";
    default:
      return codigo;
  }
}

export default function FinAnaMcFormulasPanel({
  formulasIniciales,
  esEditor,
  onFormulasChange,
}: Props) {
  const [formulas, setFormulas] = useState(formulasIniciales);
  const params = useMemo(
    () => resolverParametrosFormulaMargenContribucion(formulas),
    [formulas]
  );

  const [pxListaNorm, setPxListaNorm] = useState(() =>
    pxListaEnteroFromNumber(params.pxListaCIva)
  );
  const [ivaNorm, setIvaNorm] = useState(() =>
    porcentajeCentFromNumber(params.ivaAlicuota * 100)
  );
  const [iibbNorm, setIibbNorm] = useState(() =>
    porcentajeCentFromNumber(params.iibbAlicuota * 100)
  );

  const pxListaSIva = params.pxListaCIva / params.ivaFactor;

  async function persistir(codigo: FinAnaMcFormulaCodigo, valor: number) {
    if (!esEditor) return;
    const res = await actualizarFormulaMargenContribucionAction({ codigo, valor });
    if (!res.ok) {
      toast.error(res.error ?? "No se pudo guardar la variable.");
      return;
    }
    setFormulas(res.data);
    onFormulasChange(res.data);
  }

  async function commitPxLista() {
    const valor = parsePxListaEnteroNormalized(pxListaNorm);
    if (valor == null) {
      setPxListaNorm(pxListaEnteroFromNumber(params.pxListaCIva));
      return;
    }
    if (valor === params.pxListaCIva) return;
    await persistir("PX_LISTA_C_IVA", valor);
  }

  async function commitAlicuota(
    codigo: "IVA_ALICUOTA" | "IIBB_ALICUOTA",
    norm: string,
    actual: number,
    reset: (next: string) => void
  ) {
    const pct = parsePorcentajeCentNormalized(norm, PORCENTAJE_CENT_MASK_MAX_CENTS);
    if (pct == null || pct < 0) {
      reset(porcentajeCentFromNumber(actual * 100));
      return;
    }
    if (codigo === "IVA_ALICUOTA" && !(pct > 0)) {
      reset(porcentajeCentFromNumber(actual * 100));
      return;
    }
    const valor = pct / 100;
    if (Math.abs(valor - actual) < 1e-9) return;
    await persistir(codigo, valor);
  }

  return (
    <section
      className={cn(
        "shrink-0 rounded-md border border-border bg-card px-3 py-2",
        "flex flex-wrap items-end gap-x-4 gap-y-2"
      )}
      aria-label="Variables de fórmula"
    >
      <p className="w-full text-xs font-bold uppercase tracking-wide text-foreground">
        Variables
      </p>

      <label className="flex min-w-[7.5rem] flex-col gap-1">
        <span className="text-xs font-medium text-foreground">
          {etiquetaCampo("PX_LISTA_C_IVA")}
        </span>
        <PxListaEnteroInput
          valueNormalized={pxListaNorm}
          onValueNormalizedChange={setPxListaNorm}
          onCommit={() => {
            void commitPxLista();
          }}
          className="input-filtro-unificado w-full max-w-[8rem] border-primary text-xs"
          aria-label={etiquetaCampo("PX_LISTA_C_IVA")}
          disabled={!esEditor}
        />
      </label>

      <div className="flex min-w-[7.5rem] flex-col gap-1">
        <span className="text-xs font-medium text-foreground">PX LISTA S/ IVA</span>
        <p
          className="flex h-10 max-w-[8rem] items-center rounded-md border border-border bg-muted/40 px-2 text-xs tabular-nums text-foreground"
          title={`PX LISTA C/ IVA / ${params.ivaFactor.toLocaleString("es-AR")}`}
        >
          {pxListaSIva.toLocaleString("es-AR", {
            minimumFractionDigits: 2,
            maximumFractionDigits: 4,
          })}
        </p>
      </div>

      <label className="flex min-w-[6.5rem] flex-col gap-1">
        <span className="text-xs font-medium text-foreground">
          {etiquetaCampo("IVA_ALICUOTA")}
        </span>
        <PorcentajeCentInput
          valueNormalized={ivaNorm}
          maxCents={PORCENTAJE_CENT_MASK_MAX_CENTS}
          onValueNormalizedChange={setIvaNorm}
          onCommit={() => {
            void commitAlicuota(
              "IVA_ALICUOTA",
              ivaNorm,
              params.ivaAlicuota,
              setIvaNorm
            );
          }}
          className="input-filtro-unificado w-full max-w-[6.5rem] border-primary text-xs"
          aria-label={etiquetaCampo("IVA_ALICUOTA")}
          disabled={!esEditor}
        />
      </label>

      <label className="flex min-w-[6.5rem] flex-col gap-1">
        <span className="text-xs font-medium text-foreground">
          {etiquetaCampo("IIBB_ALICUOTA")}
        </span>
        <PorcentajeCentInput
          valueNormalized={iibbNorm}
          maxCents={PORCENTAJE_CENT_MASK_MAX_CENTS}
          onValueNormalizedChange={setIibbNorm}
          onCommit={() => {
            void commitAlicuota(
              "IIBB_ALICUOTA",
              iibbNorm,
              params.iibbAlicuota,
              setIibbNorm
            );
          }}
          className="input-filtro-unificado w-full max-w-[6.5rem] border-primary text-xs"
          aria-label={etiquetaCampo("IIBB_ALICUOTA")}
          disabled={!esEditor}
        />
      </label>

      <div className="flex min-w-[6.5rem] flex-col gap-1">
        <span className="text-xs font-medium text-foreground">FACTOR IVA</span>
        <p
          className="flex h-10 max-w-[6.5rem] items-center rounded-md border border-border bg-muted/40 px-2 text-xs tabular-nums text-foreground"
          title="1 + IVA ALÍCUOTA"
        >
          {params.ivaFactor.toLocaleString("es-AR", {
            minimumFractionDigits: 2,
            maximumFractionDigits: 4,
          })}
        </p>
      </div>
    </section>
  );
}
