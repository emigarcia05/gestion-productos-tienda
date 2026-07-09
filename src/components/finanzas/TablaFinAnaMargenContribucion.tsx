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
import PorcentajeEnteroMaskInput from "@/components/shared/PorcentajeEnteroMaskInput";
import PxListaEnteroInput from "@/components/shared/PxListaEnteroInput";
import { fmtPrecio } from "@/lib/format";
import { fmtPorcentajeDosDecimalesFinAnaCosFina } from "@/lib/finAnaCosFina";
import {
  calcularValoresMargenContribucion,
  esFilaEditableMargenContribucion,
  esFilaPorFormaPagoMargenContribucion,
  etiquetaFilaMargenContribucion,
  etiquetaFormaPagoMargenContribucion,
  FIN_ANA_MC_LAYOUT,
  mcMargenContribucionPorFormaPago,
  subtotalCostosMargenContribucionPorFormaPago,
  type FilaMargenContribucionDatoId,
  type FormaPagoMargenContribucion,
  type TipoComprobanteVentaMargenContribucion,
} from "@/lib/finAnaMargenContribucion";
import {
  parsePxListaEnteroNormalized,
  pxListaEnteroFromNumber,
} from "@/lib/pxListaEnteroMask";
import type { CxFinancieroPorFormaPago } from "@/lib/finAnaMargenContribucion";
import { cn } from "@/lib/utils";

/** Tope descuento entero en Margen Contribución. */
const DESCUENTO_MC_MAX_ENTERO = 100;

const INPUT_FILA_CLASS =
  "h-[calc(var(--tabla-body-row-min-height)-0.5rem)] min-w-0 max-h-full text-xs tabular-nums";

const INPUT_MARGEN_DESCUENTO_CLASS = cn(
  INPUT_FILA_CLASS,
  "max-w-[8rem] border border-primary rounded-md"
);

export type InputsMargenContribucionState = {
  pxListaNorm: string;
  /** Entero 0–100 (%). */
  descuentoPct: number;
};

interface Props {
  formasPago: FormaPagoMargenContribucion[];
  cxFinancieroPorFormaPago: CxFinancieroPorFormaPago;
  inputs: InputsMargenContribucionState;
  onInputsChange: (next: InputsMargenContribucionState) => void;
  porcUtilidadPct: number;
  tipoComprobante: TipoComprobanteVentaMargenContribucion;
  pxListaEditable: boolean;
  esEditor: boolean;
}

function fmtMontoTabla(n: number | null | undefined): string {
  if (n == null || Number.isNaN(n)) return "—";
  if (n <= 0) return "—";
  return fmtPrecio(n);
}

function fmtDescuentoEnteroTabla(n: number | null | undefined): string {
  if (n == null || n <= 0) return "—";
  return `${Math.round(n).toLocaleString("es-AR")}%`;
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
  porcUtilidadPct,
  tipoComprobante,
  pxListaEditable,
  esEditor,
}: Props) {
  const parsed = useMemo(() => {
    const pxLista = parsePxListaEnteroNormalized(inputs.pxListaNorm) ?? 0;
    const descuentoPct = inputs.descuentoPct;
    const calculados = calcularValoresMargenContribucion({
      pxLista,
      descuentoPct,
      porcUtilidadPct,
      tipoComprobante,
    });
    return { pxLista, descuentoPct, porcUtilidadPct, calculados };
  }, [inputs, porcUtilidadPct, tipoComprobante]);

  function renderValorDato(
    filaId: FilaMargenContribucionDatoId,
    formaPago: FormaPagoMargenContribucion
  ): string {
    const { calculados } = parsed;
    const cxFinPct = cxFinancieroPorFormaPago[formaPago];

    switch (filaId) {
      case "PX_LISTA":
        return fmtMontoTabla(parsed.pxLista);
      case "DESCUENTO":
        return fmtDescuentoEnteroTabla(parsed.descuentoPct);
      case "PX_VENTA":
        return fmtMontoTabla(calculados.precioVenta);
      case "IVA":
        return fmtMontoTabla(calculados.iva);
      case "IIBB":
        return fmtMontoTabla(calculados.iibb);
      case "CX_MERCADERIA":
        return fmtMontoTabla(calculados.cxMercaderia);
      case "CX_FINANCIERO":
        return fmtPorcentajeTabla(cxFinPct);
      case "MC": {
        const mc = mcMargenContribucionPorFormaPago(calculados, cxFinPct);
        return fmtMontoTabla(mc);
      }
      default:
        return "—";
    }
  }

  function renderSubtotalCostos(formaPago: FormaPagoMargenContribucion): string {
    const subtotal = subtotalCostosMargenContribucionPorFormaPago(
      parsed.calculados,
      cxFinancieroPorFormaPago[formaPago]
    );
    return fmtMontoTabla(subtotal);
  }

  function renderInputEditable(filaId: FilaMargenContribucionDatoId) {
    if (filaId === "DESCUENTO") {
      return (
        <PorcentajeEnteroMaskInput
          value={inputs.descuentoPct}
          min={0}
          max={DESCUENTO_MC_MAX_ENTERO}
          onValueChange={(next) =>
            onInputsChange({ ...inputs, descuentoPct: next })
          }
          className={INPUT_MARGEN_DESCUENTO_CLASS}
          aria-label="Descuento"
        />
      );
    }

    if (!esEditor) {
      return (
        <span className="tabular-nums text-foreground">
          {renderValorDato(filaId, formasPago[0])}
        </span>
      );
    }

    if (filaId === "PX_LISTA") {
      if (!pxListaEditable) {
        return (
          <span className="tabular-nums text-foreground">
            {renderValorDato(filaId, formasPago[0])}
          </span>
        );
      }
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

    return null;
  }

  function renderCeldasDatos(filaId: FilaMargenContribucionDatoId) {
    if (esFilaEditableMargenContribucion(filaId)) {
      return (
        <TableCell
          colSpan={formasPago.length}
          className="celda-datos celda-numero border-l border-border"
        >
          <div className="flex justify-center">{renderInputEditable(filaId)}</div>
        </TableCell>
      );
    }

    if (esFilaPorFormaPagoMargenContribucion(filaId)) {
      return formasPago.map((forma) => (
        <TableCell
          key={`${filaId}-${forma}`}
          className={cn(
            "celda-datos celda-numero border-l border-border tabular-nums",
            filaId === "MC" && "font-semibold"
          )}
        >
          {renderValorDato(filaId, forma)}
        </TableCell>
      ));
    }

    return formasPago.map((forma, index) => (
      <TableCell
        key={`${filaId}-${forma}`}
        className={cn(
          "celda-datos celda-numero tabular-nums",
          index === 0 && "border-l border-border",
          filaId === "PX_VENTA" && "font-semibold"
        )}
      >
        {renderValorDato(filaId, forma)}
      </TableCell>
    ));
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
        {FIN_ANA_MC_LAYOUT.map((fila) => {
          if (fila.tipo === "espacio") {
            return (
              <TableRow
                key={fila.id}
                className="tabla-fila-mc-espacio hover:bg-transparent"
                aria-hidden
              >
                <TableCell colSpan={1 + formasPago.length} className="!p-0 !h-3" />
              </TableRow>
            );
          }

          if (fila.tipo === "subtotal") {
            return (
              <TableRow
                key={fila.id}
                className="tabla-fila-mc-subtotal hover:bg-transparent"
              >
                <TableCell className="celda-datos !border-0" />
                {formasPago.map((forma) => (
                  <TableCell
                    key={`${fila.id}-${forma}`}
                    className="celda-datos celda-numero tabular-nums border-l border-border font-semibold text-foreground"
                  >
                    {renderSubtotalCostos(forma)}
                  </TableCell>
                ))}
              </TableRow>
            );
          }

          return (
            <TableRow key={fila.id}>
              <TableCell className="celda-datos font-medium">
                {etiquetaFilaMargenContribucion(fila.id)}
              </TableCell>
              {renderCeldasDatos(fila.id)}
            </TableRow>
          );
        })}
      </TableBody>
    </Table>
  );
}

/** Valores por defecto vacíos para simulación. */
export const INPUTS_MARGEN_CONTRIBUCION_VACIOS: InputsMargenContribucionState = {
  pxListaNorm: "",
  descuentoPct: 0,
};

/** Serializa inputs persistidos (opcional futuro). */
export function inputsMargenContribucionDesdeNumeros(params: {
  pxLista?: number | null;
  descuentoPct?: number | null;
}): InputsMargenContribucionState {
  return {
    pxListaNorm: pxListaEnteroFromNumber(params.pxLista ?? null),
    descuentoPct:
      params.descuentoPct != null && params.descuentoPct >= 0
        ? Math.min(Math.round(params.descuentoPct), DESCUENTO_MC_MAX_ENTERO)
        : 0,
  };
}
