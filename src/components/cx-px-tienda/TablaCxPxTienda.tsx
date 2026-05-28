"use client";

import { useRouter } from "next/navigation";
import { useTransition } from "react";
import { toast } from "sonner";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
  EmptyTableRow,
} from "@/components/ui/table";
import CeldaCxProdTienda from "@/components/shared/CeldaCxProdTienda";
import { guardarPxListaTiendaAction } from "@/actions/cxPxTienda";
import {
  PX_LISTA_SELECCION_PROM,
  marcacionCxPxDeItem,
  pxListaMostrado,
  type ItemCxPxTiendaParaTabla,
} from "@/lib/cxPxTienda";
import { fmtMarcacionPct, fmtPrecio } from "@/lib/format";
import { cn } from "@/lib/utils";

const COL_COUNT = 4;
const MENSAJE_SIN_RESULTADOS = "No se encontraron ítems.";

export default function TablaCxPxTienda({
  items,
  puedeEditar,
}: {
  items: ItemCxPxTiendaParaTabla[];
  puedeEditar: boolean;
}) {
  const router = useRouter();
  const [isPending, startTransition] = useTransition();

  function handleCambioPxLista(codTienda: string, seleccion: string) {
    startTransition(async () => {
      const res = await guardarPxListaTiendaAction({ codTienda, seleccion });
      if (!res.ok) {
        toast.error(res.error);
        return;
      }
      router.refresh();
    });
  }

  return (
    <Table variant="compact" scrollX={false} className="tabla-cx-px-tienda-listado">
      <colgroup>
        <col className="w-[45%]" />
        <col className="w-[22%]" />
        <col className="w-[22%]" />
        <col className="w-[11%]" />
      </colgroup>
      <TableHeader>
        <TableRow className="hover:bg-transparent">
          <TableHead>DESCRIPCIÓN</TableHead>
          <TableHead>CX PROD.</TableHead>
          <TableHead>PX LISTA</TableHead>
          <TableHead className="text-center tabla-bloque-secundario-head-divider">
            MARCACION
          </TableHead>
        </TableRow>
      </TableHeader>
      <TableBody>
        {items.length === 0 ? (
          <EmptyTableRow colSpan={COL_COUNT} message={MENSAJE_SIN_RESULTADOS} />
        ) : (
          items.map((item) => {
            const pxListaVista = pxListaMostrado(item);
            const sinOpcionesPxLista = item.opcionesPxLista.length === 0;
            const marcacion = marcacionCxPxDeItem(item);

            return (
              <TableRow key={item.id}>
                <TableCell className="celda-datos celda-destacado min-w-0 overflow-hidden">
                  {item.descripcion}
                </TableCell>
                <TableCell className="celda-datos min-w-0">
                  <CeldaCxProdTienda
                    codTienda={item.codTienda}
                    cxProd={item}
                    puedeEditar={puedeEditar && !isPending}
                  />
                </TableCell>
                <TableCell className="celda-datos min-w-0">
                  <div className="grid w-full min-w-0 grid-cols-2 items-center gap-1.5">
                    <Select
                      value={item.seleccionPxLista}
                      onValueChange={(v) => handleCambioPxLista(item.codTienda, v)}
                      disabled={!puedeEditar || isPending}
                    >
                      <SelectTrigger
                        className={cn(
                          "input-filtro-unificado h-8 w-full min-w-0",
                          !puedeEditar && "pointer-events-none opacity-80"
                        )}
                        aria-label={`Px lista ${item.codTienda}`}
                      >
                        <SelectValue placeholder="PX LISTA" />
                      </SelectTrigger>
                      <SelectContent
                        position="popper"
                        side="bottom"
                        align="start"
                        className="select-content-filtro"
                      >
                        <SelectItem value={PX_LISTA_SELECCION_PROM}>PX PROM.</SelectItem>
                        {item.opcionesPxLista.map((op) => (
                          <SelectItem key={op.competenciaId} value={op.competenciaId}>
                            {op.etiqueta}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                    <span
                      className="celda-numero tabular-nums text-center text-sm font-medium text-foreground min-w-0 block w-full"
                      aria-label="Precio lista seleccionado"
                      title={
                        sinOpcionesPxLista && item.seleccionPxLista === PX_LISTA_SELECCION_PROM
                          ? "Px. lista tienda (DUX)"
                          : undefined
                      }
                    >
                      ${fmtPrecio(pxListaVista)}
                    </span>
                  </div>
                </TableCell>
                <TableCell
                  className={cn(
                    "celda-datos text-center tabular-nums text-sm font-medium text-foreground",
                    "tabla-bloque-secundario-cell-divider"
                  )}
                >
                  {marcacion != null ? (
                    <span aria-label="Marcación">{fmtMarcacionPct(marcacion)}</span>
                  ) : (
                    <span className="text-muted-foreground">—</span>
                  )}
                </TableCell>
              </TableRow>
            );
          })
        )}
      </TableBody>
    </Table>
  );
}
