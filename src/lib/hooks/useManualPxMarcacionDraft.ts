"use client";

import { useEffect, useState } from "react";
import {
  calcMarcacionPxLista,
  calcPxListaDesdeMarcacionPxLista,
  roundMarcacionPxLista,
} from "@/lib/pxListas";

type ManualDraft = {
  px: number;
  marcacion: number;
};

export function useManualPxMarcacionDraft(params: {
  codItem: string;
  costoCompra: number;
  pxListaManual: number | null;
  marcacionGuardada: number | null;
}) {
  const { codItem, costoCompra, pxListaManual, marcacionGuardada } = params;

  const pxCommit = pxListaManual ?? 0;
  const marcacionCommit =
    marcacionGuardada ??
    (pxCommit > 0 ? calcMarcacionPxLista(pxCommit, costoCompra) : null);

  const [draft, setDraft] = useState<ManualDraft | null>(null);

  useEffect(() => {
    setDraft(null);
  }, [codItem, pxListaManual, marcacionGuardada]);

  const pxVista = draft?.px ?? pxCommit;
  const marcacionVista =
    draft?.marcacion ??
    (marcacionCommit != null
      ? marcacionCommit
      : pxCommit > 0
        ? calcMarcacionPxLista(pxCommit, costoCompra)
        : null);

  function handlePxDraft(px: number) {
    const m = calcMarcacionPxLista(px, costoCompra);
    setDraft({ px, marcacion: m ?? 0 });
  }

  function handleMarcacionDraft(marcacion: number) {
    const px = calcPxListaDesdeMarcacionPxLista(marcacion, costoCompra) ?? 0;
    setDraft({
      px,
      marcacion: roundMarcacionPxLista(marcacion),
    });
  }

  function clearDraft() {
    setDraft(null);
  }

  function pxDesdeMarcacion(marcacion: number): number | null {
    return calcPxListaDesdeMarcacionPxLista(marcacion, costoCompra);
  }

  return {
    pxVista,
    marcacionVista,
    handlePxDraft,
    handleMarcacionDraft,
    clearDraft,
    pxDesdeMarcacion,
  };
}
