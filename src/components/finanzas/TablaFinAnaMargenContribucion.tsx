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
  crearDescuentoPctPorFormaPagoVacios,
  esFilaDescuentoPorFormaPagoMargenContribucion,
  esFilaEditableMargenContribucion,
  esFilaPorFormaPagoMargenContribucion,
  etiquetaFilaMargenContribucion,
  etiquetaFormaPagoMargenContribucion,
  FIN_ANA_MC_DESCUENTO_MAX,
  FIN_ANA_MC_DESCUENTO_MIN,
  FIN_ANA_MC_LAYOUT,
  mcMargenContribucionPorFormaPago,
  subtotalCostosMargenContribucionPorFormaPago,
  type FilaMargenContribucionDatoId,
  type FormaPagoMargenContribucion,
  type TipoComprobanteVentaMargenContribucion,
  type ValoresCalculadosMargenContribucion,
} from "@/lib/finAnaMargenContribucion";
import {
  parsePxListaEnteroNormalized,
  pxListaEnteroFromNumber,
} from "@/lib/pxListaEnteroMask";
import type { CxFinancieroPorFormaPago } from "@/lib/finAnaMargenContribucion";
import type { FinAnaCosFinaPagoItem } from "@/lib/finAnaCosFinaPagos";
import { cn } from "@/lib/utils";

const INPUT_FILA_CLASS =
  "h-[calc(var(--tabla-body-row-min-height)-0.5rem)] min-w-0 max-h-full text-xs tabular-nums";

const INPUT_MARGEN_DESCUENTO_CLASS = cn(
  INPUT_FILA_CLASS,
  "w-full max-w-full border border-primary rounded-md"
);

export type InputsMargenContribucionState = {
  pxListaNorm: string;
  /** Entero 0–100 (%) por forma de pago. */
  descuentoPctPorFormaPago: Record<FormaPagoMargenContribucion, number>;
};

interface Props {
  formasPago: FormaPagoMargenContribucion[];
  pagosCatalogo: FinAnaCosFinaPagoItem[];
  cxFinancieroPorFormaPago: CxFinancieroPorFormaPago;
  inputs: InputsMargenContribucionState;
  onInputsChange: (next: InputsMargenContribucionState) => void;
  onDescuentoPorFormaPagoChange: (
    formaPago: FormaPagoMargenContribucion,
    descuentoPct: number
  ) => void | Promise<void>;
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
  if (n == null || Number.isNaN(n)) return "—";
  return `${Math.round(n).toLocaleString("es-AR")}%`;
}

function fmtPorcentajeTabla(n: number | null | undefined): string {
  if (n == null || Number.isNaN(n)) return "—";
  return `${fmtPorcentajeDosDecimalesFinAnaCosFina(n)}%`;
}

export default function TablaFinAnaMargenContribucion({
  formasPago,
  pagosCatalogo,
  cxFinancieroPorFormaPago,
  inputs,
  onInputsChange,
  onDescuentoPorFormaPagoChange,
  porcUtilidadPct,
  tipoComprobante,
  pxListaEditable,
  esEditor,
}: Props) {
  const parsed = useMemo(() => {
    const pxLista = parsePxListaEnteroNormalized(inputs.pxListaNorm) ?? 0;
    const calculadosPorFormaPago = {} as Record<
      FormaPagoMargenContribucion,
      ValoresCalculadosMargenContribucion
    >;

    for (const forma of formasPago) {
      calculadosPorFormaPago[forma] = calcularValoresMargenContribucion({
        pxLista,
        descuentoPct: inputs.descuentoPctPorFormaPago[forma] ?? 0,
        porcUtilidadPct,
        tipoComprobante,
      });
    }

    return { pxLista, calculadosPorFormaPago };
  }, [inputs, formasPago, porcUtilidadPct, tipoComprobante]);

  function calculadosParaForma(
    formaPago: FormaPagoMargenContribucion
  ): ValoresCalculadosMargenContribucion {
    return parsed.calculadosPorFormaPago[formaPago];
  }

  function renderValorDato(
    filaId: FilaMargenContribucionDatoId,
    formaPago: FormaPagoMargenContribucion
  ): string {
    const calculados = calculadosParaForma(formaPago);
    const cxFinPct = cxFinancieroPorFormaPago[formaPago];
    const descuentoPct = inputs.descuentoPctPorFormaPago[formaPago] ?? 0;

    switch (filaId) {
      case "PX_LISTA":
        return fmtMontoTabla(parsed.pxLista);
      case "DESCUENTO":
        return fmtDescuentoEnteroTabla(descuentoPct);
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
      calculadosParaForma(formaPago),
      cxFinancieroPorFormaPago[formaPago]
    );
    return fmtMontoTabla(subtotal);
  }

  function renderInputPxLista() {
    if (!pxListaEditable || !esEditor) {
      return (
        <span className="tabular-nums text-foreground">
          {renderValorDato("PX_LISTA", formasPago[0])}
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

  function renderInputDescuento(formaPago: FormaPagoMargenContribucion) {
    return (
      <PorcentajeEnteroMaskInput
        value={inputs.descuentoPctPorFormaPago[formaPago] ?? 0}
        signed
        min={FIN_ANA_MC_DESCUENTO_MIN}
        max={FIN_ANA_MC_DESCUENTO_MAX}
        onValueChange={(next) => {
          void onDescuentoPorFormaPagoChange(formaPago, next);
        }}
        className={INPUT_MARGEN_DESCUENTO_CLASS}
        aria-label={`Descuento ${etiquetaFormaPagoMargenContribucion(formaPago, pagosCatalogo)}`}
      />
    );
  }

  function renderCeldasDatos(filaId: FilaMargenContribucionDatoId) {
    if (esFilaEditableMargenContribucion(filaId)) {
      return (
        <TableCell
          colSpan={formasPago.length}
          className="celda-datos celda-numero border-l border-border"
        >
          <div className="flex justify-center">{renderInputPxLista()}</div>
        </TableCell>
      );
    }

    if (esFilaDescuentoPorFormaPagoMargenContribucion(filaId)) {
      return formasPago.map((forma, index) => (
        <TableCell
          key={`${filaId}-${forma}`}
          className={cn(
            "celda-datos celda-numero border-l border-border p-1",
            index > 0 && "border-l border-border"
          )}
        >
          <div className="flex justify-center">{renderInputDescuento(forma)}</div>
        </TableCell>
      ));
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
              {etiquetaFormaPagoMargenContribucion(forma, pagosCatalogo).toUpperCase()}
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
  descuentoPctPorFormaPago: crearDescuentoPctPorFormaPagoVacios(),
};

/** Serializa inputs persistidos (opcional futuro). */
export function inputsMargenContribucionDesdeNumeros(params: {
  pxLista?: number | null;
  descuentoPctPorFormaPago?: InputsMargenContribucionState["descuentoPctPorFormaPago"];
  formasPago?: FormaPagoMargenContribucion[];
}): InputsMargenContribucionState {
  const formasPago = params.formasPago ?? [];
  return {
    pxListaNorm: pxListaEnteroFromNumber(params.pxLista ?? null),
    descuentoPctPorFormaPago: {
      ...crearDescuentoPctPorFormaPagoVacios(formasPago),
      ...params.descuentoPctPorFormaPago,
    },
  };
}
