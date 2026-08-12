"use client";

import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import type { Sucursal, TransfDepositosData } from "@/actions/stock";
import {
  TableEmptyState,
  tableEmptyStateContainerVariants,
  tableEmptyStateMessageVariants,
} from "@/components/shared/TableEmptyState";
import { cn } from "@/lib/utils";

interface Props {
  data: TransfDepositosData;
  origen: Sucursal | null;
  destino: Sucursal | null;
}

/**
 * Grilla **Trans. Depósitos**: DESCRIPCIÓN · SUCURSAL ORIGEN · SUCURSAL DESTINO
 * (stock_real de cada depósito).
 */
export default function TablaTransfDepositos({ data, origen, destino }: Props) {
  const origenSeleccionado = origen !== null;

  if (!origenSeleccionado) {
    return (
      <TableEmptyState
        placement="blockedPanel"
        textSize="sm"
        maxWidth="full"
        message="Seleccioná sucursal origen (y destino) para ver el stock."
      />
    );
  }

  return (
    <Table variant="compact">
      <TableHeader>
        <TableRow className="hover:bg-transparent">
          <TableHead className="w-[50%]">DESCRIPCIÓN</TableHead>
          <TableHead className="w-[25%]">SUCURSAL ORIGEN</TableHead>
          <TableHead className="w-[25%]">SUCURSAL DESTINO</TableHead>
        </TableRow>
      </TableHeader>
      <TableBody>
        {data.items.length === 0 && (
          <TableRow>
            <TableCell
              colSpan={3}
              className={cn(
                tableEmptyStateContainerVariants({
                  placement: "tableCellTall",
                  textSize: "xs",
                })
              )}
            >
              <span
                className={tableEmptyStateMessageVariants({
                  maxWidth: "full",
                })}
              >
                Sin resultados
              </span>
            </TableCell>
          </TableRow>
        )}
        {data.items.map((item) => (
          <TableRow key={item.id}>
            <TableCell className="celda-datos w-[50%] min-w-0 overflow-hidden">
              {item.descripcion}
            </TableCell>
            <TableCell className="celda-datos tabular-nums w-[25%]">
              {item.stockOrigen.toLocaleString("es-AR")}
            </TableCell>
            <TableCell className="celda-datos tabular-nums w-[25%]">
              {destino === null || item.stockDestino === null
                ? "—"
                : item.stockDestino.toLocaleString("es-AR")}
            </TableCell>
          </TableRow>
        ))}
      </TableBody>
    </Table>
  );
}
