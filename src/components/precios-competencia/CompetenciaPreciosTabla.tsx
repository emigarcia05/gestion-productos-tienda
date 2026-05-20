"use client";

import { useEffect, useState } from "react";
import { Card, CardContent } from "@/components/ui/card";
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
import { fmtPrecio } from "@/lib/format";
import { labelUltimaComparacionCompetencia } from "@/lib/competenciaUltimaComparacion";
import {
  ESTADO_RELEVAMIENTO_COMPETENCIA,
  etiquetaEstadoRelevamiento,
} from "@/lib/competenciaRelevamiento";
import { TEXT_WARNING_CLASS } from "@/lib/ui-classes";
import { cn } from "@/lib/utils";
import type { CompetenciaPreciosListResult } from "@/services/competenciaPreciosList.service";
import type { DatoVinculoCompetenciaCliente } from "@/services/competenciaVinculo.service";
import EditarUrlVinculoModal from "@/components/precios-competencia/EditarUrlVinculoModal";

interface Props {
  data: CompetenciaPreciosListResult | null;
  loading: boolean;
  pagina: number;
  puedeEditar: boolean;
  onPaginaChange: (p: number) => void;
  onReload: () => void;
}

function celdaVinculoTexto(v: DatoVinculoCompetenciaCliente): string {
  if (!v.urlProducto) return "Sin URL";
  if (v.estado === ESTADO_RELEVAMIENTO_COMPETENCIA.OK && v.pxCompetencia != null) {
    return fmtPrecio(v.pxCompetencia);
  }
  if (v.estado === ESTADO_RELEVAMIENTO_COMPETENCIA.ERROR) return "Error";
  if (v.estado === ESTADO_RELEVAMIENTO_COMPETENCIA.SIN_PRECIO) return "Sin Precio";
  if (v.estado === ESTADO_RELEVAMIENTO_COMPETENCIA.PENDIENTE) return "Pendiente";
  return etiquetaEstadoRelevamiento(v.estado);
}

export default function CompetenciaPreciosTabla({
  data,
  loading,
  pagina,
  puedeEditar,
  onPaginaChange,
  onReload,
}: Props) {
  const [editCell, setEditCell] = useState<{
    codTienda: string;
    descripcion: string | null;
    competenciaId: string;
    competenciaNombre: string;
    vinculo: DatoVinculoCompetenciaCliente;
  } | null>(null);

  useEffect(() => {
    onReload();
    // eslint-disable-next-line react-hooks/exhaustive-deps -- recargar solo al cambiar página
  }, [pagina]);

  const competencias = data?.competencias ?? [];
  const filas = data?.filas ?? [];

  return (
    <div className="flex flex-1 min-h-0 flex-col px-8 pb-3">
      <Card className={cn("card-tabla-envoltorio", "flex-1 min-h-0")}>
        <CardContent className="flex flex-1 min-h-0 flex-col p-0">
          <div className="contenedor-tabla-gestion no-scroll-x flex-1 min-h-0">
            <Table variant="compact">
              <TableHeader>
                <TableRow>
                  <TableHead className="w-[10%]">CÓD. TIENDA</TableHead>
                  <TableHead className="w-[28%]">DESCRIPCIÓN</TableHead>
                  <TableHead className="w-[10%]">PX. TIENDA</TableHead>
                  {competencias.map((c) => (
                    <TableHead key={c.id} className="min-w-[8rem] align-bottom">
                      <span className="block leading-tight">{c.nombre.toUpperCase()}</span>
                      <span className="block text-[0.65rem] font-normal normal-case text-primary-foreground/90 mt-0.5">
                        {c.ultimaComparacionAt
                          ? labelUltimaComparacionCompetencia(c.ultimaComparacionAt).replace(
                              "Últ. comparación: ",
                              "Últ.: "
                            )
                          : "Sin Últ. Comp."}
                      </span>
                    </TableHead>
                  ))}
                </TableRow>
              </TableHeader>
              <TableBody>
                {loading && filas.length === 0 ? (
                  <TableRow>
                    <TableCell
                      colSpan={3 + competencias.length}
                      className={tableEmptyStateContainerVariants()}
                    >
                      <span className={tableEmptyStateMessageVariants()}>CARGANDO...</span>
                    </TableCell>
                  </TableRow>
                ) : filas.length === 0 ? (
                  <TableRow>
                    <TableCell
                      colSpan={3 + competencias.length}
                      className={tableEmptyStateContainerVariants()}
                    >
                      <span className={tableEmptyStateMessageVariants()}>
                        {competencias.length === 0
                          ? "REGISTRÁ COMPETIDORES Y PULSÁ BUSCAR PARA VER PRODUCTOS."
                          : "SIN RESULTADOS PARA LOS FILTROS APLICADOS."}
                      </span>
                    </TableCell>
                  </TableRow>
                ) : (
                  filas.map((fila) => (
                    <TableRow key={fila.codTienda}>
                      <TableCell className="celda-datos tabular-nums">{fila.codTienda}</TableCell>
                      <TableCell className="celda-datos">{fila.descripcionTienda ?? "—"}</TableCell>
                      <TableCell className="celda-datos tabular-nums text-right">
                        {fmtPrecio(fila.pxListaTienda)}
                      </TableCell>
                      {competencias.map((c) => {
                        const v = fila.vinculosPorCompetencia[c.id];
                        const texto = celdaVinculoTexto(v);
                        const esError = v.estado === ESTADO_RELEVAMIENTO_COMPETENCIA.ERROR;
                        const esSinUrl = !v.urlProducto;
                        return (
                          <TableCell
                            key={c.id}
                            className={cn(
                              "celda-datos tabular-nums text-right",
                              (esSinUrl || v.estado === ESTADO_RELEVAMIENTO_COMPETENCIA.SIN_PRECIO) &&
                                "text-muted-foreground",
                              esError && TEXT_WARNING_CLASS,
                              puedeEditar && "cursor-pointer hover:bg-muted/50"
                            )}
                            title={
                              esError && v.errorMensaje
                                ? v.errorMensaje
                                : v.urlProducto ?? "Clic para cargar URL"
                            }
                            onClick={
                              puedeEditar
                                ? () =>
                                    setEditCell({
                                      codTienda: fila.codTienda,
                                      descripcion: fila.descripcionTienda,
                                      competenciaId: c.id,
                                      competenciaNombre: c.nombre,
                                      vinculo: v,
                                    })
                                : undefined
                            }
                          >
                            {texto}
                          </TableCell>
                        );
                      })}
                    </TableRow>
                  ))
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
      {editCell && puedeEditar ? (
        <EditarUrlVinculoModal
          open={!!editCell}
          onOpenChange={(o) => !o && setEditCell(null)}
          codTienda={editCell.codTienda}
          descripcion={editCell.descripcion}
          competenciaId={editCell.competenciaId}
          competenciaNombre={editCell.competenciaNombre}
          configExtraccion={
            competencias.find((c) => c.id === editCell.competenciaId)?.configExtraccion ?? null
          }
          vinculoInicial={editCell.vinculo}
          onGuardado={() => {
            setEditCell(null);
            onReload();
          }}
        />
      ) : null}
    </div>
  );
}
