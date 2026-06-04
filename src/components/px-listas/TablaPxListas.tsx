"use client";

import { Fragment, useState } from "react";
import { useRouter } from "next/navigation";
import { useTransition } from "react";
import { ChevronDown, ChevronUp, Link2, RefreshCw } from "lucide-react";
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
import CeldaDifPct from "@/components/shared/CeldaDifPct";
import AsociarUrlsCompetenciaModal from "@/components/precios-competencia/AsociarUrlsCompetenciaModal";
import {
  PxListasDetalleCompetenciaFilas,
  PxListasDetalleVacio,
} from "@/components/px-listas/PxListasDetalleCompetenciaFilas";
import { relevarUrlsProductoCompetenciaAction } from "@/actions/competenciaPrecios";
import type { ItemPxListasParaTabla } from "@/lib/pxListas";
import { vinculosArrayToRecord, productoTieneVinculosRelevables } from "@/lib/pxListasVinculos";
import type { CompetenciaParaCliente } from "@/services/competencia.service";
import { fmtPrecio } from "@/lib/format";
import {
  TABLE_ROW_ACTION_ICON_CLASS,
  TABLE_ROW_CELL_ICON_ACTIONS_FLEX_CLASS,
  TABLE_ROW_ICON_BUTTON_FILLED_BRAND_CLASS,
} from "@/lib/ui-classes";
import { cn } from "@/lib/utils";

const COL_COUNT = 4;
const COL_WIDTHS = [46, 18, 18, 18] as const;
const MENSAJE_SIN_RESULTADOS = "No se encontraron ítems.";

function FilaPxListas({
  item,
  competencias,
  puedeEditarEnlaces,
  isPending,
  expandido,
  onToggleDetalle,
  onAsociarUrls,
  onRelevarUrls,
  relevandoCodTienda,
}: {
  item: ItemPxListasParaTabla;
  competencias: CompetenciaParaCliente[];
  puedeEditarEnlaces: boolean;
  isPending: boolean;
  expandido: boolean;
  onToggleDetalle: () => void;
  onAsociarUrls: () => void;
  onRelevarUrls: () => void;
  relevandoCodTienda: string | null;
}) {
  const detalle = item.competidoresPrecioDetalle;
  const fallos = item.competidoresFalloDetalle;
  const filasDetalle = detalle.length + fallos.length;
  const vinculosPorCompetencia = vinculosArrayToRecord(item.vinculosCompetencia);
  const puedeRelevarUrls = productoTieneVinculosRelevables(item.vinculosCompetencia);

  return (
    <Fragment>
      <TableRow>
        <TableCell className="celda-datos max-w-0">
          <span className="block truncate" title={item.descripcion}>
            {item.descripcion}
          </span>
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
              <>
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
                <Button
                  type="button"
                  variant="ghost"
                  size="icon"
                  disabled={
                    !puedeRelevarUrls || isPending || relevandoCodTienda !== null
                  }
                  className={TABLE_ROW_ICON_BUTTON_FILLED_BRAND_CLASS}
                  aria-label="Relevar URLs asociadas"
                  title={
                    puedeRelevarUrls
                      ? "Relevar URLs asociadas"
                      : "No hay URLs asociadas para relevar"
                  }
                  onClick={onRelevarUrls}
                >
                  <RefreshCw
                    className={
                      relevandoCodTienda === item.codItem ? "animate-spin" : ""
                    }
                    aria-hidden
                  />
                </Button>
              </>
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
          vinculosPorCompetencia={vinculosPorCompetencia}
        />
      ) : null}
    </Fragment>
  );
}

export default function TablaPxListas({
  items,
  competencias,
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
  const [relevandoCodTienda, setRelevandoCodTienda] = useState<string | null>(null);
  const [asociarFila, setAsociarFila] = useState<{
    codTienda: string;
    descripcion: string;
    vinculosPorCompetencia: ReturnType<typeof vinculosArrayToRecord>;
  } | null>(null);

  function toggleDetalle(codTienda: string) {
    setExpandidos((prev) => {
      const next = new Set(prev);
      if (next.has(codTienda)) next.delete(codTienda);
      else next.add(codTienda);
      return next;
    });
  }

  function relevarUrlsProducto(codTienda: string) {
    setRelevandoCodTienda(codTienda);
    startTransition(async () => {
      try {
        const res = await relevarUrlsProductoCompetenciaAction({ codTienda });
        if (!res.ok) {
          toast.error(res.error);
          return;
        }
        const { procesados, encontrados, vacios, errores } = res.data;
        const erroresTxt = errores > 0 ? `, ${errores} con error` : "";
        toast.success(
          `${procesados} competidor${procesados !== 1 ? "es" : ""}: ${encontrados} con precio, ${vacios} sin precio${erroresTxt}.`
        );
        router.refresh();
      } finally {
        setRelevandoCodTienda(null);
      }
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
                puedeEditarEnlaces={puedeEditarEnlaces}
                isPending={isPending}
                expandido={expandidos.has(item.codItem)}
                onToggleDetalle={() => toggleDetalle(item.codItem)}
                onAsociarUrls={() =>
                  setAsociarFila({
                    codTienda: item.codItem,
                    descripcion: item.descripcion,
                    vinculosPorCompetencia: vinculosArrayToRecord(item.vinculosCompetencia),
                  })
                }
                onRelevarUrls={() => relevarUrlsProducto(item.codItem)}
                relevandoCodTienda={relevandoCodTienda}
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
          onVinculosActualizados={() => router.refresh()}
        />
      ) : null}
    </>
  );
}
