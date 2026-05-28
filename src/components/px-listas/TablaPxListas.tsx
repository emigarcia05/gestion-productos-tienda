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
import type { ItemPxListasParaTabla } from "@/actions/pxListas";
import { fmtPrecio } from "@/lib/format";
import { cn } from "@/lib/utils";

const COL_COUNT = 3;

const MENSAJE_SIN_RESULTADOS = "No se encontraron ítems.";

export default function TablaPxListas({ items }: { items: ItemPxListasParaTabla[] }) {
  return (
    <Table variant="compact" scrollX={false} className="tabla-px-listas-listado">
      <colgroup>
        <col className="w-[15%]" />
        <col className="w-[55%]" />
        <col className="w-[30%]" />
      </colgroup>
      <TableHeader>
        <TableRow className="hover:bg-transparent">
          <TableHead>COD. TIENDA</TableHead>
          <TableHead>DESCRIPCIÓN</TableHead>
          <TableHead className="text-right">PX. LISTA DUX</TableHead>
        </TableRow>
      </TableHeader>
      <TableBody>
        {items.length === 0 ? (
          <EmptyTableRow colSpan={COL_COUNT} message={MENSAJE_SIN_RESULTADOS} />
        ) : (
          items.map((item) => (
            <TableRow key={item.id}>
              <TableCell className="celda-datos tabular-nums">{item.codItem}</TableCell>
              <TableCell className="celda-datos">{item.descripcion}</TableCell>
              <TableCell
                className={cn(
                  "celda-datos celda-numero tabular-nums text-right",
                  item.precioLista === 0 && "text-muted-foreground"
                )}
              >
                ${fmtPrecio(item.precioLista)}
              </TableCell>
            </TableRow>
          ))
        )}
      </TableBody>
    </Table>
  );
}
