"use client";

import { TableCell, TableRow } from "@/components/ui/table";
import { fmtPrecio } from "@/lib/format";
import { cn } from "@/lib/utils";

type Props = {
  /** Texto del bloque (se muestra en MAYÚSCULAS). */
  titulo: string;
  colSpan: number;
  /** Total opcional del bloque, alineado a la derecha (0 → "—"). */
  totalBloque?: number;
  className?: string;
};

/**
 * Fila de sección en `tbody` (subencabezado entre grupos de datos).
 * Patrón documentado: Pedido Urgente + modales Balance (tipo de gasto / rubro).
 */
export default function TablaSubencabezadoSeccionRow({
  titulo,
  colSpan,
  totalBloque,
  className,
}: Props) {
  const etiqueta = titulo.trim().toLocaleUpperCase("es");

  return (
    <TableRow
      className={cn(
        "tabla-fila-altura-auto tabla-fila-seccion-subencabezado",
        "cursor-default border-b border-border hover:bg-transparent",
        className,
      )}
    >
      <TableCell
        colSpan={colSpan}
        className="tabla-fila-seccion-subencabezado-celda celda-datos !text-left"
      >
        <div className="flex min-w-0 items-center justify-between gap-3">
          <span className="min-w-0 truncate">{etiqueta}</span>
          {totalBloque !== undefined ? (
            <span className="shrink-0 text-[11px] font-medium tabular-nums text-muted-foreground">
              {totalBloque === 0 ? "—" : `$${fmtPrecio(totalBloque)}`}
            </span>
          ) : null}
        </div>
      </TableCell>
    </TableRow>
  );
}
