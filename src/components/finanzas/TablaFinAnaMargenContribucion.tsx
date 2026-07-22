"use client";

import { useMemo, useState } from "react";
import { Info } from "lucide-react";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import PorcentajeEnteroMaskInput from "@/components/shared/PorcentajeEnteroMaskInput";
import {
  ayudaFormulaFilaMargenContribucion,
  calcularValoresMargenContribucion,
  crearDescuentoPctPorFormaPagoVacios,
  cxFinancieroRatioMargenContribucion,
  esFilaDescuentoPorFormaPagoMargenContribucion,
  esFilaPorFormaPagoMargenContribucion,
  etiquetaFilaMargenContribucion,
  etiquetaFormaPagoMargenContribucion,
  FIN_ANA_MC_DESCUENTO_MAX,
  FIN_ANA_MC_DESCUENTO_MIN,
  FIN_ANA_MC_SECCIONES,
  fmtCeldaMontoMargenContribucion,
  mcMargenContribucionPorFormaPago,
  mcPonderadoMargenContribucionPorFormaPago,
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

/** Ancho fijo por forma de pago (`--tabla-mc-forma-width` en globals). */
const COL_FORMA = "tabla-mc-col-forma";
const COL_CONCEPTO = "w-[10.5rem]";
const COL_SECCION = "w-[1.75rem]";
/** Columna de sección (etiqueta vertical) + CONCEPTO fijos al scroll. */
const COL_SECCION_STICKY = "tabla-mc-col-seccion";
const COL_CONCEPTO_STICKY = "tabla-mc-col-concepto";
/** Separador vertical entre formas de pago (más marcado). */
const SEP_FORMA = "tabla-mc-sep-forma";

function CeldaConceptoMargenContribucion({
  filaId,
  esFilaMargen,
}: {
  filaId: FilaMargenContribucionDatoId;
  esFilaMargen: boolean;
}) {
  const [open, setOpen] = useState(false);
  const etiqueta = etiquetaFilaMargenContribucion(filaId);
  const formula = ayudaFormulaFilaMargenContribucion(filaId);

  if (!formula) {
    return (
      <TableCell
        className={cn(
          "celda-datos font-medium",
          COL_CONCEPTO_STICKY,
          esFilaMargen && "font-bold"
        )}
      >
        {etiqueta}
      </TableCell>
    );
  }

  return (
    <TableCell
      className={cn(
        "celda-datos font-medium !whitespace-normal",
        COL_CONCEPTO_STICKY,
        esFilaMargen && "font-bold"
      )}
    >
      <div className="flex min-w-0 items-center justify-center gap-1">
        <span className="min-w-0 truncate">{etiqueta}</span>
        <TooltipProvider delayDuration={0}>
          <Tooltip open={open} onOpenChange={setOpen}>
            <TooltipTrigger asChild>
              <button
                type="button"
                className="inline-flex size-5 shrink-0 items-center justify-center rounded-sm text-primary hover:bg-primary/10 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
                aria-label={`Ver fórmula de ${etiqueta}`}
                aria-expanded={open}
                onClick={(event) => {
                  event.preventDefault();
                  setOpen((prev) => !prev);
                }}
              >
                <Info className="size-3.5" aria-hidden />
              </button>
            </TooltipTrigger>
            <TooltipContent
              side="right"
              align="center"
              className="max-w-[18rem] whitespace-normal text-left leading-snug"
            >
              <p className="font-semibold text-popover-foreground">{etiqueta}</p>
              <p className="mt-1 text-popover-foreground/90">{formula}</p>
            </TooltipContent>
          </Tooltip>
        </TooltipProvider>
      </div>
    </TableCell>
  );
}

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
  onDescuentoPorFormaPagoChange: (
    formaPago: FormaPagoMargenContribucion,
    descuentoPct: number
  ) => void | Promise<void>;
  porcUtilidadPct: number;
  tipoComprobante: TipoComprobanteVentaMargenContribucion;
  esEditor: boolean;
}

export default function TablaFinAnaMargenContribucion({
  formasPago,
  pagosCatalogo,
  cxFinancieroPorFormaPago,
  inputs,
  onDescuentoPorFormaPagoChange,
  porcUtilidadPct,
  tipoComprobante,
  esEditor,
}: Props) {
  const totalColsDatos = formasPago.length;

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

  function valorFila(
    filaId: FilaMargenContribucionDatoId,
    formaPago: FormaPagoMargenContribucion
  ): { valor: number | null; escala: "ratio" | "base100" } {
    const calculados = calculadosParaForma(formaPago);
    const cxFinPct = cxFinancieroPorFormaPago[formaPago];

    switch (filaId) {
      case "PX_LISTA":
        return {
          valor: parsed.pxLista > 0 ? parsed.pxLista / 100 : null,
          escala: "ratio",
        };
      case "PX_VENTA":
        return {
          valor:
            calculados.precioVenta > 0
              ? calculados.precioVenta / 100
              : null,
          escala: "ratio",
        };
      case "IVA":
        return {
          valor: calculados.iva > 0 ? calculados.iva : null,
          escala: "ratio",
        };
      case "IIBB":
        return {
          valor: calculados.iibb > 0 ? calculados.iibb : null,
          escala: "ratio",
        };
      case "CX_MERCADERIA":
        return {
          valor:
            calculados.cxMercaderia != null && calculados.cxMercaderia > 0
              ? calculados.cxMercaderia
              : null,
          escala: "ratio",
        };
      case "CX_FINANCIERO": {
        const ratio = cxFinancieroRatioMargenContribucion(cxFinPct);
        return {
          valor: ratio > 0 ? ratio : null,
          escala: "ratio",
        };
      }
      case "MC":
        return {
          valor: mcMargenContribucionPorFormaPago(calculados, cxFinPct),
          escala: "ratio",
        };
      case "MC_PONDERADO":
        return {
          valor: mcPonderadoMargenContribucionPorFormaPago(
            calculados,
            cxFinPct
          ),
          escala: "base100",
        };
      default:
        return { valor: null, escala: "ratio" };
    }
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
        disabled={!esEditor}
      />
    );
  }

  function renderCeldasDatos(filaId: FilaMargenContribucionDatoId) {
    if (esFilaDescuentoPorFormaPagoMargenContribucion(filaId)) {
      return formasPago.map((forma) => (
        <TableCell
          key={`${filaId}-${forma}`}
          className={cn(
            "celda-datos celda-numero p-1",
            COL_FORMA,
            SEP_FORMA
          )}
        >
          <div className="flex justify-center">{renderInputDescuento(forma)}</div>
        </TableCell>
      ));
    }

    const esFilaMargen = filaId === "MC" || filaId === "MC_PONDERADO";

    if (esFilaPorFormaPagoMargenContribucion(filaId)) {
      return formasPago.map((forma) => {
        const { valor, escala } = valorFila(filaId, forma);
        return (
          <TableCell
            key={`${filaId}-${forma}`}
            className={cn(
              "celda-datos celda-numero tabular-nums",
              COL_FORMA,
              SEP_FORMA,
              esFilaMargen && "font-bold"
            )}
          >
            {fmtCeldaMontoMargenContribucion(valor, escala)}
          </TableCell>
        );
      });
    }

    return formasPago.map((forma) => {
      const { valor, escala } = valorFila(filaId, forma);
      return (
        <TableCell
          key={`${filaId}-${forma}`}
          className={cn(
            "celda-datos celda-numero tabular-nums",
            COL_FORMA,
            SEP_FORMA
          )}
        >
          {fmtCeldaMontoMargenContribucion(valor, escala)}
        </TableCell>
      );
    });
  }

  return (
    <div className="contenedor-tabla-gestion contenedor-tabla-gestion--altura-contenido min-w-0 w-full">
      <Table
        variant="compact"
        scrollX={false}
        className="tabla-fin-ana-margen-contribucion w-max"
      >
        <colgroup>
          <col className={COL_SECCION} />
          <col className={COL_CONCEPTO} />
          {formasPago.map((forma) => (
            <col key={forma} className={COL_FORMA} />
          ))}
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
                className={cn(
                  "text-center leading-tight",
                  COL_FORMA,
                  SEP_FORMA
                )}
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
                <CeldaConceptoMargenContribucion
                  filaId={filaId}
                  esFilaMargen={
                    filaId === "MC" || filaId === "MC_PONDERADO"
                  }
                />
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
