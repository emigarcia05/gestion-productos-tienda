"use client";

import { useEffect, useMemo, useState } from "react";
import { ArrowRight, AlertTriangle, Check, Trash2 } from "lucide-react";
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
import HistorialTransfDepositosModal from "@/components/stock/HistorialTransfDepositosModal";
import {
  TableEmptyState,
  tableEmptyStateContainerVariants,
  tableEmptyStateMessageVariants,
} from "@/components/shared/TableEmptyState";
import { cn } from "@/lib/utils";
import {
  ICON_WARNING_INTERACTIVE_CLASS,
  TABLE_ROW_ACTION_ICON_CLASS,
  TABLE_ROW_CELL_ICON_ACTIONS_FLEX_CLASS,
  TABLE_ROW_ICON_BUTTON_FILLED_BRAND_CLASS,
} from "@/lib/ui-classes";
import { formatDdMmHhMmArgentina } from "@/lib/fechaArgentina";
import {
  SUCURSAL_LABEL_TRANSF,
  TRANSF_DEPOSITOS_VENTANA_DUPLICADO_DIAS,
} from "@/lib/transfDepositosControl";

/** DESCRIPCIÓN · origen · flecha · destino · ACCIONES (borrar / historial / aviso). */
const PCT_DESC = 44;
const PCT_ORIGEN = 16;
const PCT_FLECHA = 6;
const PCT_DESTINO = 16;
const PCT_ACCIONES = 18;

interface Props {
  data: TransfDepositosData;
  origen: Sucursal | null;
  destino: Sucursal | null;
}

/**
 * Grilla **Trans. Depósitos**:
 * DESCRIPCIÓN · {origen} · → · {destino} · ACCIONES (Trash2, Check historial, AlertTriangle).
 */
export default function TablaTransfDepositos({ data, origen, destino }: Props) {
  const [cantidades, setCantidades] = useState<Record<string, string>>({});
  const [historial, setHistorial] = useState<{
    codTienda: string;
    descripcion: string;
  } | null>(null);

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
  const destinoSeleccionado = destino !== null;
  const origenLabel = origen ? SUCURSAL_LABEL_TRANSF[origen] : "—";
  const destinoLabel = destino ? SUCURSAL_LABEL_TRANSF[destino] : "—";

  const controlesPorClave = useMemo(() => {
    const map = new Map<string, { cantidad: number; createdAtIso: string }>();
    for (const c of data.controlesRecientes) {
      const key = `${c.codTienda}|${c.cantidad}`;
      if (!map.has(key)) {
        map.set(key, { cantidad: c.cantidad, createdAtIso: c.createdAtIso });
      }
    }
    return map;
  }, [data.controlesRecientes]);

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
    <>
      <Table variant="compact">
        <colgroup>
          <col style={{ width: `${PCT_DESC}%` }} />
          <col style={{ width: `${PCT_ORIGEN}%` }} />
          <col style={{ width: `${PCT_FLECHA}%` }} />
          <col style={{ width: `${PCT_DESTINO}%` }} />
          <col style={{ width: `${PCT_ACCIONES}%` }} />
        </colgroup>
        <TableHeader>
          <TableRow className="hover:bg-transparent">
            <TableHead className="min-w-0 align-middle">DESCRIPCIÓN</TableHead>
            <TableHead className="text-center align-middle">
              {origenLabel}
            </TableHead>
            <TableHead
              className="text-center align-middle"
              aria-label="Transferir hacia"
            />
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
                colSpan={5}
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
            const cantidadNum = Number(cantidad);
            const dup =
              tieneCantidad && Number.isFinite(cantidadNum)
                ? controlesPorClave.get(`${item.id}|${cantidadNum}`)
                : undefined;

            return (
              <TableRow key={item.id}>
                <TableCell className="celda-datos min-w-0 overflow-hidden">
                  {item.descripcion}
                </TableCell>
                <TableCell className="celda-datos text-center">
                  <div className="flex w-full items-center justify-center">
                    <Input
                      type="text"
                      inputMode="numeric"
                      value={cantidad}
                      onChange={(e) => handleCantidad(item.id, e.target.value)}
                      className="h-6 w-14 shrink-0 self-center text-center text-sm font-normal tabular-nums"
                      aria-label={`Cantidad a transferir desde ${origenLabel}`}
                      disabled={!destinoSeleccionado}
                    />
                  </div>
                </TableCell>
                <TableCell className="celda-datos text-center">
                  <div className="flex w-full items-center justify-center text-muted-foreground">
                    <span
                      className={cn(
                        "inline-flex size-4 shrink-0 items-center justify-center",
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
                <TableCell className="celda-datos text-center tabular-nums">
                  {!destinoSeleccionado || !tieneCantidad ? "—" : cantidad}
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
                    <Button
                      type="button"
                      variant="ghost"
                      size="icon"
                      className={TABLE_ROW_ICON_BUTTON_FILLED_BRAND_CLASS}
                      aria-label="Ver historial de transferencias"
                      title="Ver historial"
                      onClick={() =>
                        setHistorial({
                          codTienda: item.id,
                          descripcion: item.descripcion,
                        })
                      }
                    >
                      <Check
                        className={TABLE_ROW_ACTION_ICON_CLASS}
                        aria-hidden
                      />
                    </Button>
                    <span
                      className={cn(
                        ICON_WARNING_INTERACTIVE_CLASS,
                        !dup && "invisible"
                      )}
                      title={
                        dup
                          ? `Transferencia igual en los últimos ${TRANSF_DEPOSITOS_VENTANA_DUPLICADO_DIAS} días (${formatDdMmHhMmArgentina(new Date(dup.createdAtIso))})`
                          : undefined
                      }
                      aria-hidden={!dup}
                    >
                      <AlertTriangle
                        className={TABLE_ROW_ACTION_ICON_CLASS}
                        aria-hidden
                      />
                      {dup ? (
                        <span className="sr-only">Duplicado reciente</span>
                      ) : null}
                    </span>
                  </div>
                </TableCell>
              </TableRow>
            );
          })}
        </TableBody>
      </Table>

      {historial ? (
        <HistorialTransfDepositosModal
          open={historial !== null}
          onOpenChange={(open) => {
            if (!open) setHistorial(null);
          }}
          codTienda={historial.codTienda}
          descripcion={historial.descripcion}
        />
      ) : null}
    </>
  );
}
