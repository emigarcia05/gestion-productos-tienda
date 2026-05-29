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

import MarcacionPxListaCelda from "@/components/tienda/MarcacionPxListaCelda";

import { guardarPxListaTiendaAction } from "@/actions/pxListas";

import type { ItemPxListasParaTabla } from "@/lib/pxListas";

import { DET_PRECIO_MANUAL, fmtMarcacionPxLista } from "@/lib/pxListas";

import { useManualPxMarcacionDraft } from "@/lib/hooks/useManualPxMarcacionDraft";

import { fmtPrecio } from "@/lib/format";

import { cn } from "@/lib/utils";



const COL_COUNT = 4;



const MENSAJE_SIN_RESULTADOS = "No se encontraron ítems.";



/** Misma altura que el Select DET PRECIO (`h-8`; anula `min-height` de `.input-filtro-unificado`). */

const CAMPO_FILA_PX_LISTAS_CLASS = cn(

  "input-filtro-unificado !h-8 !min-h-8 !max-h-8 w-full min-w-0 py-0 text-sm leading-none box-border"

);



function FilaPxListas({

  item,

  puedeEditar,

  isPending,

  onGuardar,

}: {

  item: ItemPxListasParaTabla;

  puedeEditar: boolean;

  isPending: boolean;

  onGuardar: (

    codTienda: string,

    detPrecioSeleccion: string,

    pxListaManual: number | null

  ) => void;

}) {

  const manual = useManualPxMarcacionDraft({

    codItem: item.codItem,

    costoCompra: item.costoCompra,

    pxListaManual: item.pxListaManual,

    marcacionGuardada: item.marcacion,

  });



  return (

    <TableRow>

      <TableCell className="celda-datos">{item.descripcion}</TableCell>

      <TableCell className="celda-datos p-1" onClick={(e) => e.stopPropagation()}>

        <Select

          value={item.detPrecioSeleccion}

          onValueChange={(v) =>

            onGuardar(

              item.codItem,

              v,

              v === DET_PRECIO_MANUAL

                ? (item.pxListaManual ?? item.pxPrecioSugerido ?? null)

                : null

            )

          }

          disabled={!puedeEditar || isPending}

        >

          <SelectTrigger

            size="sm"

            className={cn(

              CAMPO_FILA_PX_LISTAS_CLASS,

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

        className="celda-datos celda-px-lista-col p-1 text-center"

        onClick={(e) => e.stopPropagation()}

      >

        {item.esDetPrecioManual ? (

          <PxListaCxPxCelda

            pesosCommit={manual.pxVista}

            puedeEditar={puedeEditar}

            disabled={isPending}

            shellClassName={CAMPO_FILA_PX_LISTAS_CLASS}

            onDraftChange={manual.handlePxDraft}

            onDraftEnd={manual.clearDraft}

            onCommit={(px) => {

              manual.clearDraft();

              onGuardar(item.codItem, DET_PRECIO_MANUAL, px);

            }}

          />

        ) : (

          <span

            className={cn(

              "inline-block w-full tabular-nums text-center text-xs",

              item.pxLista == null && "text-muted-foreground"

            )}

          >

            {item.pxLista != null ? `$${fmtPrecio(item.pxLista)}` : "—"}

          </span>

        )}

      </TableCell>

      <TableCell

        className={cn(

          "celda-datos celda-numero p-1 text-right",

          item.esDetPrecioManual && "celda-marcacion-col"

        )}

        onClick={(e) => e.stopPropagation()}

      >

        {item.esDetPrecioManual ? (

          <MarcacionPxListaCelda

            marcacionCommit={manual.marcacionVista}

            puedeEditar={puedeEditar}

            disabled={isPending}

            shellClassName={CAMPO_FILA_PX_LISTAS_CLASS}

            onDraftChange={manual.handleMarcacionDraft}

            onDraftEnd={manual.clearDraft}

            onCommit={(marcacion) => {

              const px = manual.pxDesdeMarcacion(marcacion);

              manual.clearDraft();

              if (px != null && px > 0) {

                onGuardar(item.codItem, DET_PRECIO_MANUAL, px);

              }

            }}

          />

        ) : (

          fmtMarcacionPxLista(item.pxLista, item.costoCompra)

        )}

      </TableCell>

    </TableRow>

  );

}



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

          <TableHead className="text-center">PX LISTA</TableHead>

          <TableHead className="text-right">MARCACION</TableHead>

        </TableRow>

      </TableHeader>

      <TableBody>

        {items.length === 0 ? (

          <EmptyTableRow colSpan={COL_COUNT} message={MENSAJE_SIN_RESULTADOS} />

        ) : (

          items.map((item) => (

            <FilaPxListas

              key={item.id}

              item={item}

              puedeEditar={puedeEditar}

              isPending={isPending}

              onGuardar={guardar}

            />

          ))

        )}

      </TableBody>

    </Table>

  );

}

