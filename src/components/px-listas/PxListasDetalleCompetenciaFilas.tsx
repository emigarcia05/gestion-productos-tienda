"use client";

import { TableCell, TableRow } from "@/components/ui/table";
import CeldaDifPct from "@/components/shared/CeldaDifPct";
import RelevamientoUltimoMensaje from "@/components/precios-competencia/RelevamientoUltimoMensaje";
import { fmtPrecio } from "@/lib/format";
import type {
  CompetidorFalloRelevamientoFila,
  CompetidorPrecioFila,
} from "@/lib/competenciaPreciosFilaResumen";
import type { DatoVinculoCompetenciaCliente } from "@/services/competenciaVinculo.service";
import { cn } from "@/lib/utils";

const SUBFILA_DETALLE_CLASS = "tabla-fila-detalle-competencia";
const SUBFILA_CELDA_BLOQUE_CLASS = "tabla-fila-detalle-competencia-celda";
const SUBFILA_CELDA_HUECA_CLASS = "tabla-fila-detalle-competencia-hueca";

function DetalleCompetidorOk({
  item,
  esUltima,
}: {
  item: CompetidorPrecioFila;
  esUltima: boolean;
}) {
  return (
    <TableRow
      className={cn(
        SUBFILA_DETALLE_CLASS,
        esUltima && "tabla-fila-detalle-competencia--cierre",
        "hover:bg-transparent"
      )}
    >
      <TableCell
        className={cn(
          "celda-datos max-w-0 pl-6 !text-right",
          SUBFILA_CELDA_BLOQUE_CLASS
        )}
      >
        <span
          className="block truncate text-right font-medium text-foreground"
          title={item.nombre}
        >
          {item.nombre}
        </span>
      </TableCell>
      <TableCell
        className={cn(
          "celda-datos tabular-nums text-center tabla-bloque-secundario-cell-divider",
          SUBFILA_CELDA_BLOQUE_CLASS
        )}
      >
        {fmtPrecio(item.px)}
      </TableCell>
      <TableCell className={cn("celda-datos text-center tabla-bloque-secundario-cell", SUBFILA_CELDA_BLOQUE_CLASS)}>
        <CeldaDifPct pct={item.difPctVsTienda} />
      </TableCell>
      <TableCell className={cn("celda-datos", SUBFILA_CELDA_HUECA_CLASS)} aria-hidden />
    </TableRow>
  );
}

function DetalleCompetidorFallo({
  item,
  vinculo,
  esUltima,
}: {
  item: CompetidorFalloRelevamientoFila;
  vinculo: DatoVinculoCompetenciaCliente | undefined;
  esUltima: boolean;
}) {
  return (
    <TableRow
      className={cn(
        SUBFILA_DETALLE_CLASS,
        esUltima && "tabla-fila-detalle-competencia--cierre",
        "hover:bg-transparent"
      )}
    >
      <TableCell
        colSpan={2}
        className={cn(
          "celda-datos py-2 pl-6 !text-right tabla-bloque-secundario-cell-divider",
          SUBFILA_CELDA_BLOQUE_CLASS
        )}
      >
        <div className="flex flex-col gap-1.5 max-w-full items-end text-right">
          <span className="text-sm font-medium text-foreground">{item.nombre}</span>
          <RelevamientoUltimoMensaje vinculo={vinculo} />
        </div>
      </TableCell>
      <TableCell colSpan={2} className={cn("celda-datos", SUBFILA_CELDA_HUECA_CLASS)} aria-hidden />
    </TableRow>
  );
}

export function PxListasDetalleVacio({ codTienda }: { codTienda: string }) {
  return (
    <TableRow
      key={`${codTienda}-detalle-vacio`}
      className={cn(
        SUBFILA_DETALLE_CLASS,
        "tabla-fila-detalle-competencia--cierre",
        "hover:bg-transparent"
      )}
    >
      <TableCell colSpan={4} className={cn("celda-datos", SUBFILA_CELDA_BLOQUE_CLASS)}>
        <p className="text-sm text-muted-foreground text-center">
          Sin precios relevados de competidores para este producto.
        </p>
      </TableCell>
    </TableRow>
  );
}

export function PxListasDetalleCompetenciaFilas({
  codTienda,
  detalle,
  fallos,
  vinculosPorCompetencia,
}: {
  codTienda: string;
  detalle: CompetidorPrecioFila[];
  fallos: CompetidorFalloRelevamientoFila[];
  vinculosPorCompetencia: Record<string, DatoVinculoCompetenciaCliente>;
}) {
  return (
    <>
      {detalle.map((item, idx) => (
        <DetalleCompetidorOk
          key={`${codTienda}-${item.competenciaId}-ok`}
          item={item}
          esUltima={idx === detalle.length - 1 && fallos.length === 0}
        />
      ))}
      {fallos.map((item, idx) => (
        <DetalleCompetidorFallo
          key={`${codTienda}-${item.competenciaId}-fallo`}
          item={item}
          vinculo={vinculosPorCompetencia[item.competenciaId]}
          esUltima={idx === fallos.length - 1}
        />
      ))}
    </>
  );
}
