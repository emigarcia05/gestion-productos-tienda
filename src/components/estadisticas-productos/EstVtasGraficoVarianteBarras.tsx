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
  type EstVtasGrupoDimension,
  type EstVtasSeleccionDesglose,
} from "@/lib/estVtasTypes";

interface Props {
  barras: EstVtasBarraDimension[];
  /**
   * Desglose jerárquico del gráfico 1 (categoría → sucursales).
   * Si hay grupos, se renderizan en lugar de `barras` planas.
   */
  grupos?: EstVtasGrupoDimension[] | null;
  ejeY: EstVtasEjeY;
  onEjeYChange: (eje: EstVtasEjeY) => void;
  /** Categoría del eje Y seleccionada (modo 1 dimensión). */
  seleccionada?: string | null;
  onSeleccionar?: (etiqueta: string | null) => void;
  /** Selección categoría + sucursal (modo desglose). */
  seleccionDesglose?: EstVtasSeleccionDesglose | null;
  onSeleccionarDesglose?: (sel: EstVtasSeleccionDesglose | null) => void;
  /**
   * Mensaje cuando no hay barras por falta de selección en el gráfico padre
   * (gráfico dependiente). Si no hay, se usan los vacíos de ventas/filtros.
   */
  vacioPorDependencia?: string | null;
  /** True si no hay ninguna fila en `est_por_prod` (nada cargado). */
  sinVentasCargadas?: boolean;
  /** Aria del Select de dimensión (distinguir gráfico 1 vs 2). */
  ariaLabelDimension?: string;
  /** Desglose del gráfico 1 (`ninguno` | `sucursal`). Solo si se pasa `onDesgloseChange`. */
  desglose?: EstVtasDesglose;
  onDesgloseChange?: (desglose: EstVtasDesglose) => void;
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
/** Alto de cada fila (barra + aire entre filas) — modo 1 dimensión. */
const EST_VTAS_BARRAS_FILA_REM = 2;
/** Alto visual de la barra dentro de la fila — modo 1 dimensión. */
const EST_VTAS_BARRAS_ALTO_CLASS = "h-3.5";
/** Alto de fila en desglose sucursal: aire mínimo entre barras hijas. */
const EST_VTAS_BARRAS_DESGLOSE_FILA_REM = 1.15;
/** Alto visual de la barra en desglose. */
const EST_VTAS_BARRAS_DESGLOSE_ALTO_CLASS = "h-2.5";

/** Clases de SelectTrigger del título/desglose (anulan `main button` en globals). */
const EST_VTAS_SELECT_TITULO_CLASS =
  "est-vtas-select-titulo h-auto w-auto max-w-full rounded-full border-0 bg-primary px-3 text-[11px] font-bold uppercase tracking-wide text-primary-foreground shadow-sm hover:bg-primary/90 focus-visible:ring-2 focus-visible:ring-ring/40 [&_svg]:size-3 [&_svg]:opacity-100 [&_svg]:text-primary-foreground";

const EST_VTAS_SELECT_DESGLOSE_CLASS =
  "est-vtas-select-desglose h-auto w-auto max-w-full gap-1 border-0 bg-transparent px-2 text-[10px] font-semibold uppercase tracking-wide text-muted-foreground shadow-none hover:bg-muted/40 focus-visible:ring-1 focus-visible:ring-ring/40 [&_svg]:size-3 [&_svg]:opacity-70";

/**
 * Tonos de azul (marca `#0072BB` y vecinos) para distinguir sucursales
 * cuando el desglose del gráfico 1 está activo. Índice estable por sucursal.
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
  return Math.max((unidades / max) * 100, 2);
}

function claseAzulSucursal(index: number): string {
  return EST_VTAS_AZULES_SUCURSAL[index % EST_VTAS_AZULES_SUCURSAL.length]!;
}

/**
 * Barras horizontales: eje Y = dimensión elegida, eje X = Un. vendidas.
 * Título = Select píldora primary. Solo las barras son clicables (no las etiquetas).
 * Layout: 15% etiquetas · 85% barras (+ valor); viewport de 9 filas con scroll.
 * Con desglose SUCURSAL: grupos categoría → barras hijas por sucursal (azules distintos).
 */
export default function EstVtasGraficoVarianteBarras({
  barras,
  grupos = null,
  ejeY,
  onEjeYChange,
  seleccionada = null,
  onSeleccionar,
  seleccionDesglose = null,
  onSeleccionarDesglose,
  vacioPorDependencia = null,
  sinVentasCargadas = false,
  ariaLabelDimension = "Dimensión del eje Y",
  desglose = "ninguno",
  onDesgloseChange,
  className,
}: Props) {
  const modoGrupos = Boolean(grupos && grupos.length > 0);
  const filasPlanas = modoGrupos ? [] : barras;
  const max = modoGrupos
    ? (grupos ?? []).reduce(
        (m, g) =>
          Math.max(m, ...g.sucursales.map((s) => s.unidades), 0),
        0
      )
    : filasPlanas.reduce((m, b) => Math.max(m, b.unidades), 0);
  const vacio = modoGrupos
    ? !grupos || grupos.length === 0
    : filasPlanas.length === 0;
  const labelEjeY = etiquetaEstVtasEjeY(ejeY);
  const seleccionablePlano = typeof onSeleccionar === "function";
  const seleccionableDesglose = typeof onSeleccionarDesglose === "function";
  const plotHeightRem = EST_VTAS_BARRAS_FILAS_VISIBLES * EST_VTAS_BARRAS_FILA_REM;
  const conDesglose = typeof onDesgloseChange === "function";

  /** Índice de color estable por sucursalId (orden de primera aparición). */
  const colorPorSucursalId = (() => {
    const map = new Map<string, number>();
    if (!grupos) return map;
    for (const g of grupos) {
      for (const s of g.sucursales) {
        if (!map.has(s.sucursalId)) map.set(s.sucursalId, map.size);
      }
    }
    return map;
  })();

  const leyendaSucursales = (() => {
    if (!grupos) return [];
    const seen = new Map<string, { id: string; etiqueta: string; index: number }>();
    for (const g of grupos) {
      for (const s of g.sucursales) {
        if (!seen.has(s.sucursalId)) {
          seen.set(s.sucursalId, {
            id: s.sucursalId,
            etiqueta: s.etiqueta,
            index: colorPorSucursalId.get(s.sucursalId) ?? 0,
          });
        }
      }
    }
    return [...seen.values()].sort((a, b) => a.index - b.index);
  })();

  function handleBarraPlanaClick(etiqueta: string) {
    if (!onSeleccionar) return;
    onSeleccionar(seleccionada === etiqueta ? null : etiqueta);
  }

  function handleBarraDesgloseClick(sel: EstVtasSeleccionDesglose) {
    if (!onSeleccionarDesglose) return;
    const misma =
      seleccionDesglose &&
      seleccionDesglose.categoria === sel.categoria &&
      seleccionDesglose.sucursalId === sel.sucursalId;
    onSeleccionarDesglose(misma ? null : sel);
  }

  function renderPista(
    widthPct: number,
    fillClass: string,
    ariaHidden: boolean,
    altoClass: string = EST_VTAS_BARRAS_ALTO_CLASS
  ) {
    return (
      <div
        className="min-w-0 flex-1 overflow-hidden rounded-full bg-muted/35"
        aria-hidden={ariaHidden ? true : undefined}
      >
        <div
          className={cn(
            "rounded-full transition-[width] duration-200 ease-out",
            altoClass,
            fillClass
          )}
          style={{ width: `${widthPct}%` }}
        />
      </div>
    );
  }

  return (
    <section
      className={cn(
        "flex min-h-0 min-w-0 flex-col gap-2 rounded-lg border border-border bg-card p-4 shadow-sm",
        className
      )}
      aria-label={
        modoGrupos
          ? `Unidades vendidas por ${labelEjeY.toLowerCase()} desglosadas por sucursal`
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
          ) : modoGrupos && grupos ? (
            <div className="flex flex-col gap-1 py-0.5">
              {grupos.map((g) => (
                <div key={g.etiqueta} className="flex flex-col" role="group" aria-label={g.etiqueta}>
                  {g.sucursales.map((s, rowIdx) => {
                    const widthPct = anchoBarraPct(s.unidades, max);
                    const colorIdx = colorPorSucursalId.get(s.sucursalId) ?? 0;
                    const fillClass = claseAzulSucursal(colorIdx);
                    const activa =
                      seleccionDesglose?.categoria === g.etiqueta &&
                      seleccionDesglose.sucursalId === s.sucursalId;
                    const pista = renderPista(
                      widthPct,
                      fillClass,
                      seleccionableDesglose,
                      EST_VTAS_BARRAS_DESGLOSE_ALTO_CLASS
                    );

                    return (
                      <div
                        key={`${g.etiqueta}::${s.sucursalId}`}
                        className="grid grid-cols-[minmax(0,15%)_minmax(0,1fr)] items-center gap-x-2"
                        style={{
                          height: `${EST_VTAS_BARRAS_DESGLOSE_FILA_REM}rem`,
                        }}
                      >
                        <span
                          className={cn(
                            "min-w-0 truncate pr-0.5 text-right text-[11px] font-medium uppercase leading-tight text-foreground",
                            rowIdx !== 0 && "invisible"
                          )}
                          title={rowIdx === 0 ? g.etiqueta : undefined}
                          aria-hidden={rowIdx !== 0}
                        >
                          {g.etiqueta}
                        </span>

                        <div className="flex min-w-0 items-center gap-2">
                          {seleccionableDesglose ? (
                            <button
                              type="button"
                              aria-pressed={activa}
                              aria-label={`${g.etiqueta}, ${s.etiqueta}: ${fmtUnidades(s.unidades)} unidades vendidas`}
                              title={`${s.etiqueta}: ${fmtUnidades(s.unidades)}`}
                              onClick={() =>
                                handleBarraDesgloseClick({
                                  categoria: g.etiqueta,
                                  sucursalEtiqueta: s.etiqueta,
                                  sucursalId: s.sucursalId,
                                })
                              }
                              className={cn(
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
                              aria-label={`${g.etiqueta}, ${s.etiqueta}: ${fmtUnidades(s.unidades)} unidades vendidas`}
                              title={`${s.etiqueta}: ${fmtUnidades(s.unidades)}`}
                            >
                              {pista}
                            </div>
                          )}

                          <span className="w-10 shrink-0 text-right text-[11px] tabular-nums text-foreground">
                            {fmtUnidades(s.unidades)}
                          </span>
                        </div>
                      </div>
                    );
                  })}
                </div>
              ))}
            </div>
          ) : (
            <div className="flex flex-col">
              {filasPlanas.map((b) => {
                const widthPct = anchoBarraPct(b.unidades, max);
                const activa = seleccionada === b.etiqueta;
                const fillClass =
                  b.unidades > 0 ? "bg-primary" : "bg-muted-foreground/20";
                const pista = renderPista(widthPct, fillClass, seleccionablePlano);

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
                      {seleccionablePlano ? (
                        <button
                          type="button"
                          aria-pressed={activa}
                          aria-label={`${b.etiqueta}: ${fmtUnidades(b.unidades)} unidades vendidas`}
                          onClick={() => handleBarraPlanaClick(b.etiqueta)}
                          className={cn(
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
        <div className="mt-1.5 flex shrink-0 flex-col items-center gap-1">
          {modoGrupos && leyendaSucursales.length > 0 ? (
            <ul className="flex max-w-full flex-wrap items-center justify-center gap-x-2 gap-y-0.5 px-1">
              {leyendaSucursales.map((s) => (
                <li
                  key={s.id}
                  className="flex items-center gap-1 text-[9px] font-medium uppercase tracking-wide text-muted-foreground"
                >
                  <span
                    className={cn(
                      "inline-block h-2 w-2 shrink-0 rounded-sm",
                      claseAzulSucursal(s.index)
                    )}
                    aria-hidden
                  />
                  <span className="max-w-[5.5rem] truncate" title={s.etiqueta}>
                    {s.etiqueta}
                  </span>
                </li>
              ))}
            </ul>
          ) : (
            <div className="flex items-center justify-center gap-1.5">
              <span className="h-0.5 w-5 rounded-full bg-primary" aria-hidden />
              <span className="text-[9px] font-medium uppercase tracking-wide text-muted-foreground">
                Un. Vendidas
              </span>
            </div>
          )}
        </div>
      </div>
    </section>
  );
}
