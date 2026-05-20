"use client";

import { useEffect } from "react";
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
import { cn } from "@/lib/utils";
import type { CompetenciaPreciosListResult } from "@/services/competenciaPreciosList.service";

interface Props {
  data: CompetenciaPreciosListResult | null;
  loading: boolean;
  pagina: number;
  onPaginaChange: (p: number) => void;
  onReload: () => void;
}

export default function CompetenciaPreciosTabla({
  data,
  loading,
  pagina,
  onPaginaChange,
  onReload,
}: Props) {
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
                  <TableHead className="w-[30%]">DESCRIPCIÓN</TableHead>
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
                        const px = fila.preciosPorCompetencia[c.id];
                        return (
                          <TableCell
                            key={c.id}
                            className={cn(
                              "celda-datos tabular-nums text-right",
                              px == null && "text-muted-foreground"
                            )}
                          >
                            {px != null ? fmtPrecio(px) : "—"}
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
    </div>
  );
}
