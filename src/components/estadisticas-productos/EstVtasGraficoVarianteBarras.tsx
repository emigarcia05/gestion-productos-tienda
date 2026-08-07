"use client";

import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { cn } from "@/lib/utils";
import {
  EST_VTAS_DESGLOSE_OPTIONS,
  EST_VTAS_EJE_Y_OPTIONS,
  etiquetaEstVtasEjeY,
  type EstVtasBarraDimension,
  type EstVtasDesglose,
  type EstVtasEjeY,
} from "@/lib/estVtasTypes";

interface Props {
  barras: EstVtasBarraDimension[];
  ejeY: EstVtasEjeY;
  onEjeYChange: (eje: EstVtasEjeY) => void;
  /** Categoría del eje Y seleccionada (clic en la barra). */
  seleccionada?: string | null;
  onSeleccionar?: (etiqueta: string | null) => void;
  /**
   * Mensaje cuando no hay barras por falta de selección en el gráfico padre
   * (gráfico dependiente). Si no hay, se usan los vacíos de ventas/filtros.
   */
  vacioPorDependencia?: string | null;
  /** Texto de contexto bajo el subtítulo (ej. filtro del gráfico 1). */
  contextoFiltro?: string | null;
  /** True si no hay ninguna fila en `est_por_prod` (nada cargado). */
  sinVentasCargadas?: boolean;
  /** Aria del Select de dimensión (distinguir gráfico 1 vs 2). */
  ariaLabelDimension?: string;
  /** Desglose del gráfico 1 (`ninguno` | `sucursal`). Solo si se pasa `onDesgloseChange`. */
  desglose?: EstVtasDesglose;
  onDesgloseChange?: (desglose: EstVtasDesglose) => void;
  /**
   * True cuando el gráfico 1 está mostrando barras por sucursal
   * (categoría del eje Y ya elegida + desglose = sucursal).
   */
  desgloseSucursalActivo?: boolean;
  /** Volver del desglose por sucursal a la lista de categorías. */
  onVolverCategoria?: () => void;
  className?: string;
}

function fmtUnidades(n: number): string {
  return n.toLocaleString("es-AR", {
    maximumFractionDigits: 2,
    minimumFractionDigits: 0,
  });
}

/** Filas visibles en el viewport del eje Y; el resto scrollea. */
const EST_VTAS_BARRAS_FILAS_VISIBLES = 9;
/** Alto de cada fila (barra + aire entre filas). */
const EST_VTAS_BARRAS_FILA_REM = 2;
/** Alto visual de la barra dentro de la fila. */
const EST_VTAS_BARRAS_ALTO_CLASS = "h-3.5";

/** Clases de SelectTrigger del título/desglose (anulan `main button` en globals). */
const EST_VTAS_SELECT_TITULO_CLASS =
  "est-vtas-select-titulo h-auto w-auto max-w-full rounded-full border-0 bg-primary px-3 text-[11px] font-bold uppercase tracking-wide text-primary-foreground shadow-sm hover:bg-primary/90 focus-visible:ring-2 focus-visible:ring-ring/40 [&_svg]:size-3 [&_svg]:opacity-100 [&_svg]:text-primary-foreground";

const EST_VTAS_SELECT_DESGLOSE_CLASS =
  "est-vtas-select-desglose h-auto w-auto max-w-full gap-1 border-0 bg-transparent px-2 text-[10px] font-semibold uppercase tracking-wide text-muted-foreground shadow-none hover:bg-muted/40 focus-visible:ring-1 focus-visible:ring-ring/40 [&_svg]:size-3 [&_svg]:opacity-70";

/**
 * Tonos de azul (marca `#0072BB` y vecinos) para distinguir sucursales
 * cuando el desglose del gráfico 1 está activo. Se ciclan por índice.
 */
const EST_VTAS_AZULES_SUCURSAL = [
  "bg-[#0072BB]",
  "bg-[#1A8AD4]",
  "bg-[#4AA3DE]",
  "bg-[#005A96]",
  "bg-[#003D66]",
  "bg-[#2E9CD9]",
  "bg-[#0D6FA8]",
  "bg-[#66B8E8]",
] as const;

function anchoBarraPct(unidades: number, max: number): number {
  if (max <= 0 || unidades <= 0) return 0;
  // Proporción exacta al valor; mínimo visual 2 % solo si hay unidades > 0.
  return Math.max((unidades / max) * 100, 2);
}

function claseAzulBarra(index: number, desgloseSucursal: boolean): string {
  if (!desgloseSucursal) return "bg-primary";
  return EST_VTAS_AZULES_SUCURSAL[index % EST_VTAS_AZULES_SUCURSAL.length]!;
}

/**
 * Barras horizontales: eje Y = dimensión elegida, eje X = Un. vendidas.
 * Título = Select píldora primary. Solo las barras son clicables (no las etiquetas).
 * Layout: 15% etiquetas · 85% barras (+ valor); viewport de 8 filas con scroll.
 * Ancho de cada barra = proporción de unidades respecto al máximo del set.
 * Con desglose por sucursal, cada barra usa un tono de azul distinto.
 */
export default function EstVtasGraficoVarianteBarras({
  barras,
  ejeY,
  onEjeYChange,
  seleccionada = null,
  onSeleccionar,
  vacioPorDependencia = null,
  contextoFiltro = null,
  sinVentasCargadas = false,
  ariaLabelDimension = "Dimensión del eje Y",
  desglose = "ninguno",
  onDesgloseChange,
  desgloseSucursalActivo = false,
  onVolverCategoria,
  className,
}: Props) {
  const max = barras.reduce((m, b) => Math.max(m, b.unidades), 0);
  const vacio = barras.length === 0;
  const labelEjeY = etiquetaEstVtasEjeY(ejeY);
  const seleccionable = typeof onSeleccionar === "function";
  const plotHeightRem = EST_VTAS_BARRAS_FILAS_VISIBLES * EST_VTAS_BARRAS_FILA_REM;
  const conDesglose = typeof onDesgloseChange === "function";

  function handleBarraClick(etiqueta: string) {
    if (!onSeleccionar) return;
    onSeleccionar(seleccionada === etiqueta ? null : etiqueta);
  }

  return (
    <section
      className={cn(
        "flex min-h-0 min-w-0 flex-col gap-2 rounded-lg border border-border bg-card p-4 shadow-sm",
        className
      )}
      aria-label={
        desgloseSucursalActivo
          ? `Unidades vendidas por sucursal — ${labelEjeY.toLowerCase()}`
          : `Unidades vendidas por ${labelEjeY.toLowerCase()}`
      }
    >
      <header className="flex shrink-0 flex-col items-center gap-0.5">
        <Select
          value={ejeY}
          onValueChange={(v) => onEjeYChange(v as EstVtasEjeY)}
        >
          <SelectTrigger
            size="sm"
            aria-label={ariaLabelDimension}
            className={EST_VTAS_SELECT_TITULO_CLASS}
          >
            <SelectValue placeholder="Un. Vendidas Por Variante" />
          </SelectTrigger>
          <SelectContent
            position="popper"
            side="bottom"
            align="center"
            className="select-content-filtro"
          >
            {EST_VTAS_EJE_Y_OPTIONS.map((opt) => (
              <SelectItem key={opt.value} value={opt.value}>
                {`Un. Vendidas Por ${opt.label}`}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>

        {conDesglose ? (
          <Select
            value={desglose}
            onValueChange={(v) => onDesgloseChange(v as EstVtasDesglose)}
          >
            <SelectTrigger
              size="sm"
              aria-label="Desglose del gráfico 1"
              className={EST_VTAS_SELECT_DESGLOSE_CLASS}
            >
              <SelectValue placeholder="Desglose" />
            </SelectTrigger>
            <SelectContent
              position="popper"
              side="bottom"
              align="center"
              className="select-content-filtro"
            >
              {EST_VTAS_DESGLOSE_OPTIONS.map((opt) => (
                <SelectItem key={opt.value} value={opt.value}>
                  {`Desglose: ${opt.label}`}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        ) : null}

        {seleccionada || contextoFiltro || desgloseSucursalActivo ? (
          <p className="text-center text-[10px] leading-tight text-muted-foreground">
            {contextoFiltro ? (
              <span className="block truncate font-semibold uppercase text-foreground">
                {contextoFiltro}
              </span>
            ) : null}
            {seleccionada ? (
              <span className="block truncate font-semibold uppercase text-foreground">
                {desgloseSucursalActivo
                  ? `Sucursal: ${seleccionada}`
                  : `Selección: ${seleccionada}`}
              </span>
            ) : null}
            {desgloseSucursalActivo && onVolverCategoria ? (
              <button
                type="button"
                onClick={onVolverCategoria}
                className="est-vtas-link-btn mt-0.5 uppercase tracking-wide underline-offset-2"
              >
                Volver A {labelEjeY}
              </button>
            ) : null}
          </p>
        ) : null}
      </header>

      <div className="flex min-h-0 flex-1 flex-col">
        <div
          className={cn(
            "overflow-y-auto border-l border-b border-border pl-2 pr-1.5",
            vacio && "flex items-center justify-center"
          )}
          style={{ height: `${plotHeightRem}rem` }}
        >
          {vacio ? (
            <p className="max-w-[16rem] px-2 text-center text-xs text-muted-foreground">
              {vacioPorDependencia
                ? vacioPorDependencia
                : sinVentasCargadas
                  ? "No hay ventas cargadas. Subí datos en Carga de Datos y volvé a abrir este módulo."
                  : "No hay ventas para los filtros o el periodo seleccionados. Probá otra fecha con datos cargados."}
            </p>
          ) : (
            <div className="flex flex-col">
              {barras.map((b, index) => {
                const widthPct = anchoBarraPct(b.unidades, max);
                const activa = seleccionada === b.etiqueta;
                const azul = claseAzulBarra(index, desgloseSucursalActivo);
                const fillClass =
                  b.unidades > 0 ? azul : "bg-muted-foreground/20";

                const pista = (
                  <div
                    className="min-w-0 flex-1 overflow-hidden rounded-full bg-muted/35"
                    aria-hidden={seleccionable ? true : undefined}
                  >
                    <div
                      className={cn(
                        "rounded-full transition-[width] duration-200 ease-out",
                        EST_VTAS_BARRAS_ALTO_CLASS,
                        fillClass
                      )}
                      style={{ width: `${widthPct}%` }}
                    />
                  </div>
                );

                return (
                  <div
                    key={b.etiqueta}
                    className="grid grid-cols-[minmax(0,15%)_minmax(0,1fr)] items-center gap-x-2"
                    style={{ height: `${EST_VTAS_BARRAS_FILA_REM}rem` }}
                  >
                    <span
                      className="min-w-0 truncate pr-0.5 text-right text-[11px] font-medium uppercase leading-tight text-foreground"
                      title={b.etiqueta}
                    >
                      {b.etiqueta}
                    </span>

                    <div className="flex min-w-0 items-center gap-2">
                      {seleccionable ? (
                        <button
                          type="button"
                          aria-pressed={activa}
                          aria-label={`${b.etiqueta}: ${fmtUnidades(b.unidades)} unidades vendidas`}
                          onClick={() => handleBarraClick(b.etiqueta)}
                          className={cn(
                            /* Anula `main button` en globals.css — estética de gráfico, no CTA. */
                            "est-vtas-barra-btn flex min-w-0 flex-1 items-center border-0 bg-transparent p-0",
                            "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring/50 focus-visible:ring-offset-1",
                            activa &&
                              "rounded-full ring-2 ring-primary/70 ring-offset-1 ring-offset-card"
                          )}
                        >
                          {pista}
                        </button>
                      ) : (
                        <div
                          className="flex min-w-0 flex-1 items-center"
                          role="img"
                          aria-label={`${b.etiqueta}: ${fmtUnidades(b.unidades)} unidades vendidas`}
                        >
                          {pista}
                        </div>
                      )}

                      <span className="w-10 shrink-0 text-right text-[11px] tabular-nums text-foreground">
                        {fmtUnidades(b.unidades)}
                      </span>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>
        <div className="mt-1.5 flex shrink-0 items-center justify-center gap-1.5">
          <span className="h-0.5 w-5 rounded-full bg-primary" aria-hidden />
          <span className="text-[9px] font-medium uppercase tracking-wide text-muted-foreground">
            Un. Vendidas
          </span>
        </div>
      </div>
    </section>
  );
}
