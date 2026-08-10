"use client";

import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import PaginacionClient from "@/components/shared/PaginacionClient";
import { cn } from "@/lib/utils";
import { fmtNumero } from "@/lib/format";
import type {
  ProductoPedidoAFabricaItem,
  SucursalPedidoAFabrica,
} from "@/services/pedidoAFabrica.service";

interface Props {
  sucursales: SucursalPedidoAFabrica[];
  productos: ProductoPedidoAFabricaItem[];
  pagina: number;
  totalPaginas: number;
  onPaginaChange: (pagina: number) => void;
  loading?: boolean;
  emptyMessage: string;
}

const TD_NUM = "celda-datos celda-numero tabular-nums text-center";

function fmtPromVta(n: number | null | undefined): string {
  if (n == null || Number.isNaN(n)) return "";
  return n.toLocaleString("es-AR", {
    minimumFractionDigits: 0,
    maximumFractionDigits: 1,
  });
}

/**
 * Grilla Pedido A Fáb.
 * **DESCRIPCIÓN** + por cada sucursal `pedido = true`: **STOCK ACTUAL** | **PROM. VTA.**
 * (cabecera de 2 filas, patrón `TablaPxListasPrecios`).
 */
export default function TablaPedidoAFabrica({
  sucursales,
  productos,
  pagina,
  totalPaginas,
  onPaginaChange,
  loading = false,
  emptyMessage,
}: Props) {
  const nSuc = sucursales.length;
  const colCount = 1 + nSuc * 2;
  /** DESCRIPCIÓN ~40 %; el resto repartido entre subcolumnas de sucursal. */
  const pctDesc = nSuc > 0 ? 40 : 100;
  const pctSub = nSuc > 0 ? (100 - pctDesc) / (nSuc * 2) : 0;

  return (
    <div className="flex min-h-0 flex-1 flex-col gap-0.5">
      <div className="contenedor-tabla-gestion no-scroll-x flex-1 min-h-0">
        <Table variant="compact" scrollX={false}>
          <colgroup>
            <col style={{ width: `${pctDesc}%` }} />
            {sucursales.flatMap((s) => [
              <col key={`${s.id}-stock`} style={{ width: `${pctSub}%` }} />,
              <col key={`${s.id}-prom`} style={{ width: `${pctSub}%` }} />,
            ])}
          </colgroup>
          <TableHeader>
            <TableRow className="hover:bg-transparent">
              <TableHead rowSpan={2} className="min-w-0 align-middle">
                DESCRIPCIÓN
              </TableHead>
              {sucursales.map((s, i) => (
                <TableHead
                  key={s.id}
                  colSpan={2}
                  className={cn(
                    "text-center align-middle",
                    i === 0
                      ? "tabla-bloque-secundario-head-divider"
                      : "tabla-bloque-secundario-head"
                  )}
                >
                  {s.nombre.toLocaleUpperCase("es")}
                </TableHead>
              ))}
            </TableRow>
            <TableRow className="hover:bg-transparent">
              {sucursales.flatMap((s, i) => [
                <TableHead
                  key={`${s.id}-stock-h`}
                  className={cn(
                    "text-center",
                    i === 0
                      ? "tabla-bloque-secundario-head-divider"
                      : "tabla-bloque-secundario-head"
                  )}
                >
                  STOCK ACTUAL
                </TableHead>,
                <TableHead
                  key={`${s.id}-prom-h`}
                  className="text-center tabla-bloque-secundario-head"
                >
                  PROM. VTA.
                </TableHead>,
              ])}
            </TableRow>
          </TableHeader>
          <TableBody>
            {loading ? (
              <TableRow>
                <TableCell
                  colSpan={colCount}
                  className="celda-datos text-center text-muted-foreground"
                >
                  Cargando productos…
                </TableCell>
              </TableRow>
            ) : productos.length === 0 ? (
              <TableRow>
                <TableCell
                  colSpan={colCount}
                  className="celda-datos text-center text-muted-foreground"
                >
                  {emptyMessage}
                </TableCell>
              </TableRow>
            ) : (
              productos.map((p) => (
                <TableRow key={p.codExt}>
                  <TableCell className="celda-datos min-w-0">
                    <span className="block truncate" title={p.descripcion}>
                      {p.descripcion}
                    </span>
                  </TableCell>
                  {sucursales.flatMap((s, i) => {
                    const datos = p.porSucursal[s.id];
                    return [
                      <TableCell
                        key={`${p.codExt}-${s.id}-stock`}
                        className={cn(
                          TD_NUM,
                          i === 0
                            ? "tabla-bloque-secundario-cell-divider"
                            : "tabla-bloque-secundario-cell"
                        )}
                      >
                        {fmtNumero(datos?.stockActual)}
                      </TableCell>,
                      <TableCell
                        key={`${p.codExt}-${s.id}-prom`}
                        className={cn(TD_NUM, "tabla-bloque-secundario-cell")}
                      >
                        {fmtPromVta(datos?.promVta)}
                      </TableCell>,
                    ];
                  })}
                </TableRow>
              ))
            )}
          </TableBody>
        </Table>
      </div>
      <PaginacionClient
        paginaActual={pagina}
        totalPaginas={totalPaginas}
        onPaginaChange={onPaginaChange}
      />
    </div>
  );
}
