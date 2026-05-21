"use client";

import { Fragment, useEffect, useMemo, useState } from "react";
import { ArrowDown, ArrowUp, ChevronDown, ChevronUp, Link2 } from "lucide-react";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import PaginacionClient from "@/components/shared/PaginacionClient";
import {
  tableEmptyStateContainerVariants,
  tableEmptyStateMessageVariants,
} from "@/components/shared/TableEmptyState";
import { fmtPrecio, fmtPctEntero } from "@/lib/format";
import {
  calcularResumenPreciosCompetenciaFila,
  type CompetidorPrecioFila,
} from "@/lib/competenciaPreciosFilaResumen";
import {
  TABLE_ROW_ACTION_ICON_CLASS,
  TABLE_ROW_CELL_ICON_ACTIONS_FLEX_CLASS,
  TABLE_ROW_ICON_BUTTON_FILLED_BRAND_CLASS,
} from "@/lib/ui-classes";
import { cn } from "@/lib/utils";
import type { CompetenciaPreciosListResult } from "@/services/competenciaPreciosList.service";
import AsociarUrlsCompetenciaModal from "@/components/precios-competencia/AsociarUrlsCompetenciaModal";

const COLS = 7;
const COL_WIDTHS = [45, 9, 9, 9, 9, 9, 10] as const;

interface Props {
  data: CompetenciaPreciosListResult | null;
  loading: boolean;
  pagina: number;
  puedeEditar: boolean;
  onPaginaChange: (p: number) => void;
  onReload: () => void;
}

function CeldaDifPct({ pct }: { pct: number | null }) {
  if (pct == null) {
    return <span className="text-muted-foreground">—</span>;
  }
  return (
    <span className="inline-flex items-center justify-center gap-0.5 text-foreground font-semibold text-xs tabular-nums leading-tight">
      {pct > 0 && (
        <ArrowUp className="h-3.5 w-3.5 variacion-costo-icon--positiva shrink-0" aria-hidden />
      )}
      {pct < 0 && (
        <ArrowDown className="h-3.5 w-3.5 variacion-costo-icon--negativa shrink-0" aria-hidden />
      )}
      <span>{fmtPctEntero(pct)}</span>
    </span>
  );
}

const SUBFILA_DETALLE_CLASS = "tabla-fila-altura-auto tabla-fila-detalle-competencia";

/** Subfila: celdas alineadas al colgroup; sin divisores entre columnas. */
function DetalleCompetidorFila({ item }: { item: CompetidorPrecioFila }) {
  return (
    <TableRow className={cn(SUBFILA_DETALLE_CLASS, "hover:bg-transparent")}>
      <TableCell className="celda-datos" aria-hidden />
      <TableCell className="celda-datos max-w-0 text-right">
        <span className="block truncate font-medium text-foreground" title={item.nombre}>
          {item.nombre}
        </span>
      </TableCell>
      <TableCell className="celda-datos tabular-nums text-right">
        {fmtPrecio(item.px)}
      </TableCell>
      <TableCell className="celda-datos text-center">
        <CeldaDifPct pct={item.difPctVsTienda} />
      </TableCell>
      <TableCell className="celda-datos" aria-hidden />
      <TableCell className="celda-datos" aria-hidden />
      <TableCell className="celda-datos" aria-hidden />
    </TableRow>
  );
}

export default function CompetenciaPreciosTabla({
  data,
  loading,
  pagina,
  puedeEditar,
  onPaginaChange,
  onReload,
}: Props) {
  const [expandidos, setExpandidos] = useState<Set<string>>(() => new Set());
  const [asociarFila, setAsociarFila] = useState<{
    codTienda: string;
    descripcion: string | null;
    vinculosPorCompetencia: CompetenciaPreciosListResult["filas"][0]["vinculosPorCompetencia"];
  } | null>(null);

  useEffect(() => {
    onReload();
    // eslint-disable-next-line react-hooks/exhaustive-deps -- recargar solo al cambiar página
  }, [pagina]);

  const competencias = data?.competencias ?? [];
  const filas = data?.filas ?? [];

  const resumenesPorFila = useMemo(() => {
    const map = new Map<string, ReturnType<typeof calcularResumenPreciosCompetenciaFila>>();
    for (const fila of filas) {
      map.set(
        fila.codTienda,
        calcularResumenPreciosCompetenciaFila(
          fila.vinculosPorCompetencia,
          competencias,
          fila.pxListaTienda
        )
      );
    }
    return map;
  }, [filas, competencias]);

  const toggleDetalle = (codTienda: string) => {
    setExpandidos((prev) => {
      const next = new Set(prev);
      if (next.has(codTienda)) next.delete(codTienda);
      else next.add(codTienda);
      return next;
    });
  };

  return (
    <div className="flex flex-1 min-h-0 flex-col gap-0.5">
      <Card className={cn("card-tabla-envoltorio", "flex-1 min-h-0")}>
        <CardContent className="flex flex-1 min-h-0 flex-col p-0">
          <div className="contenedor-tabla-gestion no-scroll-x flex-1 min-h-0">
            <Table variant="compact" className="w-full table-fixed">
              <colgroup>
                {COL_WIDTHS.map((pct, i) => (
                  <col key={i} style={{ width: `${pct}%` }} />
                ))}
              </colgroup>
              <TableHeader>
                <TableRow className="hover:bg-transparent">
                  <TableHead>DESCRIPCIÓN</TableHead>
                  <TableHead className="text-center">PRECIO TIENDA</TableHead>
                  <TableHead className="text-center tabla-bloque-secundario-head-divider">
                    PX PROMEDIO
                  </TableHead>
                  <TableHead className="text-center tabla-bloque-secundario-head">
                    DIF TIENDA
                  </TableHead>
                  <TableHead className="text-center tabla-bloque-secundario-head-divider">
                    MENOR PRECIO
                  </TableHead>
                  <TableHead className="text-center tabla-bloque-secundario-head">
                    MAYOR PRECIO
                  </TableHead>
                  <TableHead className="text-center tabla-bloque-secundario-head-divider">
                    ACCIONES
                  </TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {loading && filas.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={COLS} className={tableEmptyStateContainerVariants()}>
                      <span className={tableEmptyStateMessageVariants()}>CARGANDO...</span>
                    </TableCell>
                  </TableRow>
                ) : filas.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={COLS} className={tableEmptyStateContainerVariants()}>
                      <span className={tableEmptyStateMessageVariants()}>
                        {competencias.length === 0
                          ? "REGISTRÁ COMPETIDORES Y PULSÁ BUSCAR PARA VER PRODUCTOS."
                          : "SIN RESULTADOS PARA LOS FILTROS APLICADOS."}
                      </span>
                    </TableCell>
                  </TableRow>
                ) : (
                  filas.map((fila) => {
                    const resumen = resumenesPorFila.get(fila.codTienda);
                    const expandido = expandidos.has(fila.codTienda);
                    const detalle = resumen?.competidoresOrdenados ?? [];
                    return (
                      <Fragment key={fila.codTienda}>
                        <TableRow>
                          <TableCell className="celda-datos max-w-0">
                            <span className="block truncate" title={fila.descripcionTienda ?? undefined}>
                              {fila.descripcionTienda ?? "—"}
                            </span>
                          </TableCell>
                          <TableCell className="celda-datos tabular-nums text-right whitespace-nowrap">
                            {fmtPrecio(fila.pxListaTienda)}
                          </TableCell>
                          <TableCell className="celda-datos tabular-nums text-right tabla-bloque-secundario-cell-divider">
                            {resumen?.pxPromedio != null ? fmtPrecio(resumen.pxPromedio) : "—"}
                          </TableCell>
                          <TableCell className="celda-datos text-center tabla-bloque-secundario-cell">
                            <CeldaDifPct pct={resumen?.difPctTiendaVsPromedio ?? null} />
                          </TableCell>
                          <TableCell
                            className="celda-datos text-center tabular-nums font-semibold tabla-bloque-secundario-cell-divider"
                            title={resumen?.menor?.nombre}
                          >
                            {resumen?.menor?.prefijo3 ?? "—"}
                          </TableCell>
                          <TableCell
                            className="celda-datos text-center tabular-nums font-semibold tabla-bloque-secundario-cell"
                            title={resumen?.mayor?.nombre}
                          >
                            {resumen?.mayor?.prefijo3 ?? "—"}
                          </TableCell>
                          <TableCell className="celda-datos celda-datos--accion-relleno-fila tabla-bloque-secundario-cell-divider">
                            <div className={TABLE_ROW_CELL_ICON_ACTIONS_FLEX_CLASS}>
                              <Button
                                type="button"
                                variant="ghost"
                                size="icon"
                                className={TABLE_ROW_ICON_BUTTON_FILLED_BRAND_CLASS}
                                aria-label={
                                  expandido ? "Ocultar detalle" : "Ver detalle"
                                }
                                aria-expanded={expandido}
                                onClick={() => toggleDetalle(fila.codTienda)}
                              >
                                {expandido ? (
                                  <ChevronUp className={TABLE_ROW_ACTION_ICON_CLASS} aria-hidden />
                                ) : (
                                  <ChevronDown className={TABLE_ROW_ACTION_ICON_CLASS} aria-hidden />
                                )}
                              </Button>
                              {puedeEditar ? (
                                <Button
                                  type="button"
                                  variant="ghost"
                                  size="icon"
                                  className={TABLE_ROW_ICON_BUTTON_FILLED_BRAND_CLASS}
                                  aria-label="Asociar URL"
                                  onClick={() =>
                                    setAsociarFila({
                                      codTienda: fila.codTienda,
                                      descripcion: fila.descripcionTienda,
                                      vinculosPorCompetencia: fila.vinculosPorCompetencia,
                                    })
                                  }
                                >
                                  <Link2 className={TABLE_ROW_ACTION_ICON_CLASS} aria-hidden />
                                </Button>
                              ) : null}
                            </div>
                          </TableCell>
                        </TableRow>
                        {expandido && detalle.length === 0 ? (
                          <TableRow
                            key={`${fila.codTienda}-detalle-vacio`}
                            className={cn(SUBFILA_DETALLE_CLASS, "hover:bg-transparent")}
                          >
                            <TableCell colSpan={COLS} className="celda-datos py-2">
                              <p className="text-sm text-muted-foreground text-center">
                                Sin precios relevados de competidores para este producto.
                              </p>
                            </TableCell>
                          </TableRow>
                        ) : null}
                        {expandido
                          ? detalle.map((item) => (
                              <DetalleCompetidorFila
                                key={`${fila.codTienda}-${item.competenciaId}`}
                                item={item}
                              />
                            ))
                          : null}
                      </Fragment>
                    );
                  })
                )}
              </TableBody>
            </Table>
          </div>
          {data && data.totalPaginas > 1 && (
            <PaginacionClient
              paginaActual={pagina}
              totalPaginas={data.totalPaginas}
              onPaginaChange={onPaginaChange}
            />
          )}
        </CardContent>
      </Card>
      {asociarFila ? (
        <AsociarUrlsCompetenciaModal
          open={!!asociarFila}
          onOpenChange={(o) => !o && setAsociarFila(null)}
          codTienda={asociarFila.codTienda}
          descripcion={asociarFila.descripcion}
          competencias={competencias}
          vinculosPorCompetencia={asociarFila.vinculosPorCompetencia}
          puedeEditar={puedeEditar}
          onGuardado={() => {
            setAsociarFila(null);
            onReload();
          }}
        />
      ) : null}
    </div>
  );
}
