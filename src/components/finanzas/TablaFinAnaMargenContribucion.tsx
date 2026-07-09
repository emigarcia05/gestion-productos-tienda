"use client";

import { useMemo } from "react";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import PorcentajeCentInput from "@/components/shared/PorcentajeCentInput";
import PxListaEnteroInput from "@/components/shared/PxListaEnteroInput";
import { fmtPrecio } from "@/lib/format";
import { fmtPorcentajeDosDecimalesFinAnaCosFina } from "@/lib/finAnaCosFina";
import {
  calcularValoresMargenContribucion,
  esFilaEditableMargenContribucion,
  esFilaPorFormaPagoMargenContribucion,
  etiquetaFilaMargenContribucion,
  etiquetaFormaPagoMargenContribucion,
  FIN_ANA_MC_FILAS,
  type FilaMargenContribucionId,
  type FormaPagoMargenContribucion,
} from "@/lib/finAnaMargenContribucion";
import {
  parsePxListaEnteroNormalized,
  pxListaEnteroFromNumber,
} from "@/lib/pxListaEnteroMask";
import {
  parsePorcentajeCentNormalized,
  porcentajeCentFromNumber,
} from "@/lib/porcentajeCentMask";
import { MARGEN_PX_LISTA_MAX_CENTS } from "@/lib/pxListasPreciosFormat";
import type { CxFinancieroPorFormaPago } from "@/lib/finAnaMargenContribucion";
import { cn } from "@/lib/utils";

/** Tope descuento: 100,00 %. */
const DESCUENTO_MC_MAX_CENTS = 10_000;

const INPUT_FILA_CLASS =
  "h-[calc(var(--tabla-body-row-min-height)-0.5rem)] min-w-0 max-h-full text-xs tabular-nums";

export type InputsMargenContribucionState = {
  pxListaNorm: string;
  descuentoNorm: string;
  porcUtilidadNorm: string;
};

interface Props {
  formasPago: FormaPagoMargenContribucion[];
  cxFinancieroPorFormaPago: CxFinancieroPorFormaPago;
  inputs: InputsMargenContribucionState;
  onInputsChange: (next: InputsMargenContribucionState) => void;
  esEditor: boolean;
}

function fmtMontoTabla(n: number | null | undefined): string {
  if (n == null || !(n > 0)) return "—";
  return fmtPrecio(n);
}

function fmtPorcentajeTabla(n: number | null | undefined): string {
  if (n == null || Number.isNaN(n)) return "—";
  return `${fmtPorcentajeDosDecimalesFinAnaCosFina(n)}%`;
}

export default function TablaFinAnaMargenContribucion({
  formasPago,
  cxFinancieroPorFormaPago,
  inputs,
  onInputsChange,
  esEditor,
}: Props) {
  const parsed = useMemo(() => {
    const pxLista = parsePxListaEnteroNormalized(inputs.pxListaNorm) ?? 0;
    const descuentoPct =
      parsePorcentajeCentNormalized(inputs.descuentoNorm, DESCUENTO_MC_MAX_CENTS) ?? 0;
    const porcUtilidadPct =
      parsePorcentajeCentNormalized(inputs.porcUtilidadNorm, MARGEN_PX_LISTA_MAX_CENTS) ??
      0;
    const calculados = calcularValoresMargenContribucion({
      pxLista,
      descuentoPct,
      porcUtilidadPct,
    });
    return { pxLista, descuentoPct, porcUtilidadPct, calculados };
  }, [inputs]);

  function renderValorFila(
    filaId: FilaMargenContribucionId,
    formaPago: FormaPagoMargenContribucion
  ): string {
    const { calculados } = parsed;
    switch (filaId) {
      case "PX_LISTA":
        return fmtMontoTabla(parsed.pxLista);
      case "DESCUENTO":
        return parsed.descuentoPct > 0
          ? fmtPorcentajeTabla(parsed.descuentoPct)
          : "—";
      case "PORC_UTILIDAD":
        return parsed.porcUtilidadPct > 0
          ? fmtPorcentajeTabla(parsed.porcUtilidadPct)
          : "—";
      case "PRECIO_VENTA":
        return fmtMontoTabla(calculados.precioVenta);
      case "IVA":
        return fmtMontoTabla(calculados.iva);
      case "IIBB":
        return fmtMontoTabla(calculados.iibb);
      case "CX_MERCADERIA":
        return fmtMontoTabla(calculados.cxMercaderia);
      case "CX_FINANCIERO":
        return fmtPorcentajeTabla(cxFinancieroPorFormaPago[formaPago]);
      default:
        return "—";
    }
  }

  function renderInputEditable(filaId: FilaMargenContribucionId) {
    if (!esEditor) {
      return (
        <span className="tabular-nums text-foreground">
          {filaId === "PX_LISTA"
            ? fmtMontoTabla(parsed.pxLista)
            : filaId === "DESCUENTO"
              ? parsed.descuentoPct > 0
                ? fmtPorcentajeTabla(parsed.descuentoPct)
                : "—"
              : parsed.porcUtilidadPct > 0
                ? fmtPorcentajeTabla(parsed.porcUtilidadPct)
                : "—"}
        </span>
      );
    }

    if (filaId === "PX_LISTA") {
      return (
        <PxListaEnteroInput
          valueNormalized={inputs.pxListaNorm}
          onValueNormalizedChange={(next) =>
            onInputsChange({ ...inputs, pxListaNorm: next })
          }
          className={cn(INPUT_FILA_CLASS, "max-w-[12rem] border-primary")}
          aria-label="Px lista"
        />
      );
    }

    if (filaId === "DESCUENTO") {
      return (
        <PorcentajeCentInput
          valueNormalized={inputs.descuentoNorm}
          maxCents={DESCUENTO_MC_MAX_CENTS}
          onValueNormalizedChange={(next) =>
            onInputsChange({ ...inputs, descuentoNorm: next })
          }
          className={cn(INPUT_FILA_CLASS, "max-w-[8rem] border-primary")}
          aria-label="Descuento"
        />
      );
    }

    return (
      <PorcentajeCentInput
        valueNormalized={inputs.porcUtilidadNorm}
        maxCents={MARGEN_PX_LISTA_MAX_CENTS}
        onValueNormalizedChange={(next) =>
          onInputsChange({ ...inputs, porcUtilidadNorm: next })
        }
        className={cn(INPUT_FILA_CLASS, "max-w-[8rem] border-primary")}
        aria-label="Porc. utilidad"
      />
    );
  }

  return (
    <Table
      variant="compact"
      scrollX
      className="tabla-fin-ana-margen-contribucion min-w-max"
    >
      <colgroup>
        <col className="w-[10rem]" />
        {formasPago.map((forma) => (
          <col key={forma} className="w-[6.5rem]" />
        ))}
      </colgroup>
      <TableHeader>
        <TableRow>
          <TableHead className="text-center">CONCEPTO</TableHead>
          {formasPago.map((forma) => (
            <TableHead
              key={forma}
              className="text-center border-l border-primary-foreground/25 leading-tight"
            >
              {etiquetaFormaPagoMargenContribucion(forma).toUpperCase()}
            </TableHead>
          ))}
        </TableRow>
      </TableHeader>
      <TableBody>
        {FIN_ANA_MC_FILAS.map((filaId) => (
          <TableRow key={filaId}>
            <TableCell className="celda-datos font-medium">
              {etiquetaFilaMargenContribucion(filaId)}
            </TableCell>
            {esFilaEditableMargenContribucion(filaId) ? (
              <TableCell
                colSpan={formasPago.length}
                className="celda-datos celda-numero border-l border-border"
              >
                {renderInputEditable(filaId)}
              </TableCell>
            ) : esFilaPorFormaPagoMargenContribucion(filaId) ? (
              formasPago.map((forma) => (
                <TableCell
                  key={`${filaId}-${forma}`}
                  className="celda-datos celda-numero border-l border-border tabular-nums"
                >
                  {renderValorFila(filaId, forma)}
                </TableCell>
              ))
            ) : (
              formasPago.map((forma, index) => (
                <TableCell
                  key={`${filaId}-${forma}`}
                  className={cn(
                    "celda-datos celda-numero tabular-nums",
                    index === 0 && "border-l border-border"
                  )}
                >
                  {renderValorFila(filaId, forma)}
                </TableCell>
              ))
            )}
          </TableRow>
        ))}
      </TableBody>
    </Table>
  );
}

/** Valores por defecto vacíos para simulación. */
export const INPUTS_MARGEN_CONTRIBUCION_VACIOS: InputsMargenContribucionState = {
  pxListaNorm: "",
  descuentoNorm: "",
  porcUtilidadNorm: "",
};

/** Serializa inputs persistidos (opcional futuro). */
export function inputsMargenContribucionDesdeNumeros(params: {
  pxLista?: number | null;
  descuentoPct?: number | null;
  porcUtilidadPct?: number | null;
}): InputsMargenContribucionState {
  return {
    pxListaNorm: pxListaEnteroFromNumber(params.pxLista ?? null),
    descuentoNorm:
      params.descuentoPct != null && params.descuentoPct > 0
        ? porcentajeCentFromNumber(params.descuentoPct, DESCUENTO_MC_MAX_CENTS)
        : "",
    porcUtilidadNorm:
      params.porcUtilidadPct != null && params.porcUtilidadPct > 0
        ? porcentajeCentFromNumber(
            params.porcUtilidadPct,
            MARGEN_PX_LISTA_MAX_CENTS
          )
        : "",
  };
}
