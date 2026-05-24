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
import {
  guardarCostoCxProdTiendaAction,
  guardarPxListaTiendaAction,
} from "@/actions/cxPxTienda";
import {
  CX_PROD_SELECCION_PROM,
  PX_LISTA_SELECCION_PROM,
  costoCxProdMostrado,
  marcacionCxPxDeItem,
  pxListaMostrado,
  type ItemCxPxTiendaParaTabla,
} from "@/lib/cxPxTienda";
import { fmtMarcacionPct, fmtPrecio } from "@/lib/format";
import { cn } from "@/lib/utils";

const COL_COUNT = 4;
const MENSAJE_SIN_RESULTADOS = "No se encontraron ítems.";

/** Reparto interno CX PROD. / PX LISTA (12% + 8% del ancho total de tabla, dentro del 20% de columna). */
const FILA_CX_PX_CLASS = "flex items-center gap-1 min-w-0 w-full";
const FILA_CX_PX_SELECT_SLOT_CLASS = "min-w-0 flex-[3] basis-0";
const FILA_CX_PX_SELECT_TRIGGER_CLASS =
  "input-filtro-unificado h-8 w-full min-w-0 max-w-none";
const FILA_CX_PX_VALOR_SLOT_CLASS =
  "celda-numero tabular-nums min-w-0 flex-[2] basis-0 text-right text-sm font-medium text-foreground";

export default function TablaCxPxTienda({
  items,
  puedeEditar,
}: {
  items: ItemCxPxTiendaParaTabla[];
  puedeEditar: boolean;
}) {
  const router = useRouter();
  const [isPending, startTransition] = useTransition();

  function handleCambioCx(codTienda: string, seleccion: string) {
    startTransition(async () => {
      const res = await guardarCostoCxProdTiendaAction({ codTienda, seleccion });
      if (!res.ok) {
        toast.error(res.error);
        return;
      }
      router.refresh();
    });
  }

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
        <col className="w-[50%]" />
        <col className="w-[20%]" />
        <col className="w-[20%]" />
        <col className="w-[10%]" />
      </colgroup>
      <TableHeader>
        <TableRow className="hover:bg-transparent">
          <TableHead>DESCRIPCIÓN</TableHead>
          <TableHead>CX PROD.</TableHead>
          <TableHead>PX LISTA</TableHead>
          <TableHead className="text-center">MARCACION</TableHead>
        </TableRow>
      </TableHeader>
      <TableBody>
        {items.length === 0 ? (
          <EmptyTableRow colSpan={COL_COUNT} message={MENSAJE_SIN_RESULTADOS} />
        ) : (
          items.map((item) => {
            const sinVinculosCx = item.opcionesProveedor.length === 0;
            const costoVista = costoCxProdMostrado(item);
            const pxListaVista = pxListaMostrado(item);
            const sinOpcionesPxLista = item.opcionesPxLista.length === 0;
            const marcacion = marcacionCxPxDeItem(item);

            return (
              <TableRow key={item.id}>
                <TableCell className="celda-datos celda-destacado min-w-0 overflow-hidden">
                  {item.descripcion}
                </TableCell>
                <TableCell className="celda-datos min-w-0 p-1">
                  <div className={FILA_CX_PX_CLASS}>
                    <div className={FILA_CX_PX_SELECT_SLOT_CLASS}>
                      <Select
                        value={item.seleccion}
                        onValueChange={(v) => handleCambioCx(item.codTienda, v)}
                        disabled={!puedeEditar || isPending || sinVinculosCx}
                      >
                        <SelectTrigger
                          className={cn(
                            FILA_CX_PX_SELECT_TRIGGER_CLASS,
                            !puedeEditar && "pointer-events-none opacity-80"
                          )}
                          aria-label={`Costo producto ${item.codTienda}`}
                        >
                          <SelectValue placeholder="CX PROD." />
                        </SelectTrigger>
                        <SelectContent
                          position="popper"
                          side="bottom"
                          align="start"
                          className="select-content-filtro"
                        >
                          <SelectItem value={CX_PROD_SELECCION_PROM}>CX. PROM.</SelectItem>
                          {item.opcionesProveedor.map((op) => (
                            <SelectItem key={op.codExt} value={op.codExt}>
                              {op.etiqueta}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </div>
                    <span className={FILA_CX_PX_VALOR_SLOT_CLASS} aria-label="Costo seleccionado">
                      ${fmtPrecio(costoVista)}
                    </span>
                  </div>
                </TableCell>
                <TableCell className="celda-datos min-w-0 p-1">
                  <div className={FILA_CX_PX_CLASS}>
                    <div className={FILA_CX_PX_SELECT_SLOT_CLASS}>
                      <Select
                        value={item.seleccionPxLista}
                        onValueChange={(v) => handleCambioPxLista(item.codTienda, v)}
                        disabled={!puedeEditar || isPending}
                      >
                        <SelectTrigger
                          className={cn(
                            FILA_CX_PX_SELECT_TRIGGER_CLASS,
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
                    </div>
                    <span
                      className={FILA_CX_PX_VALOR_SLOT_CLASS}
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
                <TableCell className="celda-datos text-center tabular-nums text-sm font-medium text-foreground">
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
