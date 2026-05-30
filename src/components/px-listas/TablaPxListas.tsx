"use client";

import { Fragment, useState } from "react";
import { useRouter } from "next/navigation";
import { useTransition } from "react";
import { ChevronDown, ChevronUp, Link2 } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
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
import CeldaDifPct from "@/components/shared/CeldaDifPct";
import AsociarUrlsCompetenciaModal from "@/components/precios-competencia/AsociarUrlsCompetenciaModal";
import {
  PxListasDetalleCompetenciaFilas,
  PxListasDetalleVacio,
} from "@/components/px-listas/PxListasDetalleCompetenciaFilas";
import { guardarPxListaTiendaAction } from "@/actions/pxListas";
import type { ItemPxListasParaTabla } from "@/lib/pxListas";
import {
  DET_PRECIO_MANUAL,
  calcMarcacionPxLista,
  fmtMarcacionPxLista,
} from "@/lib/pxListas";
import {
  calcularResumenPreciosCompetenciaFila,
  listarCompetidoresConFalloRelevamiento,
} from "@/lib/competenciaPreciosFilaResumen";
import { useManualPxMarcacionDraft } from "@/lib/hooks/useManualPxMarcacionDraft";
import type { CompetenciaParaCliente } from "@/services/competencia.service";
import { fmtPrecio } from "@/lib/format";
import {
  TABLE_ROW_ACTION_ICON_CLASS,
  TABLE_ROW_CELL_ICON_ACTIONS_FLEX_CLASS,
  TABLE_ROW_ICON_BUTTON_FILLED_BRAND_CLASS,
} from "@/lib/ui-classes";
import { cn } from "@/lib/utils";

const COL_COUNT = 7;
const COL_WIDTHS = [28, 14, 12, 12, 12, 12, 10] as const;
const MENSAJE_SIN_RESULTADOS = "No se encontraron ítems.";

const CAMPO_FILA_PX_LISTAS_CLASS = cn(
  "input-filtro-unificado !h-8 !min-h-8 !max-h-8 w-full min-w-0 py-0 text-sm leading-none box-border"
);

function FilaPxListas({
  item,
  competencias,
  puedeEditar,
  puedeEditarEnlaces,
  isPending,
  expandido,
  onToggleDetalle,
  onAsociarUrls,
  onGuardarDetPrecio,
  onGuardarManual,
}: {
  item: ItemPxListasParaTabla;
  competencias: CompetenciaParaCliente[];
  puedeEditar: boolean;
  puedeEditarEnlaces: boolean;
  isPending: boolean;
  expandido: boolean;
  onToggleDetalle: () => void;
  onAsociarUrls: () => void;
  onGuardarDetPrecio: (
    codTienda: string,
    detPrecioSeleccion: string,
    pxListaManual: number | null
  ) => void;
  onGuardarManual: (
    codTienda: string,
    pxListaManual: number,
    marcacion: number | null
  ) => void;
}) {
  const manual = useManualPxMarcacionDraft({
    codItem: item.codItem,
    costoCompra: item.costoCompra,
    pxListaManual: item.pxListaManual,
    marcacionGuardada: item.marcacion,
  });

  const pxListaParaResumen = item.pxLista != null && item.pxLista > 0 ? item.pxLista : 0;
  const resumenExpand = calcularResumenPreciosCompetenciaFila(
    item.vinculosPorCompetencia,
    competencias,
    pxListaParaResumen
  );
  const detalle = resumenExpand.competidoresOrdenados;
  const fallos = listarCompetidoresConFalloRelevamiento(
    item.vinculosPorCompetencia,
    competencias
  );
  const filasDetalle = detalle.length + fallos.length;

  return (
    <Fragment>
      <TableRow>
        <TableCell className="celda-datos max-w-0">
          <span className="block truncate" title={item.descripcion}>
            {item.descripcion}
          </span>
        </TableCell>
        <TableCell className="celda-datos p-1" onClick={(e) => e.stopPropagation()}>
          <Select
            value={item.detPrecioSeleccion}
            onValueChange={(v) =>
              onGuardarDetPrecio(
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
              persistirAlBlurConValorValido
              onDraftChange={manual.handlePxDraft}
              onDraftEnd={manual.clearDraft}
              onCommit={(px) => {
                const marcacion = calcMarcacionPxLista(px, item.costoCompra);
                manual.clearDraft();
                onGuardarManual(item.codItem, px, marcacion);
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
            "celda-datos celda-numero p-1 text-center",
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
              persistirAlBlurConValorValido
              onDraftChange={manual.handleMarcacionDraft}
              onDraftEnd={manual.clearDraft}
              onCommit={(marcacion) => {
                const px = manual.pxDesdeMarcacion(marcacion);
                manual.clearDraft();
                if (px != null && px > 0) {
                  onGuardarManual(item.codItem, px, marcacion);
                }
              }}
            />
          ) : (
            <span className="inline-block w-full tabular-nums text-center text-xs">
              {fmtMarcacionPxLista(item.pxLista, item.costoCompra)}
            </span>
          )}
        </TableCell>
        <TableCell className="celda-datos tabular-nums text-center tabla-bloque-secundario-cell-divider">
          {item.pxPromedio != null ? fmtPrecio(item.pxPromedio) : "—"}
        </TableCell>
        <TableCell className="celda-datos text-center tabla-bloque-secundario-cell">
          <CeldaDifPct pct={item.difPctTiendaVsPromedio} />
        </TableCell>
        <TableCell className="celda-datos celda-datos--accion-relleno-fila tabla-bloque-secundario-cell-divider">
          <div className={TABLE_ROW_CELL_ICON_ACTIONS_FLEX_CLASS}>
            <Button
              type="button"
              variant="ghost"
              size="icon"
              className={TABLE_ROW_ICON_BUTTON_FILLED_BRAND_CLASS}
              aria-label={expandido ? "Ocultar detalle" : "Ver detalle"}
              aria-expanded={expandido}
              onClick={onToggleDetalle}
            >
              {expandido ? (
                <ChevronUp className={TABLE_ROW_ACTION_ICON_CLASS} aria-hidden />
              ) : (
                <ChevronDown className={TABLE_ROW_ACTION_ICON_CLASS} aria-hidden />
              )}
            </Button>
            {puedeEditarEnlaces ? (
              <Button
                type="button"
                variant="ghost"
                size="icon"
                className={TABLE_ROW_ICON_BUTTON_FILLED_BRAND_CLASS}
                aria-label="Asociar URL"
                onClick={onAsociarUrls}
              >
                <Link2 className={TABLE_ROW_ACTION_ICON_CLASS} aria-hidden />
              </Button>
            ) : null}
          </div>
        </TableCell>
      </TableRow>
      {expandido && filasDetalle === 0 ? (
        <PxListasDetalleVacio codTienda={item.codItem} />
      ) : null}
      {expandido ? (
        <PxListasDetalleCompetenciaFilas
          codTienda={item.codItem}
          detalle={detalle}
          fallos={fallos}
          vinculosPorCompetencia={item.vinculosPorCompetencia}
        />
      ) : null}
    </Fragment>
  );
}

export default function TablaPxListas({
  items,
  competencias,
  puedeEditar,
  puedeEditarEnlaces,
}: {
  items: ItemPxListasParaTabla[];
  competencias: CompetenciaParaCliente[];
  puedeEditar: boolean;
  puedeEditarEnlaces: boolean;
}) {
  const router = useRouter();
  const [isPending, startTransition] = useTransition();
  const [expandidos, setExpandidos] = useState<Set<string>>(() => new Set());
  const [asociarFila, setAsociarFila] = useState<{
    codTienda: string;
    descripcion: string;
    vinculosPorCompetencia: ItemPxListasParaTabla["vinculosPorCompetencia"];
  } | null>(null);

  function toggleDetalle(codTienda: string) {
    setExpandidos((prev) => {
      const next = new Set(prev);
      if (next.has(codTienda)) next.delete(codTienda);
      else next.add(codTienda);
      return next;
    });
  }

  function guardarManual(
    codTienda: string,
    pxListaManual: number,
    marcacion: number | null
  ) {
    startTransition(async () => {
      const res = await guardarPxListaTiendaAction({
        codTienda,
        detPrecioSeleccion: DET_PRECIO_MANUAL,
        pxListaManual: pxListaManual > 0 ? pxListaManual : null,
        marcacion: marcacion != null && marcacion > 0 ? marcacion : null,
      });
      if (!res.ok) {
        toast.error(res.error);
        return;
      }
      router.refresh();
    });
  }

  function guardarDetPrecio(
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
    <>
      <Table variant="compact" scrollX={false} className="tabla-px-listas-listado">
        <colgroup>
          {COL_WIDTHS.map((pct, i) => (
            <col key={i} style={{ width: `${pct}%` }} />
          ))}
        </colgroup>
        <TableHeader>
          <TableRow className="hover:bg-transparent">
            <TableHead>DESCRIPCIÓN</TableHead>
            <TableHead>DET PRECIO</TableHead>
            <TableHead className="text-center">PX LISTA</TableHead>
            <TableHead className="text-center">MARCACION</TableHead>
            <TableHead className="text-center tabla-bloque-secundario-head-divider">
              PX PROMEDIO
            </TableHead>
            <TableHead className="text-center tabla-bloque-secundario-head">
              DIF TIENDA
            </TableHead>
            <TableHead className="text-center tabla-bloque-secundario-head-divider">
              ACCIONES
            </TableHead>
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
                competencias={competencias}
                puedeEditar={puedeEditar}
                puedeEditarEnlaces={puedeEditarEnlaces}
                isPending={isPending}
                expandido={expandidos.has(item.codItem)}
                onToggleDetalle={() => toggleDetalle(item.codItem)}
                onAsociarUrls={() =>
                  setAsociarFila({
                    codTienda: item.codItem,
                    descripcion: item.descripcion,
                    vinculosPorCompetencia: item.vinculosPorCompetencia,
                  })
                }
                onGuardarDetPrecio={guardarDetPrecio}
                onGuardarManual={guardarManual}
              />
            ))
          )}
        </TableBody>
      </Table>
      {asociarFila ? (
        <AsociarUrlsCompetenciaModal
          open={!!asociarFila}
          onOpenChange={(o) => !o && setAsociarFila(null)}
          codTienda={asociarFila.codTienda}
          descripcion={asociarFila.descripcion}
          competencias={competencias}
          vinculosPorCompetencia={asociarFila.vinculosPorCompetencia}
          puedeEditar={puedeEditarEnlaces}
          onGuardado={() => {
            setAsociarFila(null);
            router.refresh();
          }}
        />
      ) : null}
    </>
  );
}
