"use client";

import { useRouter } from "next/navigation";
import { useTransition } from "react";
import { toast } from "sonner";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
  EmptyTableRow,
} from "@/components/ui/table";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import PxListaCxPxCelda from "@/components/tienda/PxListaCxPxCelda";
import { guardarPxListaTiendaAction } from "@/actions/pxListas";
import type { ItemPxListasParaTabla } from "@/lib/pxListas";
import { DET_PRECIO_MANUAL, fmtMarcacionPxLista } from "@/lib/pxListas";
import { fmtPrecio } from "@/lib/format";
import { cn } from "@/lib/utils";

const COL_COUNT = 4;

const MENSAJE_SIN_RESULTADOS = "No se encontraron ítems.";

export default function TablaPxListas({
  items,
  puedeEditar,
}: {
  items: ItemPxListasParaTabla[];
  puedeEditar: boolean;
}) {
  const router = useRouter();
  const [isPending, startTransition] = useTransition();

  function guardar(
    codTienda: string,
    detPrecioSeleccion: string,
    pxListaManual: number | null
  ) {
    startTransition(async () => {
      const res = await guardarPxListaTiendaAction({
        codTienda,
        detPrecioSeleccion,
        pxListaManual,
      });
      if (!res.ok) {
        toast.error(res.error);
        return;
      }
      router.refresh();
    });
  }

  return (
    <Table variant="compact" scrollX={false} className="tabla-px-listas-listado">
      <colgroup>
        <col className="w-[50%]" />
        <col className="w-[20%]" />
        <col className="w-[20%]" />
        <col className="w-[10%]" />
      </colgroup>
      <TableHeader>
        <TableRow className="hover:bg-transparent">
          <TableHead>DESCRIPCIÓN</TableHead>
          <TableHead>DET PRECIO</TableHead>
          <TableHead className="text-right">PX LISTA</TableHead>
          <TableHead className="text-right">MARCACION</TableHead>
        </TableRow>
      </TableHeader>
      <TableBody>
        {items.length === 0 ? (
          <EmptyTableRow colSpan={COL_COUNT} message={MENSAJE_SIN_RESULTADOS} />
        ) : (
          items.map((item) => (
            <TableRow key={item.id}>
              <TableCell className="celda-datos">{item.descripcion}</TableCell>
              <TableCell className="celda-datos p-1" onClick={(e) => e.stopPropagation()}>
                <Select
                  value={item.detPrecioSeleccion}
                  onValueChange={(v) =>
                    guardar(
                      item.codItem,
                      v,
                      v === DET_PRECIO_MANUAL ? item.pxListaManual : null
                    )
                  }
                  disabled={!puedeEditar || isPending}
                >
                  <SelectTrigger
                    className={cn(
                      "input-filtro-unificado h-8 w-full min-w-0",
                      !puedeEditar && "pointer-events-none opacity-80"
                    )}
                    aria-label={`Detalle precio ${item.codItem}`}
                  >
                    <SelectValue placeholder="DET PRECIO" />
                  </SelectTrigger>
                  <SelectContent
                    position="popper"
                    side="bottom"
                    align="start"
                    className="select-content-filtro max-h-64"
                  >
                    <SelectItem value={DET_PRECIO_MANUAL}>PX MANUAL</SelectItem>
                    {item.opcionesCompetencia.map((op) => (
                      <SelectItem key={op.competenciaId} value={op.competenciaId}>
                        {op.nombre}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </TableCell>
              <TableCell
                className="celda-datos p-1 text-right"
                onClick={(e) => e.stopPropagation()}
              >
                {item.esDetPrecioManual ? (
                  <PxListaCxPxCelda
                    pesosCommit={item.pxListaManual ?? 0}
                    puedeEditar={puedeEditar}
                    disabled={isPending}
                    onCommit={(px) => guardar(item.codItem, DET_PRECIO_MANUAL, px)}
                  />
                ) : (
                  <span
                    className={cn(
                      "inline-block w-full tabular-nums text-right text-xs",
                      item.pxLista == null && "text-muted-foreground"
                    )}
                  >
                    {item.pxLista != null ? `$${fmtPrecio(item.pxLista)}` : "—"}
                  </span>
                )}
              </TableCell>
              <TableCell className="celda-datos celda-numero tabular-nums text-right">
                {fmtMarcacionPxLista(item.pxLista, item.costoCompra)}
              </TableCell>
            </TableRow>
          ))
        )}
      </TableBody>
    </Table>
  );
}
