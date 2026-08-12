"use client";

import { useEffect, useState } from "react";
import { ArrowRight, Trash2 } from "lucide-react";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import type { Sucursal, TransfDepositosData } from "@/actions/stock";
import {
  TableEmptyState,
  tableEmptyStateContainerVariants,
  tableEmptyStateMessageVariants,
} from "@/components/shared/TableEmptyState";
import { cn } from "@/lib/utils";
import {
  TABLE_ROW_ACTION_ICON_CLASS,
  TABLE_ROW_CELL_ICON_ACTIONS_FLEX_CLASS,
  TABLE_ROW_ICON_BUTTON_FILLED_BRAND_CLASS,
} from "@/lib/ui-classes";

const SUCURSAL_LABEL: Record<Sucursal, string> = {
  guaymallen: "GUAYMALLÉN",
  maipu: "MAIPÚ",
};

/** DESCRIPCIÓN 50%; bloque transferencia compacto; ACCIONES al final. */
const PCT_DESC = 50;
const PCT_ORIGEN = 22;
const PCT_DESTINO = 18;
const PCT_ACCIONES = 10;

interface Props {
  data: TransfDepositosData;
  origen: Sucursal | null;
  destino: Sucursal | null;
}

/**
 * Grilla **Trans. Depósitos**:
 * DESCRIPCIÓN · {nombre origen} (input + flecha si hay cantidad) · {nombre destino} (lectura) · ACCIONES.
 * La flecha vive en la columna de origen para mantener el bloque origen→destino pegado.
 */
export default function TablaTransfDepositos({ data, origen, destino }: Props) {
  const [cantidades, setCantidades] = useState<Record<string, string>>({});

  const idsKey = data.items.map((i) => i.id).join("|");
  useEffect(() => {
    queueMicrotask(() => {
      setCantidades((prev) => {
        const next: Record<string, string> = {};
        for (const item of data.items) {
          if (prev[item.id] !== undefined) next[item.id] = prev[item.id];
        }
        return next;
      });
    });
  }, [idsKey, data.items]);

  const origenSeleccionado = origen !== null;
  const origenLabel = origen ? SUCURSAL_LABEL[origen] : "—";
  const destinoLabel = destino ? SUCURSAL_LABEL[destino] : "—";

  function handleCantidad(id: string, raw: string) {
    const limpio = raw.replace(/[^\d]/g, "");
    setCantidades((prev) => ({ ...prev, [id]: limpio }));
  }

  function limpiarFila(id: string) {
    setCantidades((prev) => {
      const next = { ...prev };
      delete next[id];
      return next;
    });
  }

  if (!origenSeleccionado) {
    return (
      <TableEmptyState
        placement="blockedPanel"
        textSize="sm"
        maxWidth="full"
        message="Seleccioná sucursal origen y destino (distintas) para transferir."
      />
    );
  }

  return (
    <Table variant="compact">
      <colgroup>
        <col style={{ width: `${PCT_DESC}%` }} />
        <col style={{ width: `${PCT_ORIGEN}%` }} />
        <col style={{ width: `${PCT_DESTINO}%` }} />
        <col style={{ width: `${PCT_ACCIONES}%` }} />
      </colgroup>
      <TableHeader>
        <TableRow className="hover:bg-transparent">
          <TableHead className="min-w-0 align-middle">DESCRIPCIÓN</TableHead>
          <TableHead className="text-center align-middle">
            {origenLabel}
          </TableHead>
          <TableHead className="text-center align-middle">
            {destinoLabel}
          </TableHead>
          <TableHead className="text-center align-middle">ACCIONES</TableHead>
        </TableRow>
      </TableHeader>
      <TableBody>
        {data.items.length === 0 && (
          <TableRow>
            <TableCell
              colSpan={4}
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
        {data.items.map((item) => {
          const cantidad = cantidades[item.id] ?? "";
          const tieneCantidad = cantidad !== "";
          return (
            <TableRow key={item.id}>
              <TableCell className="celda-datos min-w-0 overflow-hidden">
                {item.descripcion}
              </TableCell>
              <TableCell className="celda-datos celda-datos--flush-right">
                <div className="flex w-full items-center justify-end gap-1 pr-1">
                  <Input
                    type="text"
                    inputMode="numeric"
                    value={cantidad}
                    onChange={(e) => handleCantidad(item.id, e.target.value)}
                    className="h-6 w-14 shrink-0 self-center text-center text-sm font-normal tabular-nums"
                    aria-label={`Cantidad a transferir desde ${origenLabel}`}
                    disabled={destino === null}
                  />
                  <span
                    className={cn(
                      "inline-flex size-4 shrink-0 items-center justify-center text-muted-foreground",
                      !tieneCantidad && "invisible"
                    )}
                    aria-hidden={!tieneCantidad}
                  >
                    <ArrowRight
                      className={TABLE_ROW_ACTION_ICON_CLASS}
                      aria-hidden
                    />
                  </span>
                </div>
              </TableCell>
              <TableCell className="celda-datos celda-datos--flush-left text-left tabular-nums">
                <span className="pl-1">
                  {destino === null ? "—" : tieneCantidad ? cantidad : "—"}
                </span>
              </TableCell>
              <TableCell className="celda-datos celda-datos--accion-relleno-fila">
                <div className={TABLE_ROW_CELL_ICON_ACTIONS_FLEX_CLASS}>
                  <Button
                    type="button"
                    variant="ghost"
                    size="icon"
                    className={TABLE_ROW_ICON_BUTTON_FILLED_BRAND_CLASS}
                    aria-label="Limpiar cantidad"
                    title="Limpiar cantidad"
                    disabled={!tieneCantidad}
                    onClick={() => limpiarFila(item.id)}
                  >
                    <Trash2
                      className={TABLE_ROW_ACTION_ICON_CLASS}
                      aria-hidden
                    />
                  </Button>
                </div>
              </TableCell>
            </TableRow>
          );
        })}
      </TableBody>
    </Table>
  );
}
