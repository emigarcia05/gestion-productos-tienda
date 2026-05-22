"use client";

import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
  EmptyTableRow,
} from "@/components/ui/table";
import type { ItemCxPxTiendaParaTabla } from "@/actions/cxPxTienda";
import { fmtPrecio } from "@/lib/format";

const COL_COUNT = 6;
const MENSAJE_SIN_RESULTADOS = "No se encontraron ítems.";

export default function TablaCxPxTienda({ items }: { items: ItemCxPxTiendaParaTabla[] }) {
  return (
    <Table variant="compact" scrollX={false} className="tabla-cx-px-tienda-listado">
      <TableHeader>
        <TableRow className="hover:bg-transparent">
          <TableHead className="w-[11%]">COD. TIENDA</TableHead>
          <TableHead className="w-[38%]">DESCRIPCIÓN</TableHead>
          <TableHead className="w-[12%]">MARCA</TableHead>
          <TableHead className="w-[12%]">PROVEEDOR</TableHead>
          <TableHead className="w-[13%]">CX. COMPRA</TableHead>
          <TableHead className="w-[14%]">PX. LISTA</TableHead>
        </TableRow>
      </TableHeader>
      <TableBody>
        {items.length === 0 ? (
          <EmptyTableRow colSpan={COL_COUNT} message={MENSAJE_SIN_RESULTADOS} />
        ) : (
          items.map((item) => (
            <TableRow key={item.id}>
              <TableCell className="celda-datos celda-mono whitespace-nowrap">{item.codTienda}</TableCell>
              <TableCell className="celda-datos celda-destacado min-w-0 overflow-hidden">
                {item.descripcion}
              </TableCell>
              <TableCell className="celda-datos min-w-0 truncate">{item.marca ?? "—"}</TableCell>
              <TableCell className="celda-datos min-w-0 truncate">{item.proveedor ?? "—"}</TableCell>
              <TableCell className="celda-datos celda-numero tabular-nums">${fmtPrecio(item.costoCompra)}</TableCell>
              <TableCell className="celda-datos celda-numero celda-destacado tabular-nums">
                ${fmtPrecio(item.pxListaTienda)}
              </TableCell>
            </TableRow>
          ))
        )}
      </TableBody>
    </Table>
  );
}
