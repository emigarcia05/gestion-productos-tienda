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
import {
  calcularValoresMargenContribucion,
  crearDescuentoPctPorFormaPagoVacios,
  cxFinancieroPesosMargenContribucion,
  esFilaDescuentoPorFormaPagoMargenContribucion,
  esFilaEditableMargenContribucion,
  esFilaPorFormaPagoMargenContribucion,
  etiquetaFilaMargenContribucion,
  etiquetaFormaPagoMargenContribucion,
  FIN_ANA_MC_DESCUENTO_MAX,
  FIN_ANA_MC_DESCUENTO_MIN,
  FIN_ANA_MC_SECCIONES,
  fmtCeldaMontoMargenContribucion,
  fmtPesosMargenContribucion,
  fmtPctSobrePxListaMargenContribucion,
  mcMargenContribucionPorFormaPago,
  type FilaMargenContribucionDatoId,
  type FormaPagoMargenContribucion,
  type ModoEvaluacionMargenContribucion,
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

/** Ancho por forma de pago (≈10 % más angosto que el layout previo). */
const COL_PRODUCTO_PESOS = "w-[6.75rem]";
const COL_PRODUCTO_PCT = "w-[2.75rem]";
const COL_PORC_UTILIDAD = "w-[5rem]";
const COL_CONCEPTO = "w-[9rem]";
const COL_SECCION = "w-[1.75rem]";
/** Columna de sección (etiqueta vertical) + CONCEPTO fijos al scroll. */
const COL_SECCION_STICKY = "tabla-mc-col-seccion";
const COL_CONCEPTO_STICKY = "tabla-mc-col-concepto";
/** Separador vertical entre formas de pago (más marcado). */
const SEP_FORMA = "tabla-mc-sep-forma";
/** Celdas $ / % en modo PRODUCTO (padding simétrico respecto al separador). */
const CELDA_PESOS = "tabla-mc-celda-pesos";
const CELDA_PCT = "tabla-mc-celda-pct";

export type InputsMargenContribucionState = {
  pxListaNorm: string;
  /** Entero −100…100 (%) por forma de pago. Negativo = descuento; positivo = recargo. */
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
  modoEvaluacion: ModoEvaluacionMargenContribucion;
  /**
   * Modo PRODUCTO: `costoCompra` de BD. `undefined` en PORC. UTILIDAD (se calcula).
   * `null` si el producto no tiene costo válido.
   */
  cxMercaderiaFijo?: number | null;
  pxListaEditable: boolean;
  esEditor: boolean;
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
  modoEvaluacion,
  cxMercaderiaFijo,
  pxListaEditable,
  esEditor,
}: Props) {
  const esProducto = modoEvaluacion === "producto";
  const colsPorForma = esProducto ? 2 : 1;
  const totalColsDatos = formasPago.length * colsPorForma;

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
        ...(esProducto ? { cxMercaderiaFijo: cxMercaderiaFijo ?? null } : {}),
      });
    }

    return { pxLista, calculadosPorFormaPago };
  }, [
    inputs,
    formasPago,
    porcUtilidadPct,
    tipoComprobante,
    esProducto,
    cxMercaderiaFijo,
  ]);

  function calculadosParaForma(
    formaPago: FormaPagoMargenContribucion
  ): ValoresCalculadosMargenContribucion {
    return parsed.calculadosPorFormaPago[formaPago];
  }

  function valorPesosFila(
    filaId: FilaMargenContribucionDatoId,
    formaPago: FormaPagoMargenContribucion
  ): number | null {
    const calculados = calculadosParaForma(formaPago);
    const cxFinPct = cxFinancieroPorFormaPago[formaPago];

    switch (filaId) {
      case "PX_LISTA":
        return parsed.pxLista > 0 ? parsed.pxLista : null;
      case "PX_VENTA":
        return calculados.precioVenta > 0 ? calculados.precioVenta : null;
      case "IVA":
        return calculados.iva > 0 ? calculados.iva : null;
      case "IIBB":
        return calculados.iibb > 0 ? calculados.iibb : null;
      case "CX_MERCADERIA":
        return calculados.cxMercaderia != null && calculados.cxMercaderia > 0
          ? calculados.cxMercaderia
          : null;
      case "CX_FINANCIERO": {
        const pesos = cxFinancieroPesosMargenContribucion(
          calculados.precioVenta,
          cxFinPct
        );
        return pesos > 0 ? pesos : null;
      }
      case "MC":
        return mcMargenContribucionPorFormaPago(calculados, cxFinPct);
      case "MC_PONDERADO":
        /** Fórmula de ponderación pendiente de definir. */
        return null;
      default:
        return null;
    }
  }

  function fmtCeldaUnica(valorPesos: number | null | undefined): string {
    return fmtCeldaMontoMargenContribucion(
      valorPesos,
      modoEvaluacion,
      parsed.pxLista
    );
  }

  function renderInputPxLista() {
    return (
      <PxListaEnteroInput
        valueNormalized={inputs.pxListaNorm}
        onValueNormalizedChange={(next) =>
          onInputsChange({ ...inputs, pxListaNorm: next })
        }
        className={cn(INPUT_FILA_CLASS, "max-w-full border-primary")}
        aria-label="Px lista"
      />
    );
  }

  function renderValorPxListaSoloLectura() {
    return (
      <span className="tabular-nums text-foreground">
        {fmtCeldaUnica(parsed.pxLista > 0 ? parsed.pxLista : null)}
      </span>
    );
  }

  function renderInputDescuento(formaPago: FormaPagoMargenContribucion) {
    return (
      <PorcentajeEnteroMaskInput
        value={inputs.descuentoPctPorFormaPago[formaPago] ?? 0}
        signed
        defaultNegative
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

  function renderCeldasPxLista() {
    const editable = pxListaEditable && esEditor;

    if (esProducto) {
      return formasPago.map((forma, index) => {
        const pesos = parsed.pxLista > 0 ? parsed.pxLista : null;
        return (
          <TableCell
            key={`PX_LISTA-${forma}`}
            colSpan={2}
            className={cn(
              "celda-datos celda-numero tabular-nums",
              CELDA_PESOS,
              SEP_FORMA,
              editable && index === 0 && "p-1"
            )}
          >
            {editable && index === 0 ? (
              <div className="flex justify-center">{renderInputPxLista()}</div>
            ) : (
              fmtPesosMargenContribucion(pesos)
            )}
          </TableCell>
        );
      });
    }

    return formasPago.map((forma, index) => (
      <TableCell
        key={`PX_LISTA-${forma}`}
        className={cn("celda-datos celda-numero tabular-nums", SEP_FORMA)}
      >
        {editable && index === 0 ? (
          <div className="flex justify-center">{renderInputPxLista()}</div>
        ) : (
          renderValorPxListaSoloLectura()
        )}
      </TableCell>
    ));
  }

  function renderCeldasDatos(filaId: FilaMargenContribucionDatoId) {
    if (esFilaEditableMargenContribucion(filaId)) {
      return renderCeldasPxLista();
    }

    if (esFilaDescuentoPorFormaPagoMargenContribucion(filaId)) {
      return formasPago.map((forma) => (
        <TableCell
          key={`${filaId}-${forma}`}
          colSpan={colsPorForma}
          className={cn("celda-datos celda-numero p-1", SEP_FORMA)}
        >
          <div className="flex justify-center">{renderInputDescuento(forma)}</div>
        </TableCell>
      ));
    }

    const esFilaMargen = filaId === "MC" || filaId === "MC_PONDERADO";

    if (esProducto) {
      return formasPago.flatMap((forma) => {
        const pesos = valorPesosFila(filaId, forma);
        return [
          <TableCell
            key={`${filaId}-${forma}-$`}
            className={cn(
              "celda-datos celda-numero tabular-nums",
              CELDA_PESOS,
              SEP_FORMA
            )}
          >
            {fmtPesosMargenContribucion(pesos)}
          </TableCell>,
          <TableCell
            key={`${filaId}-${forma}-pct`}
            className={cn("celda-datos celda-numero tabular-nums", CELDA_PCT)}
          >
            {fmtPctSobrePxListaMargenContribucion(pesos, parsed.pxLista)}
          </TableCell>,
        ];
      });
    }

    if (esFilaPorFormaPagoMargenContribucion(filaId)) {
      return formasPago.map((forma) => (
        <TableCell
          key={`${filaId}-${forma}`}
          className={cn(
            "celda-datos celda-numero tabular-nums",
            SEP_FORMA,
            esFilaMargen && "font-bold"
          )}
        >
          {fmtCeldaUnica(valorPesosFila(filaId, forma))}
        </TableCell>
      ));
    }

    return formasPago.map((forma) => (
      <TableCell
        key={`${filaId}-${forma}`}
        className={cn("celda-datos celda-numero tabular-nums", SEP_FORMA)}
      >
        {fmtCeldaUnica(valorPesosFila(filaId, forma))}
      </TableCell>
    ));
  }

  return (
    <div className="contenedor-tabla-gestion flex min-h-0 flex-1 flex-col overflow-hidden">
      <div className="min-h-0 min-w-0 flex-1 overflow-x-auto overflow-y-auto">
        <Table
          variant="compact"
          scrollX={false}
          className="tabla-fin-ana-margen-contribucion min-w-max"
        >
          <colgroup>
            <col className={COL_SECCION} />
            <col className={COL_CONCEPTO} />
            {formasPago.flatMap((forma) =>
              esProducto
                ? [
                    <col key={`${forma}-$`} className={COL_PRODUCTO_PESOS} />,
                    <col key={`${forma}-pct`} className={COL_PRODUCTO_PCT} />,
                  ]
                : [<col key={forma} className={COL_PORC_UTILIDAD} />]
            )}
          </colgroup>
          <TableHeader>
            <TableRow>
              <TableHead
                className={cn("text-center p-0", COL_SECCION_STICKY)}
                aria-label="Sección"
              />
              <TableHead className={cn("text-center", COL_CONCEPTO_STICKY)}>
                CONCEPTO
              </TableHead>
              {formasPago.map((forma) => (
                <TableHead
                  key={forma}
                  colSpan={colsPorForma}
                  className={cn("text-center leading-tight", SEP_FORMA)}
                >
                  {etiquetaFormaPagoMargenContribucion(
                    forma,
                    pagosCatalogo
                  ).toUpperCase()}
                </TableHead>
              ))}
            </TableRow>
          </TableHeader>
          <TableBody>
            {FIN_ANA_MC_SECCIONES.map((seccion, seccionIndex) => {
              const filas = seccion.filas;
              const filasJsx = filas.map((filaId, filaIndex) => (
                <TableRow key={`${seccion.id}-${filaId}`}>
                  {filaIndex === 0 ? (
                    <TableCell
                      rowSpan={filas.length}
                      className={cn(
                        "celda-datos tabla-mc-col-seccion-cell",
                        COL_SECCION_STICKY
                      )}
                    >
                      <span className="tabla-mc-seccion-label">
                        {seccion.etiqueta}
                      </span>
                    </TableCell>
                  ) : null}
                  <TableCell
                    className={cn(
                      "celda-datos font-medium",
                      COL_CONCEPTO_STICKY,
                      !esProducto &&
                        (filaId === "MC" || filaId === "MC_PONDERADO") &&
                        "font-bold"
                    )}
                  >
                    {etiquetaFilaMargenContribucion(filaId)}
                  </TableCell>
                  {renderCeldasDatos(filaId)}
                </TableRow>
              ));

              if (seccionIndex >= FIN_ANA_MC_SECCIONES.length - 1) {
                return filasJsx;
              }

              return [
                ...filasJsx,
                <TableRow
                  key={`sep-${seccion.id}`}
                  className="tabla-fila-mc-sep-linea hover:bg-transparent"
                  aria-hidden
                >
                  <TableCell
                    colSpan={2 + totalColsDatos}
                    className="!p-0 !h-0 border-0"
                  />
                </TableRow>,
              ];
            })}
          </TableBody>
        </Table>
      </div>
    </div>
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
